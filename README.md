# Screenshotter

A simple Node.js tool that captures full-page screenshots of any URL at three device sizes: desktop, tablet, and mobile.

Uses [Playwright](https://playwright.dev/) for reliable browser automation and device emulation.

## Requirements

- Node.js 16+ (tested with v22)
- [nvm](https://github.com/nvm-sh/nvm) recommended for managing Node versions

## Installation

```bash
# Switch to correct Node version (uses .nvmrc)
nvm use

# Install dependencies
npm install
npx playwright install chromium
```

## Usage

```bash
nvm use
node screenshotter.js <url>
```

Example:

```bash
node index.js https://example.com
```

Screenshots are saved to the `screenshots/` folder:
- `desktop.png` (1440x900)
- `tablet.png` (834x1194, iPad-like)
- `mobile.png` (390x844, iPhone-like)

## How It Works

1. Launches a headless Chromium browser
2. For each device size:
   - Creates a fresh browser context with device emulation
   - Navigates to the URL and waits for network idle
   - Waits 2 seconds for any animations to settle
   - Takes a full-page screenshot
3. Closes the browser cleanly
