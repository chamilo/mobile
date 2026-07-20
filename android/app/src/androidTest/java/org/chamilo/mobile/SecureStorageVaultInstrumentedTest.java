package org.chamilo.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.UUID;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class SecureStorageVaultInstrumentedTest {

    private SecureStorageVault vault;
    private String firstKey;
    private String secondKey;

    @Before
    public void setUp() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        vault = new SecureStorageVault(context);
        String suffix = UUID.randomUUID().toString();
        firstKey = "campus-a-" + suffix + "/token";
        secondKey = "campus-b-" + suffix + "/token";
    }

    @After
    public void tearDown() throws Exception {
        vault.remove(firstKey);
        vault.remove(secondKey);
    }

    @Test
    public void encryptsPersistsAndRemovesCampusTokens() throws Exception {
        vault.write(firstKey, "{\"token\":\"token-a\",\"expiresAt\":10}");
        vault.write(secondKey, "{\"token\":\"token-b\",\"expiresAt\":20}");

        assertEquals("{\"token\":\"token-a\",\"expiresAt\":10}", vault.read(firstKey));
        assertEquals("{\"token\":\"token-b\",\"expiresAt\":20}", vault.read(secondKey));

        vault.remove(firstKey);

        assertNull(vault.read(firstKey));
        assertEquals("{\"token\":\"token-b\",\"expiresAt\":20}", vault.read(secondKey));
    }
}
