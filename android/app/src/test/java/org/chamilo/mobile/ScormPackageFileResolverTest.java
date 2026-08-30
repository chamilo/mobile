package org.chamilo.mobile;

import static org.junit.Assert.assertEquals;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class ScormPackageFileResolverTest {
    @Rule
    public TemporaryFolder temporaryFolder = new TemporaryFolder();

    @Test
    public void resolvesExactLaunchPath() throws Exception {
        File root = temporaryFolder.newFolder("exact");
        File launch = createFile(root, "course/index.html");

        assertEquals(launch.getCanonicalFile(), ScormPackageFileResolver.resolveLaunchFile(
            root,
            "course/index.html"
        ));
    }

    @Test
    public void resolvesUniqueSuffixWhenBackendPathContainsAnImportPrefix() throws Exception {
        File root = temporaryFolder.newFolder("prefix");
        File launch = createFile(root, "course/index.html");

        assertEquals(launch.getCanonicalFile(), ScormPackageFileResolver.resolveLaunchFile(
            root,
            "import-123/course/index.html"
        ));
    }

    @Test(expected = IOException.class)
    public void rejectsAmbiguousSuffixMatches() throws Exception {
        File root = temporaryFolder.newFolder("ambiguous");
        createFile(root, "first/index.html");
        createFile(root, "second/index.html");

        ScormPackageFileResolver.resolveLaunchFile(root, "index.html");
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsParentTraversal() {
        ScormPackageFileResolver.normalizeLaunchPath("../index.html");
    }

    @Test
    public void acceptsHarmlessRootDirectoryEntries() {
        assertEquals("", ScormPackageFileResolver.normalizeArchiveEntry("./"));
    }

    private File createFile(File root, String relativePath) throws IOException {
        File file = new File(root, relativePath);
        File parent = file.getParentFile();
        if (parent == null || (!parent.mkdirs() && !parent.isDirectory())) {
            throw new IOException("Could not create test directory.");
        }

        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write("test".getBytes(StandardCharsets.UTF_8));
        }

        return file;
    }
}
