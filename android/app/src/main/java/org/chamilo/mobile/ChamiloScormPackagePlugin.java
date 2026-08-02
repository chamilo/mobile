package org.chamilo.mobile;

import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "ChamiloScormPackage")
public class ChamiloScormPackagePlugin extends Plugin {
    private static final int MAX_ENTRIES = 20000;
    private static final long MAX_COMPRESSED_SIZE = 100L * 1024L * 1024L;
    private static final long MAX_UNCOMPRESSED_SIZE = 1024L * 1024L * 1024L;
    private static final int BUFFER_SIZE = 64 * 1024;


    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        call.resolve(result);
    }

    @PluginMethod
    public void resolve(PluginCall call) {
        try {
            File entry = resolveEntry(
                required(call, "scope"),
                required(call, "fingerprint"),
                required(call, "entryPath")
            );

            if (!entry.isFile()) {
                call.resolve(notFoundResult());
                return;
            }

            call.resolve(result(entry));
        } catch (Exception exception) {
            call.reject("The cached SCORM package could not be resolved.", exception);
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        String scope = call.getString("scope");
        String fingerprint = call.getString("fingerprint");
        String entryPath = call.getString("entryPath");
        String archiveBase64 = call.getString("archiveBase64");

        if (scope == null || fingerprint == null || entryPath == null || archiveBase64 == null) {
            call.reject("The SCORM package request is incomplete.");
            return;
        }

        File temporary = null;
        try {
            validateFingerprint(fingerprint);
            String normalizedEntryPath = normalizePath(entryPath);
            byte[] archive = Base64.decode(archiveBase64, Base64.DEFAULT);
            if (archive.length <= 0 || archive.length > MAX_COMPRESSED_SIZE) {
                call.reject("The SCORM package exceeds the supported size.");
                return;
            }

            File scopeRoot = scopeRoot(scope);
            File target = new File(scopeRoot, fingerprint);
            temporary = new File(scopeRoot, fingerprint + ".tmp");
            deleteRecursively(temporary);
            if (!temporary.mkdirs() && !temporary.isDirectory()) {
                throw new IOException("The SCORM package directory could not be created.");
            }

            extractArchive(archive, temporary);
            File entry = safeChild(temporary, normalizedEntryPath);
            if (!entry.isFile()) {
                throw new IOException("The SCORM launch file is missing from the package.");
            }

            deleteRecursively(target);
            if (!temporary.renameTo(target)) {
                throw new IOException("The SCORM package could not be activated.");
            }
            temporary = null;

            removeStalePackages(scopeRoot, target);
            File activeEntry = safeChild(target, normalizedEntryPath);
            call.resolve(result(activeEntry));
        } catch (Exception exception) {
            if (temporary != null) {
                deleteRecursively(temporary);
            }
            call.reject("The SCORM package could not be installed.", exception);
        }
    }

    @PluginMethod
    public void removeScope(PluginCall call) {
        try {
            deleteRecursively(scopeRoot(required(call, "scope")));
            call.resolve();
        } catch (Exception exception) {
            call.reject("The SCORM package cache could not be removed.", exception);
        }
    }

    private void extractArchive(byte[] archive, File destination) throws IOException {
        long totalUncompressed = 0;
        int entryCount = 0;
        byte[] buffer = new byte[BUFFER_SIZE];

        try (ZipInputStream input = new ZipInputStream(
            new BufferedInputStream(new ByteArrayInputStream(archive)),
            StandardCharsets.UTF_8
        )) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                entryCount++;
                if (entryCount > MAX_ENTRIES) {
                    throw new IOException("The SCORM package contains too many files.");
                }

                String normalized = normalizePath(entry.getName());
                File target = safeChild(destination, normalized);

                if (entry.isDirectory()) {
                    if (!target.mkdirs() && !target.isDirectory()) {
                        throw new IOException("A SCORM package directory could not be created.");
                    }
                    input.closeEntry();
                    continue;
                }

                File parent = target.getParentFile();
                if (parent == null || (!parent.mkdirs() && !parent.isDirectory())) {
                    throw new IOException("A SCORM package directory could not be created.");
                }

                try (BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(target))) {
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        totalUncompressed += read;
                        if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
                            throw new IOException("The SCORM package is too large after extraction.");
                        }
                        output.write(buffer, 0, read);
                    }
                }

                input.closeEntry();
            }
        }

        if (entryCount == 0) {
            throw new IOException("The SCORM package is empty.");
        }
    }

    private void removeStalePackages(File scopeRoot, File activePackage) {
        File[] children = scopeRoot.listFiles();
        if (children == null) {
            return;
        }

        for (File child : children) {
            if (!child.equals(activePackage)) {
                deleteRecursively(child);
            }
        }
    }

    private File resolveEntry(String scope, String fingerprint, String entryPath) throws Exception {
        validateFingerprint(fingerprint);
        return safeChild(new File(scopeRoot(scope), fingerprint), normalizePath(entryPath));
    }

    private File scopeRoot(String scope) throws Exception {
        File root = new File(getContext().getCacheDir(), "chamilo-scorm");
        File scopeDirectory = new File(root, sha256(scope));
        if (!scopeDirectory.mkdirs() && !scopeDirectory.isDirectory()) {
            throw new IOException("The SCORM cache directory could not be created.");
        }
        return scopeDirectory;
    }

    private String required(PluginCall call, String key) {
        String value = call.getString(key);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing " + key + ".");
        }
        return value;
    }

    private void validateFingerprint(String fingerprint) {
        if (!fingerprint.matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("The SCORM package fingerprint is invalid.");
        }
    }

    private String normalizePath(String value) {
        String path = value.replace('\\', '/').trim();
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (path.isEmpty() || path.indexOf('\0') >= 0 || path.matches("^[A-Za-z]:.*")) {
            throw new IllegalArgumentException("The SCORM package path is invalid.");
        }

        StringBuilder normalized = new StringBuilder();
        for (String segment : path.split("/")) {
            if (segment.isEmpty() || ".".equals(segment)) {
                continue;
            }
            if ("..".equals(segment)) {
                throw new IllegalArgumentException("The SCORM package path is unsafe.");
            }
            if (normalized.length() > 0) {
                normalized.append('/');
            }
            normalized.append(segment);
        }

        if (normalized.length() == 0) {
            throw new IllegalArgumentException("The SCORM package path is empty.");
        }

        return normalized.toString();
    }

    private File safeChild(File root, String relativePath) throws IOException {
        File rootCanonical = root.getCanonicalFile();
        File child = new File(rootCanonical, relativePath).getCanonicalFile();
        String rootPath = rootCanonical.getPath() + File.separator;
        if (!child.getPath().startsWith(rootPath)) {
            throw new IOException("The SCORM package path escapes its cache directory.");
        }
        return child;
    }

    private JSObject result(File entry) {
        JSObject result = new JSObject();
        result.put("found", true);
        result.put("entryUri", Uri.fromFile(entry).toString());
        return result;
    }

    private JSObject notFoundResult() {
        JSObject result = new JSObject();
        result.put("found", false);
        return result;
    }

    private String sha256(String value) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder output = new StringBuilder(hash.length * 2);
        for (byte item : hash) {
            output.append(String.format(Locale.ROOT, "%02x", item));
        }
        return output.toString();
    }

    private void deleteRecursively(File file) {
        if (file == null || !file.exists()) {
            return;
        }
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        // Cache cleanup is best effort. Installation verifies the destination afterwards.
        file.delete();
    }
}
