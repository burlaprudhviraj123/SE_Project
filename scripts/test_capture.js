const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(__dirname, '../screenshots/test.png') });
  await browser.close();
  console.log('Test capture saved!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
