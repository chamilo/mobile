package org.chamilo.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ChamiloSecureStoragePlugin.class);
        registerPlugin(ChamiloDocumentPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
