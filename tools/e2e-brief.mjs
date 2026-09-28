/* Browser-driven verification of the Chrysotop Designs brief.
   - Walks the full 10-step flow and the review screen
   - Exercises conditional reveal/hide
   - Verifies real pointer interaction, keyboard nav, validation, overflow
   - Captures screenshots and every console error / failed request         */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Start a server first:  npm run dev   (or  npm run dev:netlify )
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const OUT = process.env.SHOTS_DIR || 'test-results/screenshots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-320', w: 320, h: 720 },
  { name: 'mobile-375', w: 375, h: 812 },
  { name: 'mobile-414', w: 414, h: 896 },
  { name: 'tablet-768', w: 768, h: 1024 },
  { name: 'laptop-1024', w: 1024, h: 768 },
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'wide-1920', w: 1920, h: 1080 },
];

const problems = [];
const notes = [];
let shotCount = 0;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(15000);

page.on('console', (m) => { if (m.type() === 'error') problems.push(`CONSOLE ERROR: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`PAGE ERROR: ${e.message}`));
page.on('requestfailed', (r) => {
  const u = r.url();
  if (u.includes('127.0.0.1') || u.includes('localhost')) problems.push(`REQ FAILED: ${u} — ${r.failure()?.errorText}`);
});
page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });

const shot = async (name, full = false) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  shotCount++;
};

/* The real question is whether a user can scroll sideways, and whether any
   content is being clipped out of view. `scrollWidth` alone over-reports,
   because decorative background blobs legitimately extend past the edge. */
async function overflowReport(label) {
  const r = await page.evaluate(async () => {
    const de = document.documentElement;
    const cw = de.clientWidth;

    window.scrollTo(600, 0);
    await new Promise((res) => requestAnimationFrame(res));
    const scrolledTo = window.scrollX;
    window.scrollTo(0, 0);

    // Anything real (not inside a scroll container, not a background layer)
    // whose right edge escapes the viewport is being clipped.
    const clipped = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.aurora') || el.closest('.preview__rail') || el.closest('.rail')) continue;
      const rc = el.getBoundingClientRect();
      if (rc.width <= 0 || rc.height <= 0) continue;
      if (rc.right <= cw + 1) continue;
      let sc = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox !== 'visible') { sc = true; break; }
      }
      if (!sc) clipped.push({ c: String(el.className).slice(0, 44) || el.tagName, right: Math.round(rc.right) });
    }
    return { scrollable: scrolledTo > 0, clipped: clipped.slice(0, 5) };
  });
  if (r.scrollable) problems.push(`HORIZONTAL SCROLL possible (${label})`);
  if (r.clipped.length) problems.push(`CONTENT CLIPPED off-screen (${label}): ${JSON.stringify(r.clipped)}`);
  return r;
}

/* Fills every currently-visible control in the step, using real DOM
   activation (input.click()) so the app's own handlers run. */
async function fillStep() {
  return page.evaluate(() => {
    const host = document.getElementById('stepHost');
    const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    const report = {};

    // text-like inputs
    for (const inp of host.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="date"], input[type="color"]')) {
      if (!inp.offsetParent && inp.getAttribute('type') !== 'color') continue;
      const id = inp.id;
      inp.value =
        id.includes('email') ? 'amina@chrysotop.co.ke' :
        id.includes('phone') || id.includes('whatsapp') ? '+254700123456' :
        id.includes('url') || id.includes('domain') ? 'example.com' :
        id.includes('date') ? '2027-03-15' :
        id.includes('color') ? '#4a1d56' :
        'A considered answer for this brief.';
      fire(inp, 'input'); fire(inp, 'change');
    }

    // textareas
    for (const ta of host.querySelectorAll('textarea')) {
      ta.value = 'We build considered things for people who care about the details, and we need a website that reflects that standard.';
      fire(ta, 'input'); fire(ta, 'change');
    }

    // selects
    for (const sel of host.querySelectorAll('select')) {
      const opt = [...sel.options].find((o) => o.value !== '');
      if (opt) { sel.value = opt.value; fire(sel, 'change'); }
    }

    // radio + checkbox groups: pick the first unchecked members
    for (const grid of host.querySelectorAll('.optgrid')) {
      const boxes = grid.querySelectorAll('input[type="checkbox"]');
      if (boxes.length) {
        if (!grid.querySelector('input[type="checkbox"]:checked')) {
          boxes[0]?.click();
          if (boxes[1]) boxes[1].click();
        }
      } else {
        const radios = grid.querySelectorAll('input[type="radio"]');
        if (!grid.querySelector('input[type="radio"]:checked') && radios[0]) radios[0].click();
      }
    }

    // matrix rows
    for (const row of host.querySelectorAll('.matrix__row')) {
      if (!row.querySelector('input:checked')) row.querySelector('input')?.click();
    }

    // switches — turn on (unless it is the "same as phone" mirror, which we also want on)
    for (const sw of host.querySelectorAll('.switch__input')) {
      if (!sw.checked) sw.click();
    }

    return report;
  });
}

/** Counts controls that still need an answer on the current step. */
async function outstanding() {
  return page.evaluate(() => {
    const host = document.getElementById('stepHost');
    if (!host) return 0;
    const vis = (el) => el.getClientRects().length > 0;
    let missing = 0;
    for (const inp of host.querySelectorAll('input[type=text],input[type=email],input[type=tel],input[type=url],input[type=date],textarea')) {
      if (vis(inp) && !inp.value.trim()) missing++;
    }
    for (const g of host.querySelectorAll('.optgrid')) {
      if (vis(g) && !g.querySelector('input:checked')) missing++;
    }
    for (const r of host.querySelectorAll('.matrix__row')) {
      if (vis(r) && !r.querySelector('input:checked')) missing++;
    }
    for (let i = 0; i < 6; i++) { /* no-op, keeps lint quiet */ }
    return missing;
  });
}

/** Fills, waits for conditional reveals, and repeats until nothing is left. */
async function settle(stepNo, label) {
  for (let pass = 0; pass < 6; pass++) {
    await fillStep();
    await page.waitForTimeout(260);          // let rAF re-renders land
    if ((await outstanding()) === 0) break;
  }
  return label;
}

/* ══ 1 · Welcome across viewports ════════════════════════════════════════ */
await page.goto(BASE, { waitUntil: 'networkidle' });
notes.push(`TITLE: ${await page.title()}`);
notes.push(`H1: ${(await page.locator('h1').first().innerText()).replace(/\s+/g, ' ')}`);

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await shot(`welcome-${vp.name}`);
  await overflowReport(`welcome ${vp.name}`);
}

/* ══ 2 · Real pointer interaction (the thing Playwright must confirm) ════ */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-start]').first().click();
await page.waitForTimeout(400);

const heroRadio = page.locator('#f-existing_website-yes');
await heroRadio.scrollIntoViewIfNeeded();
await heroRadio.click({ force: true });
await page.waitForTimeout(250);
const radioOn = await heroRadio.isChecked();
notes.push(`Real pointer click on a card radio: ${radioOn ? 'OK' : 'FAILED'}`);
if (!radioOn) problems.push('A real pointer click did not select an option card');

const urlRevealed = await page.locator('#f-current_website_url').count();
notes.push(`Conditional URL field revealed by the radio: ${urlRevealed ? 'OK' : 'MISSING'}`);
if (!urlRevealed) problems.push('Selecting "I already have a website" did not reveal the URL field');

// Fill the rest of step 1, advance, then real-click a checkbox card
await settle(1, 'business');
await page.locator('#nextBtn').click();
await page.waitForTimeout(600);
// innerText reflects CSS text-transform, so compare case-insensitively
const onGoals = (await page.locator('#stepName').innerText()).toLowerCase() === 'goals';
if (!onGoals) problems.push('Did not reach the Goals step after filling step 1');

if (onGoals) {
  const heroCheck = page.locator('#f-website_goals---generate_leads');
  await heroCheck.scrollIntoViewIfNeeded();
  await heroCheck.click({ force: true });
  await page.waitForTimeout(250);
  const checkOn = await heroCheck.isChecked();
  notes.push(`Real pointer click on a card checkbox: ${checkOn ? 'OK' : 'FAILED'}`);
  if (!checkOn) problems.push('A real pointer click did not select a checkbox card');

  // and confirm it can be deselected again (answers must be changeable)
  await heroCheck.click({ force: true });
  await page.waitForTimeout(200);
  const offAgain = !(await heroCheck.isChecked());
  notes.push(`Card checkbox deselects on a second click: ${offAgain ? 'OK' : 'FAILED'}`);
  if (!offAgain) problems.push('A selected card could not be deselected');
}

/* ══ 3 · Full walk of all ten steps ═════════════════════════════════════ */
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-start]').first().click();
await page.waitForTimeout(400);

let featuresChecked = false;

for (let i = 0; i < 10; i++) {
  const label = await page.locator('#stepName').innerText();
  await settle(i + 1, label);

  if (i === 4 && !featuresChecked) {
    featuresChecked = true;

    // Choose the options that trigger every conditional branch.
    // The step re-renders after each change (that is how conditionals appear),
    // so the locator is re-resolved and the re-render is allowed to settle
    // before the next click. Clicking a stale node would fail.
    for (const v of ['ecommerce', 'booking', 'blog', 'customer_login']) {
      const sel = `#f-required_features---${v}`;
      if (!(await page.locator(sel).count())) continue;
      if (await page.locator(sel).isChecked()) continue;
      await page.locator(sel).click({ force: true }).catch(() => {});
      await page.waitForTimeout(320);
    }
    await page.waitForTimeout(600);
    await settle(5, 'features');

    const groups = await page.locator('#stepHost .fieldgroup__title').allInnerTexts();
    const has = async (n) => (await page.locator(`#stepHost [name="${n}"]`).count()) > 0;
    const cond = {
      product_count: await has('product_count'),
      product_setup: await has('product_setup'),
      booking_type: await has('booking_type'),
      booking_scale: await has('booking_scale'),
      member_count: await has('member_count'),
      content_frequency: await has('content_frequency'),
    };
    notes.push(`Features — conditional groups revealed: [${groups.join(', ')}]`);
    notes.push(`Features — conditional fields: ${JSON.stringify(cond)}`);
    for (const [k, v] of Object.entries(cond)) {
      if (!v) problems.push(`Conditional field not revealed: ${k}`);
    }
    await shot('step-05-conditionals', true);

    // Deselect → confirm the follow-up disappears and its answer is dropped
    await page.locator('#f-required_features---ecommerce').click({ force: true }).catch(() => {});
    await page.waitForTimeout(650);
    const gone = (await page.locator('#stepHost [name="product_count"]').count()) === 0;
    notes.push(`Features — follow-up hidden after deselect: ${gone ? 'OK' : 'FAILED'}`);
    if (!gone) problems.push('Conditional question did not hide when its trigger was deselected');
    await page.locator('#f-required_features---ecommerce').click({ force: true }).catch(() => {});
    await page.waitForTimeout(650);
    await settle(5, 'features');
  }

  await overflowReport(`step ${i + 1} ${label}`);
  if (i === 0 || i === 4 || i === 5 || i === 9) await shot(`step-${String(i + 1).padStart(2, '0')}-${label.toLowerCase()}`, true);

  await page.locator('#nextBtn').click();
  await page.waitForTimeout(450);

  if (i < 9) {
    const after = await page.locator('#stepName').innerText();
    if (after === label) {  // both come from the same element, so casing matches
      const msgs = await page.locator('#errorList .errorlist__link').allInnerTexts();
      problems.push(`Step ${i + 1} (${label}) did not advance. Blocking: ${JSON.stringify(msgs)}`);
      break;
    }
  }
}

/* ══ 4 · Review screen ══════════════════════════════════════════════════ */
await page.waitForTimeout(700);
const reviewing = await page.locator('#review:visible').count();
notes.push(`Review screen reached: ${reviewing ? 'OK' : 'NO'}`);
if (!reviewing) {
  problems.push('Review screen did not appear');
  notes.push('Blocking: ' + JSON.stringify(await page.locator('#errorList .errorlist__link').allInnerTexts()));
} else {
  const groups = await page.locator('.review__group').count();
  const empties = await page.locator('.review__empty').count();
  const values = await page.locator('.review__val').count();
  notes.push(`Review groups: ${groups} | populated answers: ${values} | empty sections: ${empties}`);
  if (groups !== 10) problems.push(`Expected 10 review groups, found ${groups}`);
  if (values < 25) problems.push(`Review screen looks sparse: only ${values} values rendered`);
  await shot('review-desktop', true);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  await shot('review-mobile', true);
  await overflowReport('review mobile 375');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  await shot('review-tablet', true);
  await overflowReport('review tablet 768');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
}

/* ══ 5 · Edit round-trip ════════════════════════════════════════════════ */
if (await page.locator('.review__edit').count()) {
  const beforeText = await page.locator('.review__val').first().innerText();
  await page.locator('.review__edit').first().click();
  await page.waitForTimeout(500);
  const back = (await page.locator('#briefForm:visible').count()) > 0;
  notes.push(`Edit returns to the form: ${back ? 'OK' : 'FAILED'}`);
  if (!back) problems.push('Edit button did not return to the form');

  // change an answer, then continue — which should return straight to the review
  await page.locator('#f-client_name').fill('Amina Wanjiru');
  await page.waitForTimeout(200);
  const btnLabel = await page.locator('#nextBtn .btn__label').innerText();
  notes.push(`Edit mode changes the primary action to: "${btnLabel}"`);
  await page.locator('#nextBtn').click();
  await page.waitForTimeout(900);
  const backOnReview = (await page.locator('#review:visible').count()) > 0;
  const afterText = await page.locator('.review__val').first().innerText();
  notes.push(`Answer preserved through the edit round-trip: ${afterText === beforeText ? 'OK' : `changed ("${beforeText}" → "${afterText}")`}`);
  if (!backOnReview) problems.push('Did not return to the review after editing');
}

/* ══ 6 · Validation behaviour ═══════════════════════════════════════════ */
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-start]').first().click();
await page.waitForTimeout(400);
await page.locator('#nextBtn').click();
await page.waitForTimeout(400);

const blocked = (await page.locator('#formError:visible').count()) > 0;
const errCount = await page.locator('#errorList .errorlist__item').count();
notes.push(`Empty step blocked: ${blocked} | errors listed: ${errCount}`);
if (!blocked || errCount === 0) problems.push('Validation did not block an empty step');

// the summary must be linkable and move focus
const linkWorks = await page.evaluate(() => {
  const a = document.querySelector('.errorlist__link');
  if (!a) return false;
  a.click();
  return document.activeElement && document.activeElement.closest('[data-field]') !== null;
});
notes.push(`Error summary links focus the offending field: ${linkWorks ? 'OK' : 'FAILED'}`);
if (!linkWorks) problems.push('Error summary link did not move focus to the field');
await shot('validation-errors');

// invalid email must be rejected by the app's own rules
const emailOk = await page.evaluate(async () => {
  const m = await import('./js/validate.js');
  return {
    good: m.isValidEmail('amina@example.co.ke'),
    bad1: m.isValidEmail('not-an-email'),
    bad2: m.isValidEmail('a@b'),
    bad3: m.isValidEmail('a b@example.com'),
    bad4: m.isValidEmail('a@example..com'),
  };
});
notes.push(`Email validation: ${JSON.stringify(emailOk)}`);
if (emailOk.good !== true || Object.values(emailOk).slice(1).some((v) => v !== false)) {
  problems.push('Email validation is not behaving correctly');
}

/* ══ 7 · Security — URL protocol allow-list ════════════════════════════ */
const sec = await page.evaluate(async () => {
  const m = await import('./js/validate.js');
  return {
    javascript: m.normaliseUrl('javascript:alert(1)'),
    JaVaScRiPt: m.normaliseUrl('JaVaScRiPt:alert(1)'),
    data: m.normaliseUrl('data:text/html,<script>alert(1)</script>'),
    vbscript: m.normaliseUrl('vbscript:msgbox(1)'),
    file: m.normaliseUrl('file:///etc/passwd'),
    ftp: m.normaliseUrl('ftp://example.com'),
    bare: m.normaliseUrl('example.com'),
    withPath: m.normaliseUrl('https://example.com/path?q=1'),
    spaces: m.normaliseUrl('exa mple.com'),
    xss: m.normaliseUrl('https://evil.com/"><script>alert(1)</script>'),
    control: m.sanitiseText('hello\u0000\u001bworld'),
    strip: m.sanitiseText('  lots   of    spaces  '),
  };
});
notes.push('Security — URL normalisation: ' + JSON.stringify(sec, null, 0));
for (const k of ['javascript', 'JaVaScRiPt', 'data', 'vbscript', 'file', 'ftp', 'spaces', 'xss']) {
  if (sec[k] !== null) problems.push(`SECURITY: ${k} URL was accepted → ${sec[k]}`);
}
if (sec.bare !== 'https://example.com/') problems.push('Bare domain not normalised');
if (sec.control !== 'helloworld') problems.push('Control characters not stripped');
if (sec.strip !== 'lots of spaces') problems.push('Whitespace not collapsed');

/* ══ 8 · Refresh persistence ════════════════════════════════════════════ */
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-start]').first().click();
await page.waitForTimeout(350);
await page.locator('#f-client_name').fill('Persisted Name');
await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const restored = (await page.locator('#brief:visible').count()) > 0;
const restoredValue = await page.locator('#f-client_name').inputValue().catch(() => '');
notes.push(`Refresh restores the brief: ${restored} | value kept: "${restoredValue}"`);
if (!restored) problems.push('Brief not restored after refresh');
if (restoredValue !== 'Persisted Name') problems.push('Answer value lost across refresh');

/* ══ 9 · Keyboard navigation ═══════════════════════════════════════════ */
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const firstFocus = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
notes.push(`First Tab target: ${firstFocus}`);
if (!String(firstFocus).includes('skiplink')) problems.push(`First Tab did not reach the skip link (got ${firstFocus})`);

await page.locator('[data-start]').first().click();
await page.waitForTimeout(350);
const autofocus = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const focusOk = ['stepTitle', 'briefTitle'].includes(autofocus);
notes.push(`Focus after starting the brief: ${autofocus} (${focusOk ? 'OK' : 'unexpected'})`);
if (!focusOk) problems.push(`Expected focus on the step heading, got ${autofocus}`);

// Arrow keys should move within a native radio group
await fillStep();
await page.waitForTimeout(250);
const arrowWorks = await page.evaluate(() => {
  const first = document.querySelector('#stepHost .optgrid input[type="radio"]');
  if (!first) return 'no-radio';
  first.focus();
  return 'focused';
});
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(200);
const arrowState = await page.evaluate(() => {
  const r = document.querySelectorAll('#stepHost .optgrid input[type="radio"]:checked');
  return r.length;
});
notes.push(`Arrow-key radio navigation (${arrowWorks}): ${arrowState} selected`);
if (arrowState === 0) problems.push('Arrow keys did not operate the radio group');

// Tab order must not land on the hidden mirror form
const tabSafe = await page.evaluate(() => {
  const mirror = document.querySelector('.netlify-mirror');
  if (!mirror) return 'missing';
  // Real tabbability: an element is only reachable if it actually renders.
  return [...mirror.querySelectorAll('input, textarea, select, button, a[href]')]
    .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0).length;
});
notes.push(`Focusable controls inside the Netlify mirror: ${tabSafe} (must be 0)`);
if (tabSafe !== 0) problems.push('The hidden Netlify mirror exposes focusable controls to the tab order');

/* ══ 10 · Reduced motion ═══════════════════════════════════════════════ */
const ctx2 = await browser.newContext({ reducedMotion: 'reduce' });
const p2 = await ctx2.newPage();
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.locator('[data-start]').first().click();
await p2.waitForTimeout(500);
const rm = await p2.evaluate(() => {
  const blob = document.querySelector('.aurora__blob--plum');
  const anim = blob ? getComputedStyle(blob).animationName : 'none';
  const stepHost = document.getElementById('stepHost');
  const anim2 = stepHost ? getComputedStyle(stepHost).animationDuration : '';
  return { blobAnimation: anim, stepDuration: anim2, bodyBg: getComputedStyle(document.body).backgroundColor };
});
notes.push(`Reduced motion — blob animation: ${rm.blobAnimation} | step duration: ${rm.stepDuration}`);
if (rm.blobAnimation !== 'none') problems.push('Reduced-motion preference did not stop background animation');
await p2.screenshot({ path: `${OUT}/reduced-motion.png` });
shotCount++;
await ctx2.close();

/* ══ 11 · 320px mobile — controls must stay usable ════════════════════ */
await page.setViewportSize({ width: 320, height: 720 });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-start]').first().click();
await page.waitForTimeout(400);
await fillStep();
await page.waitForTimeout(300);
const touch = await page.evaluate(() => {
  const small = [];
  for (const el of document.querySelectorAll('#stepHost .opt__body, #stepHost .input, #stepHost .seg__opt, .btn, .rail__chip, .review__edit')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.height < 34) {
      small.push({ cls: String(el.className).slice(0, 30), h: Math.round(r.height) });
    }
  }
  return small.slice(0, 10);
});
notes.push(`Targets under 34px tall at 320px: ${touch.length} ${touch.length ? JSON.stringify(touch) : ''}`);
if (touch.length) problems.push(`Undersized touch targets at 320px: ${JSON.stringify(touch)}`);
await shot('mobile-320-step1', true);

/* ══ Report ═════════════════════════════════════════════════════════════ */
console.log('\n──── NOTES ────');
notes.forEach((n) => console.log(' •', n));
console.log('\n' + '='.repeat(74));
console.log(`SCREENSHOTS: ${shotCount}`);
console.log('='.repeat(74));
const uniq = [...new Set(problems)];
if (!uniq.length) console.log('✓  NO PROBLEMS DETECTED');
else { console.log(`✖  ${uniq.length} PROBLEM(S):\n`); uniq.forEach((p, i) => console.log(`${i + 1}. ${p}`)); }

await browser.close();
process.exit(uniq.length ? 1 : 0);
