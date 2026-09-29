import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT ?? './shots';
mkdirSync(OUT, { recursive: true });
const scheme = process.env.SCHEME ?? 'light';
const base = process.env.BASE ?? 'http://localhost:4173/';
const exe = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
const shot = (n) => page.screenshot({ path: `${OUT}/${scheme}-${n}.png`, fullPage: false });

await page.goto(base);
await page.waitForSelector('text=Welcome to Base Camp', { timeout: 15000 });
await shot('00-onboarding');
await page.fill('#ob-name', 'Andrés');
await page.click('text=Set up camp');
await page.waitForSelector('text=Rings');
await shot('01-today');
await page.click('text=Preview');
await page.waitForTimeout(400);
await shot('02-preview');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.click('.card.accent button.white');
await page.waitForSelector('.player');
await page.waitForTimeout(300);
await shot('03-player-reps');
await page.click('button[aria-label="One rep more"]');
await page.click('button[aria-label="One rep more"]');
await page.click('text=Done ✓');
await page.waitForTimeout(400);
await shot('04-player-switch');
await page.click('text=Skip rest');
await page.waitForTimeout(300);
// advance a few exercises
for (let i = 0; i < 3; i++) {
  const done = page.locator('text=Done ✓');
  if (await done.count()) { await done.click(); await page.waitForTimeout(200); const skip = page.locator('text=Skip rest'); if (await skip.count()) await skip.click(); }
  else { const d = page.locator('button:has-text("Done")').first(); await d.click(); await page.waitForTimeout(200); const skip = page.locator('text=Skip rest'); if (await skip.count()) await skip.click(); }
  await page.waitForTimeout(200);
}
await shot('05-player-timed');
await page.click('button[aria-label="Exit workout"]');
await page.waitForTimeout(300);
await shot('06-exit-sheet');
await page.click('text=Finish now and save');
await page.waitForTimeout(300);
await shot('07-finish');
await page.click('button:has-text("7")');
await page.click('text=Save workout');
await page.waitForTimeout(400);
await shot('08-saved');
await page.click('text=Back to Today');
await page.waitForSelector('text=Rings');
await shot('09-today-done');
await page.click('a[aria-label="Plan"]');
await page.waitForTimeout(300);
await shot('10-plan');
await page.click('.cal-day.today');
await page.waitForTimeout(400);
await shot('11-plan-sheet');
await page.keyboard.press('Escape');
await page.click('a[aria-label="Exercises"]');
await page.waitForTimeout(300);
await shot('12-exercises');
await page.click('text=Pull-up negative');
await page.waitForTimeout(300);
await shot('13-exercise-detail');
await page.click('a[aria-label="Progress"]');
await page.waitForTimeout(300);
await shot('14-progress');
await page.click('text=+ Log');
await page.fill('#w-val', '233.4');
await page.click('text=Save');
await page.waitForTimeout(300);
await shot('15-progress-weight');
await page.click('a[aria-label="Profile"]');
await page.waitForTimeout(300);
await shot('16-profile');
console.log(errors.length ? errors.join('\n') : 'no console/page errors');
await browser.close();
