import Capacitor
import CryptoKit
import Foundation
import ZIPFoundation

@objc(ChamiloScormPackagePlugin)
public final class ChamiloScormPackagePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ChamiloScormPackagePlugin"
    public let jsName = "ChamiloScormPackage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resolve", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "install", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeScope", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeCampus", returnType: CAPPluginReturnPromise),
    ]

    private static let maxEntries = 20_000
    private static let maxCompressedSize = 100 * 1024 * 1024
    private static let maxUncompressedSize: UInt64 = 1024 * 1024 * 1024
    private static let fingerprintPattern = #"^[a-f0-9]{64}$"#
    private static let storageDirectoryName = "chamilo-scorm-offline"

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc func resolve(_ call: CAPPluginCall) {
        do {
            let scope = try required(call, "scope")
            let fingerprint = try required(call, "fingerprint")
            let entryPath = try required(call, "entryPath")

            try validateFingerprint(fingerprint)

            let target = try scopeRoot(scope: scope)
                .appendingPathComponent(fingerprint, isDirectory: true)

            do {
                let entry = try ScormPackageFileResolver.resolveLaunchFile(
                    root: target,
                    requestedPath: entryPath
                )
                call.resolve(result(entry))
            } catch ScormPackageFileResolverError.launchFileMissing {
                call.resolve(notFoundResult())
            }
        } catch {
            call.reject("The cached SCORM package could not be resolved.")
        }
    }

    @objc func install(_ call: CAPPluginCall) {
        var temporaryDirectory: URL?
        var temporaryArchive: URL?

        do {
            let scope = try required(call, "scope")
            let fingerprint = try required(call, "fingerprint")
            let entryPath = try required(call, "entryPath")
            let archiveBase64 = try required(call, "archiveBase64")

            try validateFingerprint(fingerprint)
            let normalizedEntryPath = try ScormPackageFileResolver.normalizeLaunchPath(entryPath)

            guard
                let archiveData = Data(base64Encoded: archiveBase64),
                !archiveData.isEmpty,
                archiveData.count <= Self.maxCompressedSize
            else {
                call.reject("The SCORM package exceeds the supported size.")
                return
            }

            let scopeDirectory = try scopeRoot(scope: scope)
            let target = scopeDirectory.appendingPathComponent(fingerprint, isDirectory: true)
            let workId = UUID().uuidString
            let zipURL = scopeDirectory.appendingPathComponent("\(fingerprint).\(workId).zip")
            let extractURL = scopeDirectory.appendingPathComponent(
                "\(fingerprint).\(workId).tmp",
                isDirectory: true
            )

            temporaryArchive = zipURL
            temporaryDirectory = extractURL

            try archiveData.write(to: zipURL, options: .atomic)
            try preflightArchive(at: zipURL)

            try FileManager.default.createDirectory(
                at: extractURL,
                withIntermediateDirectories: true
            )

            try FileManager.default.unzipItem(
                at: zipURL,
                to: extractURL,
                skipCRC32: false,
                allowUncontainedSymlinks: false
            )

            try validateExtractedTree(at: extractURL)

            _ = try ScormPackageFileResolver.resolveLaunchFile(
                root: extractURL,
                requestedPath: normalizedEntryPath
            )

            try removeIfPresent(target)
            try FileManager.default.moveItem(at: extractURL, to: target)
            temporaryDirectory = nil

            try removeStalePackages(in: scopeDirectory, keeping: target)

            let activeEntry = try ScormPackageFileResolver.resolveLaunchFile(
                root: target,
                requestedPath: normalizedEntryPath
            )

            try? FileManager.default.removeItem(at: zipURL)
            temporaryArchive = nil

            call.resolve(result(activeEntry))
        } catch {
            if let temporaryDirectory {
                try? FileManager.default.removeItem(at: temporaryDirectory)
            }
            if let temporaryArchive {
                try? FileManager.default.removeItem(at: temporaryArchive)
            }

            call.reject("The SCORM package could not be installed.")
        }
    }

    @objc func removeScope(_ call: CAPPluginCall) {
        do {
            let scope = try required(call, "scope")
            try removeIfPresent(scopeRoot(scope: scope))
            call.resolve()
        } catch {
            call.reject("The SCORM package cache could not be removed.")
        }
    }

    @objc func removeCampus(_ call: CAPPluginCall) {
        do {
            let campusId = try required(call, "campusId")
            try removeIfPresent(campusRoot(campusId: campusId))
            call.resolve()
        } catch {
            call.reject("The offline SCORM packages for this campus could not be removed.")
        }
    }

    private func preflightArchive(at archiveURL: URL) throws {
        let archive = try Archive(url: archiveURL, accessMode: .read)

        var entryCount = 0
        var totalUncompressed: UInt64 = 0
        var filePaths = Set<String>()

        for entry in archive {
            entryCount += 1

            guard entryCount <= Self.maxEntries else {
                throw ScormPackageError.tooManyEntries
            }

            let normalized = try ScormPackageFileResolver.normalizeArchiveEntry(entry.path)

            if normalized.isEmpty {
                guard entry.type == .directory else {
                    throw ScormPackageError.invalidArchiveEntry
                }
                continue
            }

            if entry.type == .symlink {
                throw ScormPackageError.symbolicLink
            }

            if entry.type == .file {
                guard filePaths.insert(normalized).inserted else {
                    throw ScormPackageError.duplicatePath
                }

                guard entry.uncompressedSize <= Self.maxUncompressedSize - totalUncompressed else {
                    throw ScormPackageError.extractedSizeExceeded
                }

                totalUncompressed += entry.uncompressedSize
            }
        }

        guard entryCount > 0 else {
            throw ScormPackageError.emptyArchive
        }
    }

    private func validateExtractedTree(at root: URL) throws {
        let fileManager = FileManager.default
        let rootURL = root.standardizedFileURL.resolvingSymlinksInPath()
        let rootPath = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"
        let keys: Set<URLResourceKey> = [
            .fileSizeKey,
            .isDirectoryKey,
            .isRegularFileKey,
            .isSymbolicLinkKey,
        ]

        guard let enumerator = fileManager.enumerator(
            at: rootURL,
            includingPropertiesForKeys: Array(keys),
            options: [],
            errorHandler: { _, _ in false }
        ) else {
            throw ScormPackageError.invalidExtractedTree
        }

        var entryCount = 0
        var totalSize: UInt64 = 0

        for case let item as URL in enumerator {
            entryCount += 1

            guard entryCount <= Self.maxEntries else {
                throw ScormPackageError.tooManyEntries
            }

            let values = try item.resourceValues(forKeys: keys)

            if values.isSymbolicLink == true {
                throw ScormPackageError.symbolicLink
            }

            let canonical = item.standardizedFileURL.resolvingSymlinksInPath()

            guard canonical.path.hasPrefix(rootPath) else {
                throw ScormPackageError.escapedCacheDirectory
            }

            if values.isDirectory == true {
                continue
            }

            guard values.isRegularFile == true else {
                throw ScormPackageError.invalidExtractedTree
            }

            let fileSize = UInt64(max(0, values.fileSize ?? 0))

            guard fileSize <= Self.maxUncompressedSize - totalSize else {
                throw ScormPackageError.extractedSizeExceeded
            }

            totalSize += fileSize
        }
    }

    private func required(_ call: CAPPluginCall, _ key: String) throws -> String {
        guard
            let value = call.getString(key),
            !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            throw ScormPackageError.missingArgument
        }

        return value
    }

    private func validateFingerprint(_ fingerprint: String) throws {
        guard fingerprint.range(
            of: Self.fingerprintPattern,
            options: .regularExpression
        ) != nil else {
            throw ScormPackageError.invalidFingerprint
        }
    }

    private func scopeRoot(scope: String) throws -> URL {
        let campusId = try campusIdFromScope(scope)
        let directory = try campusRoot(campusId: campusId)
            .appendingPathComponent(sha256(scope), isDirectory: true)

        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )

        return directory
    }

    private func campusRoot(campusId: String) throws -> URL {
        guard
            let applicationSupport = FileManager.default.urls(
                for: .applicationSupportDirectory,
                in: .userDomainMask
            ).first
        else {
            throw ScormPackageError.storageUnavailable
        }

        let storageRoot = applicationSupport
            .appendingPathComponent(Self.storageDirectoryName, isDirectory: true)

        try FileManager.default.createDirectory(
            at: storageRoot,
            withIntermediateDirectories: true
        )

        var backupExcludedRoot = storageRoot
        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        try backupExcludedRoot.setResourceValues(resourceValues)

        return storageRoot.appendingPathComponent(sha256(campusId), isDirectory: true)
    }

    private func campusIdFromScope(_ scope: String) throws -> String {
        let campusId = scope.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
            .first
            .map(String.init) ?? ""

        guard !campusId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ScormPackageError.invalidScope
        }

        return campusId
    }

    private func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }

    private func result(_ entry: URL) -> [String: Any] {
        [
            "found": true,
            "entryUri": entry.absoluteString,
        ]
    }

    private func notFoundResult() -> [String: Any] {
        ["found": false]
    }

    private func removeStalePackages(in scopeDirectory: URL, keeping activePackage: URL) throws {
        let children = try FileManager.default.contentsOfDirectory(
            at: scopeDirectory,
            includingPropertiesForKeys: nil
        )

        for child in children where child.standardizedFileURL != activePackage.standardizedFileURL {
            try? FileManager.default.removeItem(at: child)
        }
    }

    private func removeIfPresent(_ url: URL) throws {
        if FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
    }

    private enum ScormPackageError: Error {
        case missingArgument
        case invalidFingerprint
        case invalidScope
        case storageUnavailable
        case emptyArchive
        case invalidArchiveEntry
        case tooManyEntries
        case duplicatePath
        case symbolicLink
        case extractedSizeExceeded
        case escapedCacheDirectory
        case invalidExtractedTree
    }
}
