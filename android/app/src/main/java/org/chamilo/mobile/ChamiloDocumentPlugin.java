package org.chamilo.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "ChamiloDocument")
public class ChamiloDocumentPlugin extends Plugin {

    private static final int MAX_BASE64_LENGTH = 96 * 1024 * 1024;
    private static final int MAX_FILENAME_LENGTH = 160;
    private static final String DEFAULT_MIME_TYPE = "application/octet-stream";

    @PluginMethod
    public void open(PluginCall call) {
        DocumentPayload payload = payload(call);

        if (payload == null) {
            return;
        }

        try {
            File sharedFile = writeCacheFile(payload);
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                sharedFile
            );

            Intent openIntent = new Intent(Intent.ACTION_VIEW);
            openIntent.setDataAndType(uri, payload.mimeType);
            openIntent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_DOCUMENT
            );

            try {
                getActivity().startActivity(openIntent);
            } catch (ActivityNotFoundException error) {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType(payload.mimeType);
                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(
                    Intent.createChooser(shareIntent, "Open document")
                );
            }

            call.resolve();
        } catch (IOException | IllegalArgumentException error) {
            call.reject("Document opening failed.");
        }
    }

    @PluginMethod
    public void save(PluginCall call) {
        DocumentPayload payload = payload(call);

        if (payload == null) {
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(payload.mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, payload.filename);

        try {
            startActivityForResult(call, intent, "saveDocumentResult");
        } catch (ActivityNotFoundException error) {
            call.reject("No document storage provider is available.");
        }
    }

    @ActivityCallback
    private void saveDocumentResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        JSObject response = new JSObject();

        if (
            result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null ||
            result.getData().getData() == null
        ) {
            response.put("saved", false);
            call.resolve(response);
            return;
        }

        DocumentPayload payload = payload(call);

        if (payload == null) {
            return;
        }

        Uri uri = result.getData().getData();

        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) {
                call.reject("The selected document location could not be opened.");
                return;
            }

            output.write(payload.bytes);
            output.flush();
            response.put("saved", true);
            call.resolve(response);
        } catch (IOException error) {
            call.reject("Document saving failed.");
        }
    }

    private DocumentPayload payload(PluginCall call) {
        String base64 = call.getString("base64");
        String filename = safeFilename(call.getString("filename"));
        String mimeType = safeMimeType(call.getString("mimeType"));

        if (base64 == null || base64.isEmpty() || base64.length() > MAX_BASE64_LENGTH) {
            call.reject("Document content is invalid.");
            return null;
        }

        try {
            return new DocumentPayload(
                Base64.decode(base64, Base64.DEFAULT),
                filename,
                mimeType
            );
        } catch (IllegalArgumentException error) {
            call.reject("Document content could not be decoded.");
            return null;
        }
    }

    private File writeCacheFile(DocumentPayload payload) throws IOException {
        File directory = new File(getContext().getCacheDir(), "shared-documents");

        if (!directory.isDirectory() && !directory.mkdirs() && !directory.isDirectory()) {
            throw new IOException("The document cache could not be created.");
        }

        File file = new File(
            directory,
            System.currentTimeMillis() + "-" + payload.filename
        );

        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(payload.bytes);
            output.flush();
        }

        return file;
    }

    private static String safeFilename(String value) {
        String filename = value == null ? "" : value.trim();

        if (filename.isEmpty()) {
            filename = "document";
        }

        filename = filename.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        filename = filename.replaceAll("\\s+", " ").trim();

        if (filename.length() > MAX_FILENAME_LENGTH) {
            filename = filename.substring(0, MAX_FILENAME_LENGTH);
        }

        return filename.isEmpty() ? "document" : filename;
    }

    private static String safeMimeType(String value) {
        if (value == null) {
            return DEFAULT_MIME_TYPE;
        }

        String mimeType = value.trim().toLowerCase();

        return mimeType.matches("[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+")
            ? mimeType
            : DEFAULT_MIME_TYPE;
    }

    private static final class DocumentPayload {

        private final byte[] bytes;
        private final String filename;
        private final String mimeType;

        private DocumentPayload(byte[] bytes, String filename, String mimeType) {
            this.bytes = bytes;
            this.filename = filename;
            this.mimeType = mimeType;
        }
    }
}
