import Foundation

enum ScormPackageFileResolverError: Error {
    case invalidPath
    case unsafePath
    case escapedCacheDirectory
    case launchFileMissing
    case ambiguousLaunchPath
    case symbolicLink
}

struct ScormPackageFileResolver {
    static func normalizeLaunchPath(_ value: String?) throws -> String {
        let normalized = try normalizePath(value, allowEmpty: false)

        guard !normalized.isEmpty else {
            throw ScormPackageFileResolverError.invalidPath
        }

        return normalized
    }

    static func normalizeArchiveEntry(_ value: String?) throws -> String {
        try normalizePath(value, allowEmpty: true)
    }

    static func safeChild(root: URL, relativePath: String) throws -> URL {
        let rootURL = root.standardizedFileURL.resolvingSymlinksInPath()
        let childURL = rootURL
            .appendingPathComponent(relativePath, isDirectory: false)
            .standardizedFileURL
            .resolvingSymlinksInPath()

        let rootPath = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"

        guard childURL.path.hasPrefix(rootPath) else {
            throw ScormPackageFileResolverError.escapedCacheDirectory
        }

        return childURL
    }

    static func resolveLaunchFile(root: URL, requestedPath: String) throws -> URL {
        let fileManager = FileManager.default
        let normalizedRequest = try normalizeLaunchPath(requestedPath)
        let exact = try safeChild(root: root, relativePath: normalizedRequest)

        if try isRegularNonSymlinkFile(exact) {
            return exact
        }

        let rootURL = root.standardizedFileURL.resolvingSymlinksInPath()
        let rootPath = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"
        let keys: Set<URLResourceKey> = [
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
            throw ScormPackageFileResolverError.launchFileMissing
        }

        var match: URL?

        for case let candidate as URL in enumerator {
            let canonical = candidate.standardizedFileURL.resolvingSymlinksInPath()

            guard canonical.path.hasPrefix(rootPath) else {
                throw ScormPackageFileResolverError.escapedCacheDirectory
            }

            let values = try candidate.resourceValues(forKeys: keys)

            if values.isSymbolicLink == true {
                throw ScormPackageFileResolverError.symbolicLink
            }

            if values.isDirectory == true || values.isRegularFile != true {
                continue
            }

            let relative = String(canonical.path.dropFirst(rootPath.count))
                .replacingOccurrences(of: "\\", with: "/")

            guard isUniqueSuffixMatch(requestedPath: normalizedRequest, candidatePath: relative) else {
                continue
            }

            if let match, match != canonical {
                throw ScormPackageFileResolverError.ambiguousLaunchPath
            }

            match = canonical
        }

        guard let match else {
            throw ScormPackageFileResolverError.launchFileMissing
        }

        return match
    }

    private static func normalizePath(_ value: String?, allowEmpty: Bool) throws -> String {
        guard let value else {
            throw ScormPackageFileResolverError.invalidPath
        }

        var path = value
            .replacingOccurrences(of: "\\", with: "/")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        while path.hasPrefix("/") {
            path.removeFirst()
        }

        if path.unicodeScalars.contains(where: { $0.value == 0 }) || hasWindowsDrivePrefix(path) {
            throw ScormPackageFileResolverError.invalidPath
        }

        var segments: [String] = []

        for rawSegment in path.split(separator: "/", omittingEmptySubsequences: false) {
            let segment = String(rawSegment)

            if segment.isEmpty || segment == "." {
                continue
            }

            if segment == ".." {
                throw ScormPackageFileResolverError.unsafePath
            }

            segments.append(segment)
        }

        let normalized = segments.joined(separator: "/")

        if !allowEmpty && normalized.isEmpty {
            throw ScormPackageFileResolverError.invalidPath
        }

        return normalized
    }

    private static func hasWindowsDrivePrefix(_ path: String) -> Bool {
        let scalars = Array(path.unicodeScalars)

        guard scalars.count >= 2, scalars[1].value == 58 else {
            return false
        }

        return CharacterSet.letters.contains(scalars[0])
    }

    private static func isRegularNonSymlinkFile(_ url: URL) throws -> Bool {
        let values = try? url.resourceValues(forKeys: [
            .isRegularFileKey,
            .isSymbolicLinkKey,
        ])

        guard let values else {
            return false
        }

        if values.isSymbolicLink == true {
            throw ScormPackageFileResolverError.symbolicLink
        }

        return values.isRegularFile == true
    }

    private static func isUniqueSuffixMatch(
        requestedPath: String,
        candidatePath: String
    ) -> Bool {
        requestedPath == candidatePath
            || requestedPath.hasSuffix("/" + candidatePath)
            || candidatePath.hasSuffix("/" + requestedPath)
    }
}
