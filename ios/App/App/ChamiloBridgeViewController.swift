import Capacitor

@objc(ChamiloBridgeViewController)
final class ChamiloBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ChamiloSecureStoragePlugin())
        bridge?.registerPluginInstance(ChamiloBiometricPlugin())
        bridge?.registerPluginInstance(ChamiloDocumentPlugin())
        bridge?.registerPluginInstance(ChamiloScormPackagePlugin())
    }
}
