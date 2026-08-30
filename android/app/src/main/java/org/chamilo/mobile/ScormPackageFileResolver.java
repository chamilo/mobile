package org.chamilo.mobile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;

final class ScormPackageFileResolver {
    private ScormPackageFileResolver() {}

    static String normalizeLaunchPath(String value) {
        String normalized = normalizePath(value, false);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("The SCORM launch path is empty.");
        }

        return normalized;
    }

    static String normalizeArchiveEntry(String value) {
        return normalizePath(value, true);
    }

    private static String normalizePath(String value, boolean allowEmpty) {
        if (value == null) {
            throw new IllegalArgumentException("The SCORM package path is missing.");
        }

        String path = value.replace('\\', '/').trim();
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (path.indexOf('\0') >= 0 || path.matches("^[A-Za-z]:.*")) {
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

        if (!allowEmpty && normalized.length() == 0) {
            throw new IllegalArgumentException("The SCORM package path is empty.");
        }

        return normalized.toString();
    }

    static File safeChild(File root, String relativePath) throws IOException {
        File rootCanonical = root.getCanonicalFile();
        File child = new File(rootCanonical, relativePath).getCanonicalFile();
        String rootPath = rootCanonical.getPath() + File.separator;
        if (!child.getPath().startsWith(rootPath)) {
            throw new IOException("The SCORM package path escapes its cache directory.");
        }

        return child;
    }

    static File resolveLaunchFile(File root, String requestedPath) throws IOException {
        String normalizedRequest = normalizeLaunchPath(requestedPath);
        File exact = safeChild(root, normalizedRequest);
        if (exact.isFile()) {
            return exact;
        }

        File rootCanonical = root.getCanonicalFile();
        String rootPrefix = rootCanonical.getPath() + File.separator;
        Deque<File> pending = new ArrayDeque<>();
        pending.push(rootCanonical);
        File match = null;

        while (!pending.isEmpty()) {
            File current = pending.pop();
            File[] children = current.listFiles();
            if (children == null) {
                continue;
            }

            for (File child : children) {
                File canonical = child.getCanonicalFile();
                if (!canonical.getPath().startsWith(rootPrefix)) {
                    throw new IOException("A SCORM package file escapes its cache directory.");
                }

                if (canonical.isDirectory()) {
                    pending.push(canonical);
                    continue;
                }
                if (!canonical.isFile()) {
                    continue;
                }

                String relative = canonical.getPath().substring(rootPrefix.length())
                    .replace(File.separatorChar, '/');
                if (!isUniqueSuffixMatch(normalizedRequest, relative)) {
                    continue;
                }

                if (match != null && !match.equals(canonical)) {
                    throw new IOException("The SCORM launch path is ambiguous in the package.");
                }
                match = canonical;
            }
        }

        if (match == null) {
            throw new IOException("The SCORM launch file is missing from the package.");
        }

        return match;
    }

    private static boolean isUniqueSuffixMatch(String requestedPath, String candidatePath) {
        return requestedPath.equals(candidatePath)
            || requestedPath.endsWith('/' + candidatePath)
            || candidatePath.endsWith('/' + requestedPath);
    }
}
