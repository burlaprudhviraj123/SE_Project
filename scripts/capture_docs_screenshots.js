const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8081/api';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

async function getAuth(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Auth failed for ${username}: ${res.statusText}`);
  return await res.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureAll() {
  console.log('--- Resolving Authentication Tokens ---');
  const studentAuth = await getAuth('student1', 'BrandNewPassword123!');
  const officerAuth = await getAuth('officer1', 'officer1234');
  const adminAuth = await getAuth('admin12', 'admin1234');
  console.log('✓ All 3 accounts authenticated successfully');

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,920'
    ]
  });

  console.log('✓ Chrome launched in headless mode (zero glows, zero borders)');

  // Helper to create a clean page
  async function createCleanPage(authData = null) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 920, deviceScaleFactor: 2 });
    
    if (authData) {
      await page.evaluateOnNewDocument((token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }, authData.token, authData.user);
    } else {
      await page.evaluateOnNewDocument(() => {
        localStorage.clear();
      });
    }
    return page;
  }

  // 1. Login Page
  console.log('1/15 Capturing 01_Login_Portal.png...');
  {
    const page = await createCleanPage(null);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[name="username"], input#username, input[type="text"]', { timeout: 8000 });
    
    // Fill credentials for demo preview
    await page.type('input[name="username"], input#username, input[type="text"]', 'student1', { delay: 40 });
    await page.type('input[type="password"]', 'BrandNewPassword123!', { delay: 40 });
    await sleep(800);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_Login_Portal.png') });
    await page.close();
    console.log('  ✓ Saved 01_Login_Portal.png');
  }

  // 2. Student Registration Page
  console.log('2/15 Capturing 02_Student_Registration.png...');
  {
    const page = await createCleanPage(null);
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    // Type demo collegiate roll number
    const rollInput = await page.$('input[name="username"], input#username, input[placeholder*="roll" i], input[placeholder*="A2" i]');
    if (rollInput) {
      await rollInput.type('A24126510123', { delay: 30 });
    }
    const emailInput = await page.$('input[name="email"], input#email');
    if (emailInput) {
      await emailInput.type('student1@anits.edu.in', { delay: 30 });
    }
    await sleep(600);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_Student_Registration.png') });
    await page.close();
    console.log('  ✓ Saved 02_Student_Registration.png');
  }

  // 3. Student Dashboard
  console.log('3/15 Capturing 03_Student_Dashboard.png...');
  {
    const page = await createCleanPage(studentAuth);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_Student_Dashboard.png') });
    await page.close();
    console.log('  ✓ Saved 03_Student_Dashboard.png');
  }

  // 4. Lodge Grievance Form
  console.log('4/15 Capturing 04_Lodge_Grievance_Portal.png...');
  {
    const page = await createCleanPage(studentAuth);
    await page.goto(`${BASE_URL}/grievances/new`, { waitUntil: 'networkidle0' });
    await sleep(1200);

    // Pre-populate fields to show an authentic collegiate complaint in the form
    const titleInput = await page.$('input[name="title"], input#title');
    if (titleInput) {
      await titleInput.type('Campus Library Extended Study Hours During End-Semester Exams', { delay: 20 });
    }
    const descInput = await page.$('textarea[name="description"], textarea#description');
    if (descInput) {
      await descInput.type('Requesting extension of central reading hall hours until 11:30 PM with faculty supervision and Wi-Fi power backup for final year students preparing for campus placements.', { delay: 15 });
    }
    await sleep(800);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_Lodge_Grievance_Portal.png') });
    await page.close();
    console.log('  ✓ Saved 04_Lodge_Grievance_Portal.png');
  }

  // 5. Student My Grievances List
  console.log('5/15 Capturing 05_Student_My_Grievances.png...');
  {
    const page = await createCleanPage(studentAuth);
    await page.goto(`${BASE_URL}/grievances`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_Student_My_Grievances.png') });
    await page.close();
    console.log('  ✓ Saved 05_Student_My_Grievances.png');
  }

  // 6. Grievance Investigation Timeline & Details
  console.log('6/15 Capturing 06_Grievance_Investigation_Timeline.png...');
  {
    const page = await createCleanPage(studentAuth);
    await page.goto(`${BASE_URL}/grievances/1`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_Grievance_Investigation_Timeline.png') });
    await page.close();
    console.log('  ✓ Saved 06_Grievance_Investigation_Timeline.png');
  }

  // 7. Campus Community Public Feed
  console.log('7/15 Capturing 07_Campus_Community_Public_Feed.png...');
  {
    const page = await createCleanPage(studentAuth);
    await page.goto(`${BASE_URL}/recent-grievances`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_Campus_Community_Public_Feed.png') });
    await page.close();
    console.log('  ✓ Saved 07_Campus_Community_Public_Feed.png');
  }

  // 8. Student Profile Hub
  console.log('8/15 Capturing 08_Student_Profile_Hub.png...');
  {
    const page = await createCleanPage(studentAuth);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_Student_Profile_Hub.png') });
    await page.close();
    console.log('  ✓ Saved 08_Student_Profile_Hub.png');
  }

  // 9. Officer Workload Dashboard
  console.log('9/15 Capturing 09_Officer_Workload_Dashboard.png...');
  {
    const page = await createCleanPage(officerAuth);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_Officer_Workload_Dashboard.png') });
    await page.close();
    console.log('  ✓ Saved 09_Officer_Workload_Dashboard.png');
  }

  // 10. Officer Resolution Modal / Slide-over Drawer
  console.log('10/15 Capturing 10_Officer_Resolution_Modal.png...');
  {
    const page = await createCleanPage(officerAuth);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Switch to Active Workload tab
    const tabs = await page.$$('button[role="tab"]');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Active Workload')) {
        await tab.click();
        await sleep(800);
        break;
      }
    }

    // Click Resolve / Reject button
    const buttons = await page.$$('button');
    let clicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Resolve / Reject')) {
        await btn.click();
        clicked = true;
        await sleep(1000);
        break;
      }
    }

    if (clicked) {
      // Type resolution notes in textarea
      const textarea = await page.$('textarea[placeholder*="resolution" i], textarea');
      if (textarea) {
        await textarea.type('Inspected the cooling coils and compressor assembly. Replaced faulty relay switch. Tested water temperature reading 12°C. Verified normal operation with hostel superintendent.', { delay: 15 });
      }
      await sleep(600);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_Officer_Resolution_Modal.png') });
    await page.close();
    console.log('  ✓ Saved 10_Officer_Resolution_Modal.png');
  }

  // 11. Admin Analytics Dashboard
  console.log('11/15 Capturing 11_Admin_Analytics_Dashboard.png...');
  {
    const page = await createCleanPage(adminAuth);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_Admin_Analytics_Dashboard.png') });
    await page.close();
    console.log('  ✓ Saved 11_Admin_Analytics_Dashboard.png');
  }

  // 12. Admin Grievance Triage Console
  console.log('12/15 Capturing 12_Admin_Grievance_Triage_Console.png...');
  {
    const page = await createCleanPage(adminAuth);
    await page.goto(`${BASE_URL}/admin/grievances`, { waitUntil: 'networkidle0' });
    await sleep(1800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_Admin_Grievance_Triage_Console.png') });
    await page.close();
    console.log('  ✓ Saved 12_Admin_Grievance_Triage_Console.png');
  }

  // 13. Admin Staff & Users Dialog
  console.log('13/15 Capturing 13_Admin_Staff_Management_Dialog.png...');
  {
    const page = await createCleanPage(adminAuth);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Find and click "Staff & Users" button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Staff & Users')) {
        await btn.click();
        await sleep(1200);
        break;
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_Admin_Staff_Management_Dialog.png') });
    await page.close();
    console.log('  ✓ Saved 13_Admin_Staff_Management_Dialog.png');
  }

  // 14. Admin Staff Invite Dialog
  console.log('14/15 Capturing 14_Admin_Staff_Invite_Dialog.png...');
  {
    const page = await createCleanPage(adminAuth);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Find and click "Invite Staff" button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Invite Staff')) {
        await btn.click();
        await sleep(1000);
        break;
      }
    }

    const emailInput = await page.$('input[placeholder*="email" i], input[type="email"]');
    if (emailInput) {
      await emailInput.type('prof.sharma@anits.edu.in', { delay: 25 });
    }
    await sleep(600);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_Admin_Staff_Invite_Dialog.png') });
    await page.close();
    console.log('  ✓ Saved 14_Admin_Staff_Invite_Dialog.png');
  }

  // 15. Admin Department Management Dialog
  console.log('15/15 Capturing 15_Admin_Department_Management_Dialog.png...');
  {
    const page = await createCleanPage(adminAuth);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Find and click "Departments" button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.trim() === 'Departments') {
        await btn.click();
        await sleep(1200);
        break;
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_Admin_Department_Management_Dialog.png') });
    await page.close();
    console.log('  ✓ Saved 15_Admin_Department_Management_Dialog.png');
  }

  await browser.close();
  console.log('\n=============================================');
  console.log('🎉 ALL 15 DOCUMENTATION SCREENSHOTS CAPTURED!');
  console.log('Directory: ' + SCREENSHOTS_DIR);
  console.log('=============================================');
}

captureAll().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
