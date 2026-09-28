/* ============================================================================
   Deployment-readiness test
   ----------------------------------------------------------------------------
   This is the test that matters most for launch: it captures the EXACT
   application/x-www-form-urlencoded body the browser posts, and checks it
   against what Netlify needs to see.

   It also simulates Netlify's build-time form parser against index.html.
   ========================================================================== */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const problems = [];
const notes = [];

/* ── Part 1 · Simulate Netlify's build-time form parser ────────────────── */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(ROOT, 'index.html'), 'utf8');

// Netlify's parser looks for <form> tags carrying the `netlify` or
// `data-netlify` attribute.
const formTags = [...html.matchAll(/<form\b[^>]*>/gi)].map((m) => m[0]);
const netlifyForms = formTags.filter((t) => /data-netlify="true"|\snetlify[\s>]/i.test(t));

console.log('\n═══ PART 1 · NETLIFY FORM DETECTION SIMULATION ═══');
console.log(`  <form> tags in the deployed HTML: ${formTags.length}`);
console.log(`  Forms Netlify will detect:        ${netlifyForms.length}`);

if (netlifyForms.length !== 1) {
  problems.push(`Netlify should detect exactly 1 form, found ${netlifyForms.length}`);
}
notes.push(`Detected form: ${netlifyForms[0]?.trim().replace(/\s+/g, ' ').slice(0, 110)}`);

const detected = netlifyForms[0] || '';
const formName = detected.match(/name="([^"]+)"/)?.[1];
notes.push(`Form name registered with Netlify: "${formName}"`);

if (!/netlify-honeypot="bot-field"/.test(detected)) {
  problems.push('Honeypot is not declared on the detected form');
}

// Count the fields Netlify will register
const mirrorStart = html.indexOf('<!-- NETLIFY-FORM-START -->');
const mirrorEnd = html.indexOf('<!-- NETLIFY-FORM-END -->');
const mirror = html.slice(mirrorStart, mirrorEnd);
const registered = new Set([...mirror.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
console.log(`  Fields Netlify will register:     ${registered.size}`);

// Netlify strips these two attributes at build time — confirm they are present pre-build
notes.push(`data-netlify present pre-build: ${/data-netlify="true"/.test(detected)}`);
notes.push(`netlify-honeypot present pre-build: ${/netlify-honeypot/.test(detected)}`);

/* ── Part 2 · Capture the real submission body ─────────────────────────── */

console.log('\n═══ PART 2 · LIVE SUBMISSION PAYLOAD ═══');

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(15000);

let captured = null;
let capturedHeaders = null;

// Stand in for Netlify's form endpoint and record exactly what arrives.
await page.route('**/', async (route) => {
  const req = route.request();
  if (req.method() === 'POST') {
    captured = req.postData();
    capturedHeaders = req.headers();
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' });
  }
  return route.continue();
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-start]').first().click();
await page.waitForTimeout(400);

async function fill() {
  return page.evaluate(() => {
    const host = document.getElementById('stepHost');
    const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
    for (const inp of host.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"],input[type="url"],input[type="date"],input[type="color"]')) {
      if (!inp.offsetParent && inp.getAttribute('type') !== 'color') continue;
      const id = inp.id;
      inp.value =
        id.includes('email') ? 'amina@wanjiru.co.ke'
        : id.includes('phone') ? '+254712345678'
        : id.includes('whatsapp') ? '+254798765432'
        : id.includes('url') || id.includes('domain') ? 'wanjiruconsulting.co.ke'
        : id.includes('date') ? '2026-12-01'
        : id.includes('color') ? '#4a1d56'
        : id.includes('booking_type') ? 'A 30-minute strategy call'
        : id.includes('integrations') ? 'Mailchimp, Google Analytics'
        : 'Wanjiru Consulting';
      fire(inp, 'input'); fire(inp, 'change');
    }
    for (const ta of host.querySelectorAll('textarea')) {
      ta.value = 'We help mid-sized manufacturers in Kenya modernise their operations. Six consultants across Nairobi and Mombasa.';
      fire(ta, 'input'); fire(ta, 'change');
    }
    for (const sel of host.querySelectorAll('select')) {
      const o = [...sel.options].find((x) => x.value !== ''); if (o) { sel.value = o.value; fire(sel, 'change'); }
    }
    for (const g of host.querySelectorAll('.optgrid')) {
      const bx = g.querySelectorAll('input[type="checkbox"]');
      if (bx.length) { if (!g.querySelector('input:checked')) { bx[0].click(); if (bx[1]) bx[1].click(); } }
      else { const r = g.querySelectorAll('input[type="radio"]'); if (!g.querySelector('input:checked') && r[0]) r[0].click(); }
    }
    for (const row of host.querySelectorAll('.matrix__row')) {
      if (!row.querySelector('input:checked')) row.querySelector('input').click();
    }
    for (const sw of host.querySelectorAll('.switch__input')) { if (!sw.checked) sw.click(); }
  });
}

for (let i = 0; i < 10; i++) {
  for (let k = 0; k < 6; k++) { await fill(); await page.waitForTimeout(200); }

  // On the features step, deliberately choose the options that trigger
  // conditional follow-up questions, so the payload proves they work.
  if ((await page.locator('#stepName').innerText()).toLowerCase() === 'features') {
    for (const v of ['ecommerce', 'booking', 'blog', 'customer_login']) {
      const sel = `#f-required_features---${v}`;
      if (!(await page.locator(sel).count())) continue;
      if (await page.locator(sel).isChecked()) continue;
      await page.locator(sel).click({ force: true }).catch(() => {});
      await page.waitForTimeout(320);
    }
    await page.waitForTimeout(600);
    for (let k = 0; k < 5; k++) { await fill(); await page.waitForTimeout(220); }
  }

  await page.locator('#nextBtn').click();
  await page.waitForTimeout(420);
}
await page.waitForTimeout(600);
await page.locator('#submitBtn').click();
await page.waitForTimeout(2200);

if (!captured) {
  problems.push('No POST body was captured — the submission never fired');
  console.log('  ✖ No payload captured');
} else {
  const params = new URLSearchParams(captured);
  const keys = [...params.keys()];

  console.log(`  Method:        POST`);
  console.log(`  Content-Type:  ${capturedHeaders['content-type']}`);
  console.log(`  Body encoding: application/x-www-form-urlencoded`);
  console.log(`  Fields submitted: ${keys.length}`);

  if (!/x-www-form-urlencoded/.test(capturedHeaders['content-type'] || '')) {
    problems.push(`Content-Type must be x-www-form-urlencoded, got ${capturedHeaders['content-type']}`);
  }

  // Netlify's requirements
  if (params.get('form-name') !== formName) {
    problems.push(`Body form-name "${params.get('form-name')}" does not match the form name "${formName}"`);
  }
  if (params.get('bot-field') !== '') {
    problems.push('Honeypot must be submitted as an empty value');
  }
  if (!params.get('submission_id')) problems.push('submission_id is missing');
  if (!params.get('submitted_at')) problems.push('submitted_at is missing');
  if (!params.get('subject')) problems.push('subject is missing (notification subject line)');
  if (!params.get('email')) problems.push('email field is missing (Netlify reply-to)');

  // Every submitted field must be registered, or Netlify drops it silently
  const unregistered = keys.filter((k) => !registered.has(k));
  console.log(`  Unregistered fields: ${unregistered.length ? unregistered.join(', ') : 'none'}`);
  if (unregistered.length) {
    problems.push(`Fields submitted but NOT registered with Netlify (they would be dropped): ${unregistered.join(', ')}`);
  }

  notes.push(`Subject line: "${params.get('subject')}"`);
  notes.push(`Reference:    ${params.get('submission_id')}`);
  notes.push(`Reply-to:     ${params.get('email')}`);

  // Human readability — a business owner must be able to read this
  const requiredReadable = [
    'client_name', 'business_name', 'business_industry', 'business_summary',
    'existing_website', 'current_website_url', 'website_goals[]', 'success_definition',
    'website_type', 'expected_pages', 'design_style[]', 'required_features[]',
    'content_status', 'domain_status', 'hosting_status', 'budget_range', 'timeline',
    'email', 'phone', 'preferred_contact', 'referral_source',
  ];
  const missingRequired = requiredReadable.filter((f) => !params.get(f));
  console.log(`  Core fields present: ${requiredReadable.length - missingRequired.length}/${requiredReadable.length}`);
  if (missingRequired.length) problems.push(`Core fields absent from the payload: ${missingRequired.join(', ')}`);

  // Conditional answers should be present because the triggers were selected
  const conditional = ['product_count', 'product_setup', 'booking_type', 'booking_scale', 'member_count', 'content_frequency'];
  const conditionalMissing = conditional.filter((f) => !params.get(f));
  console.log(`  Conditional fields present: ${conditional.length - conditionalMissing.length}/${conditional.length}`);
  if (conditionalMissing.length) problems.push(`Conditional fields missing: ${conditionalMissing.join(', ')}`);

  // Honeypot answer mirroring behaviour
  notes.push(`whatsapp submitted as: "${params.get('whatsapp')}" (mirrored from phone via the toggle)`);

  // Show a readable sample of what the owner will actually receive
  console.log('\n  ── Sample of the Netlify submission ──────────────────────────');
  for (const k of ['form-name', 'subject', 'client_name', 'business_name', 'business_industry',
                   'website_type', 'budget_range', 'timeline', 'email', 'phone',
                   'preferred_contact', 'referral_source', 'submission_id']) {
    const v = params.get(k);
    if (v !== null) console.log(`   ${k.padEnd(20)} ${String(v).slice(0, 62)}`);
  }
  console.log(`   ${'website_goals[]'.padEnd(20)} ${String(params.get('website_goals[]')).slice(0, 62)}`);
  console.log(`   ${'required_features[]'.padEnd(20)} ${String(params.get('required_features[]')).slice(0, 62)}`);
  console.log(`   ${'design_style[]'.padEnd(20)} ${String(params.get('design_style[]')).slice(0, 62)}`);
  console.log('  ──────────────────────────────────────────────────────────────');
}

/* ── Part 3 · Confirm the URL field was normalised before sending ──────── */

if (captured) {
  const params = new URLSearchParams(captured);
  const url = params.get('current_website_url');
  notes.push(`URL normalised before submission: "${url}"`);
  if (url && !url.startsWith('https://')) {
    problems.push(`URL was not normalised to https: "${url}"`);
  }
}

/* ── Part 4 · The 404 page ─────────────────────────────────────────────── */

console.log('\n═══ PART 3 · 404 PAGE ═══');
const p404 = await (await browser.newContext()).newPage();
const err404 = [];
p404.on('pageerror', (e) => err404.push(e.message));
p404.on('console', (m) => { if (m.type() === 'error') err404.push(m.text()); });
const resp = await p404.goto('http://127.0.0.1:8080/404.html', { waitUntil: 'networkidle' });
const p404title = await p404.title();
const p404h1 = await p404.locator('h1').innerText();
console.log(`  Status: ${resp.status()}`);
console.log(`  Title:  ${p404title}`);
console.log(`  H1:     ${p404h1}`);
console.log(`  Console errors: ${err404.length ? err404.join(' | ') : 'none'}`);
if (resp.status() !== 200) problems.push(`404.html returned ${resp.status()}`);
if (err404.length) problems.push(`404 page has console errors: ${err404.join(' | ')}`);

const p404overflow = await p404.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (p404overflow > 1) problems.push(`404 page overflows horizontally by ${p404overflow}px`);

await p404.setViewportSize({ width: 375, height: 800 });
await p404.waitForTimeout(300);
mkdirSync('test-results/screenshots', { recursive: true });
await p404.screenshot({ path: 'test-results/screenshots/404-mobile.png' });
await p404.setViewportSize({ width: 1440, height: 900 });
await p404.waitForTimeout(300);
await p404.screenshot({ path: 'test-results/screenshots/404-desktop.png' });

await browser.close();

/* ── Report ────────────────────────────────────────────────────────────── */

console.log('\n═══ NOTES ═══');
notes.forEach((n) => console.log(' •', n));

console.log('\n' + '='.repeat(72));
const uniq = [...new Set(problems)];
if (!uniq.length) console.log('✓  DEPLOYMENT READY — no blockers');
else { console.log(`✖  ${uniq.length} BLOCKER(S):`); uniq.forEach((p, i) => console.log(`  ${i + 1}. ${p}`)); }
console.log('='.repeat(72) + '\n');

process.exit(uniq.length ? 1 : 0);
