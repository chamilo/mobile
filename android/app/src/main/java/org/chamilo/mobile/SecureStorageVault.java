package org.chamilo.mobile;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Key;
import java.security.KeyStore;
import java.security.MessageDigest;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONException;
import org.json.JSONObject;

final class SecureStorageVault {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "org.chamilo.mobile.secure-storage.aes-gcm.v1";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int KEY_SIZE_BITS = 256;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int FORMAT_VERSION = 1;
    private static final int MAX_ENTRY_SIZE_BYTES = 128 * 1024;

    private final File storageDirectory;

    SecureStorageVault(Context context) {
        storageDirectory = new File(context.getNoBackupFilesDir(), "secure-token-storage-v1");
    }

    synchronized String read(String logicalKey) throws IOException, GeneralSecurityException {
        AtomicFile atomicFile = atomicFile(logicalKey);

        if (!atomicFile.getBaseFile().isFile()) {
            return null;
        }

        try {
            byte[] payloadBytes = readBytes(atomicFile);
            JSONObject payload = new JSONObject(new String(payloadBytes, StandardCharsets.UTF_8));

            if (payload.optInt("version", 0) != FORMAT_VERSION) {
                throw new JSONException("Unsupported secure storage format.");
            }

            byte[] iv = Base64.decode(payload.getString("iv"), Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(payload.getString("ciphertext"), Base64.NO_WRAP);

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(
                Cipher.DECRYPT_MODE,
                getOrCreateSecretKey(),
                new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
            );
            cipher.updateAAD(logicalKey.getBytes(StandardCharsets.UTF_8));

            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (JSONException | IllegalArgumentException | GeneralSecurityException error) {
            atomicFile.delete();
            return null;
        }
    }

    synchronized void write(String logicalKey, String value)
        throws IOException, GeneralSecurityException {
        ensureStorageDirectory();

        Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey());
        cipher.updateAAD(logicalKey.getBytes(StandardCharsets.UTF_8));

        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

        JSONObject payload = new JSONObject();
        try {
            payload.put("version", FORMAT_VERSION);
            payload.put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
            payload.put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP));
        } catch (JSONException error) {
            throw new IOException("Could not serialize secure storage entry.", error);
        }

        byte[] payloadBytes = payload.toString().getBytes(StandardCharsets.UTF_8);

        if (payloadBytes.length > MAX_ENTRY_SIZE_BYTES) {
            throw new IOException("Secure storage entry is too large.");
        }

        AtomicFile atomicFile = atomicFile(logicalKey);
        FileOutputStream output = null;

        try {
            output = atomicFile.startWrite();
            output.write(payloadBytes);
            output.flush();
            atomicFile.finishWrite(output);
        } catch (IOException error) {
            if (output != null) {
                atomicFile.failWrite(output);
            }

            throw error;
        }
    }

    synchronized void remove(String logicalKey) throws IOException {
        atomicFile(logicalKey).delete();
    }

    private AtomicFile atomicFile(String logicalKey) throws IOException {
        ensureStorageDirectory();

        return new AtomicFile(new File(storageDirectory, sha256(logicalKey) + ".json"));
    }

    private void ensureStorageDirectory() throws IOException {
        if (storageDirectory.isDirectory()) {
            return;
        }

        if (!storageDirectory.mkdirs() && !storageDirectory.isDirectory()) {
            throw new IOException("Could not create secure storage directory.");
        }
    }

    private SecretKey getOrCreateSecretKey() throws GeneralSecurityException, IOException {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        Key existingKey = keyStore.getKey(KEY_ALIAS, null);

        if (existingKey instanceof SecretKey) {
            return (SecretKey) existingKey;
        }

        if (existingKey != null) {
            throw new GeneralSecurityException("Secure storage key has an invalid type.");
        }

        KeyGenerator generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        );
        generator.init(
            new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(KEY_SIZE_BITS)
                .setRandomizedEncryptionRequired(true)
                .build()
        );

        return generator.generateKey();
    }

    private static byte[] readBytes(AtomicFile atomicFile) throws IOException {
        File baseFile = atomicFile.getBaseFile();
        long fileLength = baseFile.length();

        if (fileLength < 0 || fileLength > MAX_ENTRY_SIZE_BYTES) {
            throw new IOException("Secure storage entry has an invalid size.");
        }

        try (
            FileInputStream input = atomicFile.openRead();
            ByteArrayOutputStream output = new ByteArrayOutputStream((int) fileLength)
        ) {
            byte[] buffer = new byte[4096];
            int read;

            while ((read = input.read(buffer)) != -1) {
                if (output.size() + read > MAX_ENTRY_SIZE_BYTES) {
                    throw new IOException("Secure storage entry is too large.");
                }

                output.write(buffer, 0, read);
            }

            return output.toByteArray();
        }
    }

    private static String sha256(String value) throws IOException {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(digest.length * 2);

            for (byte item : digest) {
                int unsigned = item & 0xff;
                result.append(Character.forDigit(unsigned >>> 4, 16));
                result.append(Character.forDigit(unsigned & 0x0f, 16));
            }

            return result.toString();
        } catch (GeneralSecurityException error) {
            throw new IOException("Could not derive secure storage entry name.", error);
        }
    }
}
