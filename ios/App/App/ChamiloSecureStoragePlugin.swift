import Capacitor
import Foundation
import Security

private enum ChamiloKeychainError: Error {
    case unexpectedStatus(OSStatus)
    case invalidStoredValue
}

private final class ChamiloKeychainStore {
    private let service = "org.chamilo.mobile.secure-storage.v1"

    func read(key: String) throws -> String? {
        var query = baseQuery(key: key)
        query[kSecReturnData] = true
        query[kSecMatchLimit] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess else {
            throw ChamiloKeychainError.unexpectedStatus(status)
        }

        guard
            let data = item as? Data,
            let value = String(data: data, encoding: .utf8)
        else {
            try? remove(key: key)
            throw ChamiloKeychainError.invalidStoredValue
        }

        return value
    }

    func write(key: String, value: String) throws {
        let valueData = Data(value.utf8)
        let query = baseQuery(key: key)
        let updateAttributes: [CFString: Any] = [
            kSecValueData: valueData
        ]

        let updateStatus = SecItemUpdate(
            query as CFDictionary,
            updateAttributes as CFDictionary
        )

        if updateStatus == errSecSuccess {
            return
        }

        guard updateStatus == errSecItemNotFound else {
            throw ChamiloKeychainError.unexpectedStatus(updateStatus)
        }

        var newItem = query
        newItem[kSecValueData] = valueData
        newItem[kSecAttrAccessible] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly

        let addStatus = SecItemAdd(newItem as CFDictionary, nil)

        guard addStatus == errSecSuccess else {
            throw ChamiloKeychainError.unexpectedStatus(addStatus)
        }
    }

    func remove(key: String) throws {
        let status = SecItemDelete(baseQuery(key: key) as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw ChamiloKeychainError.unexpectedStatus(status)
        }
    }

    private func baseQuery(key: String) -> [CFString: Any] {
        [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key
        ]
    }
}

@objc(ChamiloSecureStoragePlugin)
public class ChamiloSecureStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ChamiloSecureStoragePlugin"
    public let jsName = "ChamiloSecureStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise)
    ]

    private static let maxKeyLength = 512
    private static let maxValueLength = 64 * 1024
    private let store = ChamiloKeychainStore()

    @objc func get(_ call: CAPPluginCall) {
        guard let key = validKey(call) else {
            return
        }

        do {
            let value = try store.read(key: key)

            if let value {
                call.resolve(["value": value])
            } else {
                call.resolve(["value": NSNull()])
            }
        } catch {
            call.reject("Secure storage read failed.")
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = validKey(call) else {
            return
        }

        guard
            let value = call.getString("value"),
            value.utf16.count <= Self.maxValueLength
        else {
            call.reject("Secure storage value is invalid.")
            return
        }

        do {
            try store.write(key: key, value: value)
            call.resolve()
        } catch {
            call.reject("Secure storage write failed.")
        }
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = validKey(call) else {
            return
        }

        do {
            try store.remove(key: key)
            call.resolve()
        } catch {
            call.reject("Secure storage removal failed.")
        }
    }

    private func validKey(_ call: CAPPluginCall) -> String? {
        guard
            let key = call.getString("key"),
            !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            key.utf16.count <= Self.maxKeyLength
        else {
            call.reject("Secure storage key is invalid.")
            return nil
        }

        return key
    }
}
