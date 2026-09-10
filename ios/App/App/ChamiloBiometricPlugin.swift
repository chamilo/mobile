import Capacitor
import Foundation
import LocalAuthentication

@objc(ChamiloBiometricPlugin)
public class ChamiloBiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ChamiloBiometricPlugin"
    public let jsName = "ChamiloBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private static let maxPromptTextLength = 200
    private let policy = LAPolicy.deviceOwnerAuthenticationWithBiometrics

    @objc func status(_ call: CAPPluginCall) {
        let context = LAContext()
        var evaluationError: NSError?

        if context.canEvaluatePolicy(policy, error: &evaluationError) {
            call.resolve(["status": "available"])
            return
        }

        call.resolve(["status": availabilityStatus(for: evaluationError)])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        guard
            validPromptText(call, key: "title") != nil,
            let subtitle = validPromptText(call, key: "subtitle"),
            let cancelLabel = validPromptText(call, key: "cancelLabel")
        else {
            return
        }

        let context = LAContext()
        context.localizedCancelTitle = cancelLabel
        context.localizedFallbackTitle = ""

        var evaluationError: NSError?

        guard context.canEvaluatePolicy(policy, error: &evaluationError) else {
            resolveAuthentication(call, status: "unavailable")
            return
        }

        context.evaluatePolicy(policy, localizedReason: subtitle) { [weak self] success, error in
            guard let self else {
                call.resolve(["status": "error"])
                return
            }

            if success {
                self.resolveAuthentication(call, status: "success")
                return
            }

            self.resolveAuthentication(call, status: self.authenticationStatus(for: error))
        }
    }

    private func validPromptText(_ call: CAPPluginCall, key: String) -> String? {
        guard
            let rawValue = call.getString(key),
            !rawValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            rawValue.utf16.count <= Self.maxPromptTextLength
        else {
            call.reject("Biometric prompt text is invalid.")
            return nil
        }

        return rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func availabilityStatus(for error: NSError?) -> String {
        guard let code = localAuthenticationErrorCode(error) else {
            return "unavailable"
        }

        switch code {
        case .biometryNotEnrolled:
            return "not_enrolled"
        case .biometryLockout:
            return "temporary_unavailable"
        case .biometryNotAvailable, .passcodeNotSet:
            return "unavailable"
        default:
            return "unavailable"
        }
    }

    private func authenticationStatus(for error: Error?) -> String {
        guard let code = localAuthenticationErrorCode(error as NSError?) else {
            return "error"
        }

        switch code {
        case .userCancel, .systemCancel, .appCancel, .userFallback:
            return "cancelled"
        case .biometryNotAvailable, .biometryNotEnrolled, .biometryLockout, .passcodeNotSet, .notInteractive:
            return "unavailable"
        default:
            return "error"
        }
    }

    private func localAuthenticationErrorCode(_ error: NSError?) -> LAError.Code? {
        guard let error, error.domain == LAError.errorDomain else {
            return nil
        }

        return LAError.Code(rawValue: error.code)
    }

    private func resolveAuthentication(_ call: CAPPluginCall, status: String) {
        call.resolve(["status": status])
    }
}
