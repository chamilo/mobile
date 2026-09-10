import Capacitor
import Foundation
import QuickLook
import UIKit

private final class ChamiloPreviewItem: NSObject, QLPreviewItem {
    let previewItemURL: URL?
    let previewItemTitle: String?

    init(url: URL, title: String) {
        previewItemURL = url
        previewItemTitle = title
    }
}

@objc(ChamiloDocumentPlugin)
public class ChamiloDocumentPlugin: CAPPlugin, CAPBridgedPlugin,
    QLPreviewControllerDataSource, QLPreviewControllerDelegate, UIDocumentPickerDelegate
{
    public let identifier = "ChamiloDocumentPlugin"
    public let jsName = "ChamiloDocument"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
    ]

    private static let maxBase64Length = 96 * 1024 * 1024
    private static let maxFilenameLength = 160
    private static let defaultMimeType = "application/octet-stream"

    private var previewItem: ChamiloPreviewItem?
    private var previewFileURL: URL?
    private var pendingSaveCall: CAPPluginCall?
    private var pendingSaveFileURL: URL?

    @objc func open(_ call: CAPPluginCall) {
        guard let payload = documentPayload(call) else {
            return
        }

        do {
            let fileURL = try writeTemporaryFile(payload)
            let item = ChamiloPreviewItem(url: fileURL, title: payload.filename)

            DispatchQueue.main.async { [weak self] in
                guard let self else {
                    try? FileManager.default.removeItem(at: fileURL)
                    call.reject("Document opening failed.")
                    return
                }

                guard let viewController = self.presentingViewController() else {
                    try? FileManager.default.removeItem(at: fileURL)
                    call.reject("Document opening failed.")
                    return
                }

                if QLPreviewController.canPreview(item) {
                    self.previewItem = item
                    self.previewFileURL = fileURL

                    let previewController = QLPreviewController()
                    previewController.dataSource = self
                    previewController.delegate = self

                    viewController.present(previewController, animated: true) {
                        call.resolve()
                    }

                    return
                }

                let activityController = UIActivityViewController(
                    activityItems: [fileURL],
                    applicationActivities: nil
                )

                if let popover = activityController.popoverPresentationController {
                    popover.sourceView = viewController.view
                    popover.sourceRect = CGRect(
                        x: viewController.view.bounds.midX,
                        y: viewController.view.bounds.midY,
                        width: 1,
                        height: 1
                    )
                }

                activityController.completionWithItemsHandler = { _, _, _, _ in
                    try? FileManager.default.removeItem(at: fileURL)
                }

                viewController.present(activityController, animated: true) {
                    call.resolve()
                }
            }
        } catch {
            call.reject("Document opening failed.")
        }
    }

    @objc func save(_ call: CAPPluginCall) {
        guard pendingSaveCall == nil else {
            call.reject("Another document save operation is already active.")
            return
        }

        guard let payload = documentPayload(call) else {
            return
        }

        do {
            let fileURL = try writeTemporaryFile(payload)
            pendingSaveCall = call
            pendingSaveFileURL = fileURL

            DispatchQueue.main.async { [weak self] in
                guard let self else {
                    try? FileManager.default.removeItem(at: fileURL)
                    call.reject("Document saving failed.")
                    return
                }

                guard let viewController = self.presentingViewController() else {
                    self.finishSave(saved: false, rejectionMessage: "Document saving failed.")
                    return
                }

                _ = payload.mimeType

                let picker = UIDocumentPickerViewController(
                    forExporting: [fileURL],
                    asCopy: true
                )
                picker.delegate = self
                picker.allowsMultipleSelection = false
                picker.shouldShowFileExtensions = true

                viewController.present(picker, animated: true)
            }
        } catch {
            call.reject("Document saving failed.")
        }
    }

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewItem == nil ? 0 : 1
    }

    public func previewController(
        _ controller: QLPreviewController,
        previewItemAt index: Int
    ) -> QLPreviewItem {
        guard index == 0, let previewItem else {
            preconditionFailure("Unexpected Quick Look preview item index.")
        }

        return previewItem
    }

    public func previewControllerDidDismiss(_ controller: QLPreviewController) {
        cleanupPreviewFile()
    }

    public func documentPicker(
        _ controller: UIDocumentPickerViewController,
        didPickDocumentsAt urls: [URL]
    ) {
        finishSave(saved: !urls.isEmpty)
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finishSave(saved: false)
    }

    private func documentPayload(_ call: CAPPluginCall) -> DocumentPayload? {
        guard
            let base64 = call.getString("base64"),
            !base64.isEmpty,
            base64.utf8.count <= Self.maxBase64Length,
            let data = Data(base64Encoded: base64)
        else {
            call.reject("Document content is invalid.")
            return nil
        }

        return DocumentPayload(
            data: data,
            filename: safeFilename(call.getString("filename")),
            mimeType: safeMimeType(call.getString("mimeType"))
        )
    }

    private func writeTemporaryFile(_ payload: DocumentPayload) throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("chamilo-documents", isDirectory: true)

        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )

        let fileURL = directory.appendingPathComponent(
            "\(UUID().uuidString)-\(payload.filename)",
            isDirectory: false
        )

        try payload.data.write(to: fileURL, options: .atomic)

        return fileURL
    }

    private func safeFilename(_ value: String?) -> String {
        var filename = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        if filename.isEmpty {
            filename = "document"
        }

        let invalidCharacters = CharacterSet(charactersIn: "\\/:*?\"<>|")
            .union(.controlCharacters)

        filename = filename
            .components(separatedBy: invalidCharacters)
            .joined(separator: "_")
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        if filename.count > Self.maxFilenameLength {
            filename = String(filename.prefix(Self.maxFilenameLength))
        }

        return filename.isEmpty ? "document" : filename
    }

    private func safeMimeType(_ value: String?) -> String {
        let mimeType = value?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? ""

        guard
            let separator = mimeType.firstIndex(of: "/"),
            separator != mimeType.startIndex,
            separator != mimeType.index(before: mimeType.endIndex),
            mimeType.range(
                of: #"^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+$"#,
                options: .regularExpression
            ) != nil
        else {
            return Self.defaultMimeType
        }

        return mimeType
    }

    private func presentingViewController() -> UIViewController? {
        var controller = bridge?.viewController

        while let presented = controller?.presentedViewController {
            controller = presented
        }

        return controller
    }

    private func cleanupPreviewFile() {
        if let previewFileURL {
            try? FileManager.default.removeItem(at: previewFileURL)
        }

        previewFileURL = nil
        previewItem = nil
    }

    private func finishSave(saved: Bool, rejectionMessage: String? = nil) {
        guard let call = pendingSaveCall else {
            cleanupSaveFile()
            return
        }

        if let rejectionMessage {
            call.reject(rejectionMessage)
        } else {
            call.resolve(["saved": saved])
        }

        pendingSaveCall = nil
        cleanupSaveFile()
    }

    private func cleanupSaveFile() {
        if let pendingSaveFileURL {
            try? FileManager.default.removeItem(at: pendingSaveFileURL)
        }

        pendingSaveFileURL = nil
    }

    private struct DocumentPayload {
        let data: Data
        let filename: String
        let mimeType: String
    }
}
