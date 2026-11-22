// Headless verification: render 4 screens, no console errors, only-local network requests.
const { chromium } = require('/home/agentuser/gleam-scan/node_modules/.pnpm/playwright-core@1.65.0/node_modules/playwright-core');
const { spawn } = require('node:child_process');

const shots = [
  ['1-start.jpg', '?shot=start&seed=1'],
  ['2-play.jpg', '?shot=play&seed=1'],
  ['3-win.jpg', '?shot=win&seed=1'],
  ['4-loss.jpg', '?shot=loss&seed=1'],
];

(async () => {
  const server = spawn('node', ['--experimental-strip-types', 'serve.ts', '--port', '8199'], {
    cwd: '/tmp/cardgame', stdio: 'pipe',
  });
  server.stdout.on('data', d => process.stdout.write('[srv] ' + d));
  server.stderr.on('data', d => process.stderr.write('[srv-err] ' + d));
  await new Promise(r => setTimeout(r, 1500));

  const browser = await chromium.launch({ executablePath: '/home/agentuser/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let consoleErrors = [];
  let externalRequests = [];
  let localRequests = 0;
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('request', req => {
    const u = new URL(req.url());
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') localRequests++;
    else externalRequests.push(req.url());
  });

  for (const [name, query] of shots) {
    await page.goto('http://localhost:8199/' + query, { waitUntil: 'networkidle' });
    try {
      await page.waitForFunction('window.__shotReady === true', { timeout: 8000 });
    } catch (e) {
      console.log('WARN ' + name + ': __shotReady flag not set');
    }
    await page.screenshot({ path: '/tmp/cardgame/screenshots/' + name, type: 'jpeg', quality: 90 });
    console.log('shot ok: ' + name);
  }

  console.log('console errors:', JSON.stringify(consoleErrors));
  console.log('external requests:', JSON.stringify(externalRequests));
  console.log('local requests:', localRequests);
  await browser.close();
  server.kill();
  process.exit(consoleErrors.length === 0 && externalRequests.length === 0 ? 0 : 1);
})();
