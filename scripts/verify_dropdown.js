const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8081/api';

async function getAuth(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.statusText}`);
  return await res.json();
}

async function verify() {
  const studentAuth = await getAuth('student1', 'BrandNewPassword123!');
  console.log('✓ Authenticated as student1');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page.evaluateOnNewDocument((token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, studentAuth.token, studentAuth.user);

  await page.goto(`${BASE_URL}/grievances/new`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // Click the department dropdown
  console.log('Clicking department dropdown trigger...');
  const trigger = await page.waitForSelector('#department, button[role="combobox"]', { timeout: 5000 });
  if (!trigger) {
    throw new Error('Department trigger not found');
  }
  await trigger.click();
  await new Promise(r => setTimeout(r, 800));

  // Inspect the open dropdown content
  const dropdownDetails = await page.evaluate(() => {
    const content = document.querySelector('[data-slot="select-content"]');
    if (!content) return { found: false };
    const style = window.getComputedStyle(content);
    const rect = content.getBoundingClientRect();
    const items = Array.from(content.querySelectorAll('[data-slot="select-item"]')).map(it => it.textContent.trim());
    return {
      found: true,
      backgroundColor: style.backgroundColor,
      color: style.color,
      boxShadow: style.boxShadow,
      border: `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`,
      opacity: style.opacity,
      itemsCount: items.length,
      itemsSample: items.slice(0, 4),
      rect: { width: rect.width, height: rect.height }
    };
  });

  console.log('Dropdown Details:', JSON.stringify(dropdownDetails, null, 2));

  const outPath = path.join(__dirname, '../screenshots/dropdown_verification.png');
  await page.screenshot({ path: outPath });
  console.log(`✓ Screenshot saved to ${outPath}`);

  // Test Dark Mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 400));
  const darkDetails = await page.evaluate(() => {
    const content = document.querySelector('[data-slot="select-content"]');
    if (!content) return { found: false };
    const style = window.getComputedStyle(content);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      border: `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`,
    };
  });
  console.log('Dark Mode Dropdown Details:', JSON.stringify(darkDetails, null, 2));
  const outPathDark = path.join(__dirname, '../screenshots/dropdown_verification_dark.png');
  await page.screenshot({ path: outPathDark });
  console.log(`✓ Dark mode screenshot saved to ${outPathDark}`);

  await browser.close();
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
