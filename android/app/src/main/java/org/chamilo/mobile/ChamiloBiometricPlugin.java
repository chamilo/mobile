package org.chamilo.mobile;

import android.app.Activity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "ChamiloBiometric")
public class ChamiloBiometricPlugin extends Plugin {

    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG;
    private static final int MAX_PROMPT_TEXT_LENGTH = 200;

    @PluginMethod
    public void status(PluginCall call) {
        int status = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        JSObject result = new JSObject();
        result.put("status", availabilityStatus(status));
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String title = validPromptText(call, "title");
        String subtitle = validPromptText(call, "subtitle");
        String cancelLabel = validPromptText(call, "cancelLabel");

        if (title == null || subtitle == null || cancelLabel == null) {
            return;
        }

        int availability = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);

        if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
            resolveAuthentication(call, "unavailable");
            return;
        }

        Activity activity = getActivity();

        if (!(activity instanceof FragmentActivity)) {
            call.reject("Biometric authentication requires a FragmentActivity.");
            return;
        }

        FragmentActivity fragmentActivity = (FragmentActivity) activity;
        fragmentActivity.runOnUiThread(() -> {
            Executor executor = ContextCompat.getMainExecutor(getContext());
            BiometricPrompt prompt = new BiometricPrompt(
                fragmentActivity,
                executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(
                        BiometricPrompt.AuthenticationResult authenticationResult
                    ) {
                        super.onAuthenticationSucceeded(authenticationResult);
                        resolveAuthentication(call, "success");
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errorMessage) {
                        super.onAuthenticationError(errorCode, errorMessage);

                        if (
                            errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                            errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                            errorCode == BiometricPrompt.ERROR_CANCELED
                        ) {
                            resolveAuthentication(call, "cancelled");
                            return;
                        }

                        if (
                            errorCode == BiometricPrompt.ERROR_HW_UNAVAILABLE ||
                            errorCode == BiometricPrompt.ERROR_HW_NOT_PRESENT ||
                            errorCode == BiometricPrompt.ERROR_NO_BIOMETRICS ||
                            errorCode == BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED ||
                            errorCode == BiometricPrompt.ERROR_LOCKOUT ||
                            errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT
                        ) {
                            resolveAuthentication(call, "unavailable");
                            return;
                        }

                        resolveAuthentication(call, "error");
                    }
                }
            );

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(AUTHENTICATORS)
                .setNegativeButtonText(cancelLabel)
                .build();

            prompt.authenticate(promptInfo);
        });
    }

    private String validPromptText(PluginCall call, String key) {
        String value = call.getString(key);

        if (value == null || value.trim().isEmpty() || value.length() > MAX_PROMPT_TEXT_LENGTH) {
            call.reject("Biometric prompt text is invalid.");
            return null;
        }

        return value.trim();
    }

    private String availabilityStatus(int status) {
        if (status == BiometricManager.BIOMETRIC_SUCCESS) {
            return "available";
        }

        if (status == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
            return "not_enrolled";
        }

        if (
            status == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ||
            status == BiometricManager.BIOMETRIC_STATUS_UNKNOWN
        ) {
            return "temporary_unavailable";
        }

        return "unavailable";
    }

    private void resolveAuthentication(PluginCall call, String status) {
        JSObject result = new JSObject();
        result.put("status", status);
        call.resolve(result);
    }
}
