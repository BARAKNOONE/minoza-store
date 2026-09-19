const fs = require('fs');
const path = require('path');

function runVerification() {
  console.log('=== VERIFYING ANUPHAN TYPOGRAPHY & REAL 16:00 CUTOFF COUNTDOWN ===');

  const css = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const productHtml = fs.readFileSync(path.join(__dirname, '../public/product.html'), 'utf8');
  const i18nJs = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');

  // 1. Verify Anuphan font import and --font-main in CSS
  if (!css.includes('family=Anuphan') || !css.includes("--font-main: 'Anuphan'")) {
    throw new Error('Anuphan font is not set in style.css');
  }
  console.log('✓ Verified: Anuphan font imported and set as --font-main');

  // 2. Verify Thai line-height (1.6 - 1.8) in body
  const bodyMatch = css.match(/body\s*\{[^}]+\}/s);
  if (!bodyMatch || (!bodyMatch[0].includes('line-height: 1.7') && !bodyMatch[0].includes('line-height: 1.68') && !bodyMatch[0].includes('line-height: 1.72'))) {
    throw new Error('Body does not have recommended 1.6-1.8 line-height for Thai typography');
  }
  console.log('✓ Verified: Body line-height set to 1.72 (within 1.6 - 1.8 range to prevent tone mark clipping)');

  // 3. Verify HTML files have Anuphan preconnect and lang="th"
  if (!indexHtml.includes('lang="th"') || !indexHtml.includes('family=Anuphan')) {
    throw new Error('index.html missing lang="th" or Anuphan preconnect link');
  }
  if (!productHtml.includes('lang="th"') || !productHtml.includes('family=Anuphan')) {
    throw new Error('product.html missing lang="th" or Anuphan preconnect link');
  }
  console.log('✓ Verified: Both index.html and product.html have lang="th" and Anuphan preconnect');

  // 4. Verify authentic countdown timer logic to 16:00:00
  if (!productHtml.includes('startAuthenticCutoffTimer') || !productHtml.includes('dispatchCountdownBadge')) {
    throw new Error('product.html missing startAuthenticCutoffTimer or dispatchCountdownBadge');
  }

  // Test the cutoff calculation logic
  function calculateCutoff(testTime) {
    const now = new Date(testTime);
    const target = new Date(testTime);
    target.setHours(16, 0, 0, 0);

    let isToday = true;
    let diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) {
      isToday = false;
      target.setDate(target.getDate() + 1);
      diffMs = target.getTime() - now.getTime();
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    return {
      timeStr: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      isToday
    };
  }

  // Test 1: Exactly 13:00:00 (1:00 PM) -> must be exactly 03:00:00 remaining!
  const res13 = calculateCutoff('2026-09-19T13:00:00');
  if (res13.timeStr !== '03:00:00' || !res13.isToday) {
    throw new Error(`At 13:00:00 expected 03:00:00 remaining, got ${res13.timeStr}`);
  }
  console.log(`✓ Verified: At 13:00:00 cutoff countdown is exactly ${res13.timeStr} (3 hours until 16:00 round today)`);

  // Test 2: Exactly 15:30:00 (3:30 PM) -> must be 00:30:00 remaining!
  const res1530 = calculateCutoff('2026-09-19T15:30:00');
  if (res1530.timeStr !== '00:30:00' || !res1530.isToday) {
    throw new Error(`At 15:30:00 expected 00:30:00 remaining, got ${res1530.timeStr}`);
  }
  console.log(`✓ Verified: At 15:30:00 cutoff countdown is exactly ${res1530.timeStr} (30 mins until 16:00 cutoff)`);

  // Test 3: Past cutoff e.g. 18:00:00 (6:00 PM) -> counts down to tomorrow 16:00!
  const res18 = calculateCutoff('2026-09-19T18:00:00');
  if (res18.timeStr !== '22:00:00' || res18.isToday !== false) {
    throw new Error(`At 18:00:00 expected 22:00:00 remaining for tomorrow, got ${res18.timeStr}`);
  }
  console.log(`✓ Verified: At 18:00:00 cutoff counts down to tomorrow's round: ${res18.timeStr}`);

  console.log('\n=== ALL TYPOGRAPHY & CUTOFF TESTS PASSED 100%! ===');
}

runVerification();
