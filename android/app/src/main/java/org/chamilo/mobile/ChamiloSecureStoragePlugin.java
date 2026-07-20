package org.chamilo.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.security.GeneralSecurityException;
import org.json.JSONObject;

@CapacitorPlugin(name = "ChamiloSecureStorage")
public class ChamiloSecureStoragePlugin extends Plugin {

    private static final int MAX_KEY_LENGTH = 512;
    private static final int MAX_VALUE_LENGTH = 64 * 1024;

    private SecureStorageVault vault;

    @PluginMethod
    public void get(PluginCall call) {
        String key = validKey(call);

        if (key == null) {
            return;
        }

        try {
            String value = vault().read(key);
            JSObject result = new JSObject();
            result.put("value", value == null ? JSONObject.NULL : value);
            call.resolve(result);
        } catch (IOException | GeneralSecurityException error) {
            call.reject("Secure storage read failed.");
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = validKey(call);
        String value = call.getString("value");

        if (key == null) {
            return;
        }

        if (value == null || value.length() > MAX_VALUE_LENGTH) {
            call.reject("Secure storage value is invalid.");
            return;
        }

        try {
            vault().write(key, value);
            call.resolve();
        } catch (IOException | GeneralSecurityException error) {
            call.reject("Secure storage write failed.");
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = validKey(call);

        if (key == null) {
            return;
        }

        try {
            vault().remove(key);
            call.resolve();
        } catch (IOException error) {
            call.reject("Secure storage removal failed.");
        }
    }

    private String validKey(PluginCall call) {
        String key = call.getString("key");

        if (key == null || key.trim().isEmpty() || key.length() > MAX_KEY_LENGTH) {
            call.reject("Secure storage key is invalid.");
            return null;
        }

        return key;
    }

    private SecureStorageVault vault() {
        if (vault == null) {
            vault = new SecureStorageVault(getContext());
        }

        return vault;
    }
}
