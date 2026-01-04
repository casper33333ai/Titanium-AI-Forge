const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function titaniumScrape() {
  const url = process.env.AI_URL || "https://aistudio.google.com/u/1/apps/drive/1C95LlT34ylBJSzh30JU2J1ZlwMZSIQrx?showPreview=true&showAssistant=true";
  const rawCookies = process.env.SESSION_COOKIES || '[]';
  
  console.log('🛡️ [V15.0] Initializing Titanium Protocol...');

  // Extensive launch arguments to prevent Exit 100 and sandbox crashes
  const launchOptions = {
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--js-flags="--max-old-space-size=1024"'
    ],
    // Force usage of the bundled chrome to ensure version compatibility
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  };

  let browser;
  try {
    console.log('🚀 [LAUNCH] Attempting Titanium Browser Initialization...');
    browser = await puppeteer.launch(launchOptions);
    console.log('✅ [LAUNCH] Browser instance established.');
  } catch (launchError) {
    console.error('💥 [CRASH] Titanium Launch Failure (Exit 100 Prevention):');
    console.error(launchError);
    // Print environment info for debugging
    console.log('Environment Debug:', {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      chromePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });
    process.exit(1);
  }
  
  try {
    const page = await browser.newPage();
    
    // Set a high-fidelity Android User-Agent to match native WebView simulation
    const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
    await page.setUserAgent(androidUA);

    if (rawCookies && rawCookies.length > 20) {
      console.log('🍪 [AUTH] Injecting Identity Vault...');
      const cookies = JSON.parse(rawCookies);
      await page.setCookie(...cookies.map(c => ({
        ...c, 
        domain: c.domain || '.google.com',
        secure: true,
        httpOnly: c.httpOnly || false,
        sameSite: 'Lax'
      })));
      await delay(4000);
    }

    console.log('🌐 [NAVIGATE] Establishing Secure Tunnel to: ' + url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    
    console.log('⏳ [HYDRATE] Waiting for deep SPA stabilization...');
    await delay(20000); 

    const bundleData = await page.evaluate(() => {
      // Remove any potential overlay elements that might interfere with extraction
      const overlays = document.querySelectorAll('.modal, .overlay, .popup');
      overlays.forEach(el => el.remove());
      
      return {
        html: document.body.innerHTML,
        head: document.head.innerHTML,
        origin: window.location.origin,
        cookies: document.cookie
      };
    });

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${bundleData.origin}/">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <title>Titanium AI Native</title>
  ${bundleData.head}
  <script>
    (function() {
      const cookies = ${JSON.stringify(bundleData.cookies)};
      if (cookies) {
        cookies.split(';').forEach(c => {
          document.cookie = c.trim() + "; domain=.google.com; path=/; SameSite=Lax";
        });
      }
      // Native interface bridge simulation
      window.isNativeApp = true;
    })();
  </script>
  <style>
    body { background: #000 !important; color: #fff !important; margin: 0; padding: 0; overflow-x: hidden; }
    #forge-container { width: 100vw; height: 100vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    /* Hide scrollbars for native feel */
    ::-webkit-scrollbar { display: none; }
  </style>
</head>
<body class="titanium-v15-0">
  <div id="forge-container">${bundleData.html}</div>
</body>
</html>`;

    if (!fs.existsSync('www')) fs.mkdirSync('www', { recursive: true });
    fs.writeFileSync(path.join('www', 'index.html'), finalHtml);
    console.log('✅ [TITANIUM] Interface extraction complete.');
  } catch (err) {
    console.error('❌ [FATAL] Extraction Phase Failure:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}
titaniumScrape();