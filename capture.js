var playwright = require('playwright');
var sharp = require('sharp');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

var url = process.argv[2] || 'https://webstage.keele.ac.uk/';
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

function archiveExisting() {
  var files = ['desktop.png', 'tablet.png', 'mobile.png', 'mockup.png'];
  var existingFiles = files.filter(function(f) {
    return fs.existsSync(path.join(outputDir, f));
  });

  if (existingFiles.length === 0) {
    return;
  }

  var now = new Date();
  var timestamp = now.getFullYear() +
    '-' + String(now.getMonth() + 1).padStart(2, '0') +
    '-' + String(now.getDate()).padStart(2, '0') +
    '_' + String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  var archiveDir = path.join(outputDir, 'archive', timestamp);
  fs.mkdirSync(archiveDir, { recursive: true });

  existingFiles.forEach(function(f) {
    var src = path.join(outputDir, f);
    var dest = path.join(archiveDir, f);
    fs.renameSync(src, dest);
  });

  console.log('Archived previous screenshots to: archive/' + timestamp);
  console.log('');
}

function cleanOldArchives() {
  var archiveDir = path.join(outputDir, 'archive');
  if (!fs.existsSync(archiveDir)) {
    return;
  }

  var maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  var now = Date.now();
  var deleted = 0;

  fs.readdirSync(archiveDir).forEach(function(name) {
    var dirPath = path.join(archiveDir, name);
    var stat = fs.statSync(dirPath);
    if (stat.isDirectory() && (now - stat.mtimeMs) > maxAge) {
      fs.rmSync(dirPath, { recursive: true });
      deleted++;
    }
  });

  if (deleted > 0) {
    console.log('Cleaned up ' + deleted + ' archive(s) older than 7 days');
    console.log('');
  }
}

async function createMockup() {
  console.log('Creating device mockup...');

  var desktopPath = path.join(outputDir, 'desktop.png');
  var tabletPath = path.join(outputDir, 'tablet.png');
  var mobilePath = path.join(outputDir, 'mobile.png');

  // Device frame dimensions
  var desktop = { screenW: 580, screenH: 360, bezel: 20, stand: 60 };
  var tablet = { screenW: 280, screenH: 380, bezel: 16, radius: 24 };
  var mobile = { screenW: 140, screenH: 280, bezel: 10, radius: 28 };

  // Crop and resize screenshots to fit device screens
  var desktopScreen = await sharp(desktopPath)
    .resize(desktop.screenW, desktop.screenH, { fit: 'cover', position: 'top' })
    .toBuffer();

  var tabletScreen = await sharp(tabletPath)
    .resize(tablet.screenW, tablet.screenH, { fit: 'cover', position: 'top' })
    .toBuffer();

  var mobileScreen = await sharp(mobilePath)
    .resize(mobile.screenW, mobile.screenH, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Create device frames as SVG
  var desktopFrameSvg = '<svg width="' + (desktop.screenW + desktop.bezel * 2) + '" height="' + (desktop.screenH + desktop.bezel * 2 + desktop.stand) + '">' +
    '<rect x="0" y="0" width="' + (desktop.screenW + desktop.bezel * 2) + '" height="' + (desktop.screenH + desktop.bezel * 2) + '" rx="8" fill="#1a1a1a"/>' +
    '<rect x="' + ((desktop.screenW + desktop.bezel * 2) / 2 - 40) + '" y="' + (desktop.screenH + desktop.bezel * 2) + '" width="80" height="' + (desktop.stand - 10) + '" fill="#1a1a1a"/>' +
    '<ellipse cx="' + ((desktop.screenW + desktop.bezel * 2) / 2) + '" cy="' + (desktop.screenH + desktop.bezel * 2 + desktop.stand - 8) + '" rx="60" ry="8" fill="#1a1a1a"/>' +
    '</svg>';

  var tabletFrameSvg = '<svg width="' + (tablet.screenW + tablet.bezel * 2) + '" height="' + (tablet.screenH + tablet.bezel * 2) + '">' +
    '<rect x="0" y="0" width="' + (tablet.screenW + tablet.bezel * 2) + '" height="' + (tablet.screenH + tablet.bezel * 2) + '" rx="' + tablet.radius + '" fill="#1a1a1a"/>' +
    '</svg>';

  var mobileFrameSvg = '<svg width="' + (mobile.screenW + mobile.bezel * 2) + '" height="' + (mobile.screenH + mobile.bezel * 2) + '">' +
    '<rect x="0" y="0" width="' + (mobile.screenW + mobile.bezel * 2) + '" height="' + (mobile.screenH + mobile.bezel * 2) + '" rx="' + mobile.radius + '" fill="#1a1a1a"/>' +
    '<rect x="' + ((mobile.screenW + mobile.bezel * 2) / 2 - 25) + '" y="' + (mobile.screenH + mobile.bezel * 2 - 6) + '" width="50" height="4" rx="2" fill="#333"/>' +
    '</svg>';

  // Create device images with screenshots composited
  var desktopDevice = await sharp(Buffer.from(desktopFrameSvg))
    .composite([{ input: desktopScreen, left: desktop.bezel, top: desktop.bezel }])
    .png()
    .toBuffer();

  var tabletDevice = await sharp(Buffer.from(tabletFrameSvg))
    .composite([{ input: tabletScreen, left: tablet.bezel, top: tablet.bezel }])
    .png()
    .toBuffer();

  var mobileDevice = await sharp(Buffer.from(mobileFrameSvg))
    .composite([{ input: mobileScreen, left: mobile.bezel, top: mobile.bezel }])
    .png()
    .toBuffer();

  // Calculate final canvas size
  var desktopW = desktop.screenW + desktop.bezel * 2;
  var desktopH = desktop.screenH + desktop.bezel * 2 + desktop.stand;
  var tabletW = tablet.screenW + tablet.bezel * 2;
  var tabletH = tablet.screenH + tablet.bezel * 2;
  var mobileW = mobile.screenW + mobile.bezel * 2;
  var mobileH = mobile.screenH + mobile.bezel * 2;

  var gap = 40;
  var canvasW = desktopW + gap + tabletW + gap + mobileW + 80;
  var canvasH = Math.max(desktopH, tabletH, mobileH) + 80;

  // Create final composite
  var mockupPath = path.join(outputDir, 'mockup.png');
  await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 245, g: 245, b: 245, alpha: 1 }
    }
  })
    .composite([
      { input: desktopDevice, left: 40, top: Math.floor((canvasH - desktopH) / 2) },
      { input: tabletDevice, left: 40 + desktopW + gap, top: Math.floor((canvasH - tabletH) / 2) },
      { input: mobileDevice, left: 40 + desktopW + gap + tabletW + gap, top: Math.floor((canvasH - mobileH) / 2) }
    ])
    .png()
    .toFile(mockupPath);

  console.log('  Saved: ' + mockupPath);
}

async function captureScreenshots() {
  console.log('Taking screenshots of: ' + url);
  console.log('Output folder: ' + outputDir);
  console.log('');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  archiveExisting();
  cleanOldArchives();

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

      // Dismiss cookie banners (prefer deny, fall back to accept)
      await page.locator('button:has-text("Deny all"), button:has-text("Reject all"), button:has-text("Decline all")').first().click({ timeout: 500 }).catch(function() {
        return page.locator('button:has-text("Accept all"), button:has-text("Accept cookies"), button:has-text("Got it")').first().click({ timeout: 500 });
      }).catch(function() {});

      // Scroll page to trigger lazy-loaded images
      await page.evaluate(function() {
        return new Promise(function(resolve) {
          var distance = 400;
          var delay = 100;
          var timer = setInterval(function() {
            window.scrollBy(0, distance);
            if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, delay);
        });
      });

      // Wait for images to finish loading
      await page.waitForFunction(function() {
        var images = Array.from(document.images);
        return images.every(function(img) { return img.complete; });
      }, { timeout: 10000 }).catch(function() {});

      await sleep(1000);

      var screenshotPath = path.join(outputDir, device.name + '.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log('  Saved: ' + screenshotPath);

      await context.close();
    }

    console.log('');

    await createMockup();

    console.log('');
    console.log('Done! Screenshots saved to ' + outputDir);

    exec('open "' + outputDir + '"');

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
