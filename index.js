var playwright = require('playwright');
var path = require('path');
var fs = require('fs');

var url = process.argv[2] || 'https://example.com';
var outputDir = path.join(__dirname, 'screenshots');

var devices = [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  {
    name: 'tablet',
    viewport: { width: 834, height: 1194 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  }
];

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

async function captureScreenshots() {
  console.log('Taking screenshots of: ' + url);
  console.log('Output folder: ' + outputDir);
  console.log('');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  var browser = null;

  try {
    browser = await playwright.chromium.launch({ headless: true });

    for (var i = 0; i < devices.length; i++) {
      var device = devices[i];
      console.log('Capturing ' + device.name + '...');

      var contextOptions = {
        viewport: device.viewport,
        userAgent: device.userAgent
      };

      if (device.deviceScaleFactor) {
        contextOptions.deviceScaleFactor = device.deviceScaleFactor;
      }
      if (device.isMobile) {
        contextOptions.isMobile = device.isMobile;
      }
      if (device.hasTouch) {
        contextOptions.hasTouch = device.hasTouch;
      }

      var context = await browser.newContext(contextOptions);
      var page = await context.newPage();

      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await sleep(3000);

      var screenshotPath = path.join(outputDir, device.name + '.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log('  Saved: ' + screenshotPath);

      await context.close();
    }

    console.log('');
    console.log('Done! Screenshots saved to ' + outputDir);

  } catch (error) {
    console.error('Error: ' + error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

captureScreenshots();
