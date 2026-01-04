const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function titaniumForge() {
  console.log('🏗️ [V15.0-BUILDER] Forging Titanium Native Binary...');
  const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });

  try {
    if (!fs.existsSync('android')) exec('npx cap add android');
    exec('npx cap sync android');

    const javaPath = 'android/app/src/main/java/com/forge/titanium/v15/MainActivity.java';
    if (fs.existsSync(javaPath)) {
      let javaCode = fs.readFileSync(javaPath, 'utf8');
      if (!javaCode.includes('CookieManager')) {
        const importPatch = 'import android.webkit.CookieManager;\nimport android.webkit.WebSettings;\nimport com.getcapacitor.BridgeActivity;';
        javaCode = javaCode.replace('import com.getcapacitor.BridgeActivity;', importPatch);
        const initPatch = `
    @Override
    public void onResume() {
        super.onResume();
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
        WebSettings settings = this.bridge.getWebView().getSettings();
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36");
    }
`;
        javaCode = javaCode.replace('public class MainActivity extends BridgeActivity {}', 'public class MainActivity extends BridgeActivity {' + initPatch + '}');
        fs.writeFileSync(javaPath, javaCode);
      }
    }

    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    if (process.platform !== 'win32') exec('chmod +x android/gradlew');
    
    console.log('🚀 [TITANIUM-COMPILER] Generating APK Bundle...');
    exec('cd android && ' + gradlew + ' assembleDebug --no-daemon');
    console.log('✨ [DONE] Titanium APK Successfully Forged.');
  } catch (e) {
    console.error('❌ [CRITICAL] Build Process Terminated:', e.message);
    process.exit(1);
  }
}
titaniumForge();