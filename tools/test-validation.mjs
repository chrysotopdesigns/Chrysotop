#!/usr/bin/env node
/* ============================================================================
 * tools/test-validation.mjs
 * ----------------------------------------------------------------------------
 * Unit tests for js/validate.js. No test framework required — each case is a
 * plain assertion so the file stays readable and dependency-free.
 *
 * Run:  node tools/test-validation.mjs
 * ========================================================================== */

import {
  isValidEmail, isValidPhone, normaliseUrl, isSafeUrl, extractUrls,
  isValidFutureDate, normaliseHex, sanitiseText, sanitiseMultiline,
  validateField, clean, stripControl,
} from '../js/validate.js';

let passed = 0;
let failed = 0;
const failures = [];

function check(description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; } else {
    failed++;
    failures.push(`${description}\n      expected: ${JSON.stringify(expected)}\n      received: ${JSON.stringify(actual)}`);
  }
}

function group(name) { console.log(`\n  ${name}`); }

/* ── Email ───────────────────────────────────────────────────────────────── */
group('Email validation');
check('accepts a normal address', isValidEmail('amina@example.com'), true);
check('accepts a Kenyan domain', isValidEmail('info@chrysotop.co.ke'), true);
check('accepts plus addressing', isValidEmail('a+tag@example.co.uk'), true);
check('rejects no @', isValidEmail('not-an-email'), false);
check('rejects no TLD', isValidEmail('a@b'), false);
check('rejects a space', isValidEmail('a b@example.com'), false);
check('rejects a double dot', isValidEmail('a@example..com'), false);
check('rejects an empty string', isValidEmail(''), false);
check('rejects a leading dot in domain', isValidEmail('a@.example.com'), false);
check('rejects a comma', isValidEmail('a@example.com,b@x.com'), false);
check('rejects a quote injection attempt', isValidEmail('a"@example.com'), false);
check('rejects an over-long address', isValidEmail('a'.repeat(160) + '@example.com'), false);

/* ── Phone ───────────────────────────────────────────────────────────────── */
group('Phone validation');
check('accepts international format', isValidPhone('+254 712 345 678'), true);
check('accepts parentheses and dashes', isValidPhone('(020) 123-4567'), true);
check('accepts a plain local number', isValidPhone('0712345678'), true);
check('rejects too few digits', isValidPhone('12345'), false);
check('rejects letters', isValidPhone('call me maybe'), false);
check('rejects an empty string', isValidPhone(''), false);
check('rejects too many digits', isValidPhone('+1234567890123456'), false);

/* ── URL: the security-critical one ──────────────────────────────────────── */
group('URL normalisation and protocol allow-listing');
check('accepts a bare domain', normaliseUrl('example.com'), 'https://example.com/');
check('accepts https with a path', normaliseUrl('https://example.com/a/b?q=1'), 'https://example.com/a/b?q=1');
check('upgrades http to https', normaliseUrl('http://example.com'), 'https://example.com/');
check('accepts a subdomain', normaliseUrl('shop.example.co.ke'), 'https://shop.example.co.ke/');
check('accepts a hyphenated domain', normaliseUrl('my-site.example.com'), 'https://my-site.example.com/');

check('BLOCKS javascript:', normaliseUrl('javascript:alert(1)'), null);
check('BLOCKS mixed-case JaVaScRiPt:', normaliseUrl('JaVaScRiPt:alert(1)'), null);
check('BLOCKS javascript: with whitespace', normaliseUrl('  javascript:alert(1)  '), null);
check('BLOCKS data:', normaliseUrl('data:text/html,<script>alert(1)</script>'), null);
check('BLOCKS vbscript:', normaliseUrl('vbscript:msgbox(1)'), null);
check('BLOCKS file:', normaliseUrl('file:///etc/passwd'), null);
check('BLOCKS ftp:', normaliseUrl('ftp://example.com'), null);
check('BLOCKS embedded spaces', normaliseUrl('exa mple.com'), null);
check('BLOCKS HTML/quote injection', normaliseUrl('https://evil.com/"><script>alert(1)</script>'), null);
check('BLOCKS a hostname with no dot', normaliseUrl('localhost'), null);
check('BLOCKS a protocol-relative value', normaliseUrl('//example.com'), 'https://example.com/');
check('BLOCKS an empty string', normaliseUrl(''), null);
check('BLOCKS a leading-hyphen label', normaliseUrl('-bad.example.com'), null);

check('isSafeUrl agrees with normaliseUrl', isSafeUrl('javascript:alert(1)'), false);

group('URL extraction from a textarea');
check('parses one per line', extractUrls('a.com\nb.com'), ['https://a.com/', 'https://b.com/']);
check('parses comma separated', extractUrls('a.com, b.com'), ['https://a.com/', 'https://b.com/']);
check('drops unsafe entries but keeps valid ones',
  extractUrls('good.com\njavascript:alert(1)\nbetter.com'),
  ['https://good.com/', 'https://better.com/']);

/* ── Dates ───────────────────────────────────────────────────────────────── */
group('Date validation');
const today = new Date('2026-09-28T00:00:00Z');
check('accepts a future date', isValidFutureDate('2026-12-01', today), true);
check('accepts today', isValidFutureDate('2026-09-28', today), true);
check('rejects yesterday', isValidFutureDate('2026-09-27', today), false);
check('rejects a malformed value', isValidFutureDate('01/12/2026', today), false);
check('rejects an impossible date', isValidFutureDate('2026-02-31', today), false);
check('rejects an empty string', isValidFutureDate('', today), false);

/* ── Colour ──────────────────────────────────────────────────────────────── */
group('Colour normalisation');
check('accepts 6-digit hex', normaliseHex('#4A1D56'), '#4a1d56');
check('accepts without hash', normaliseHex('4a1d56'), '#4a1d56');
check('expands 3-digit hex', normaliseHex('#abc'), '#aabbcc');
check('rejects named colours', normaliseHex('rebeccapurple'), '');
check('rejects an injection attempt', normaliseHex('red;background:url(x)'), '');
check('rejects an empty string', normaliseHex(''), '');

/* ── Sanitising ──────────────────────────────────────────────────────────── */
group('Sanitising untrusted input');
check('strips NUL and escape characters', sanitiseText('hello\u0000\u001bworld'), 'helloworld');
check('collapses runs of whitespace', sanitiseText('  lots   of    spaces  '), 'lots of spaces');
check('enforces the maximum length', sanitiseText('abcdefghij', 4), 'abcd');
check('survives null', sanitiseText(null), '');
check('survives undefined', sanitiseText(undefined), '');
check('survives a number', sanitiseText(42), '42');
check('keeps newlines when asked', sanitiseMultiline('line one\n\n\n\nline two'), 'line one\n\nline two');
check('trims each line', sanitiseMultiline('  a  \n  b  '), 'a\nb');
check('stripControl handles non-strings', stripControl(null), '');
check('clean handles an object', clean({}), '[object Object]');

/* ── Field-level rules ───────────────────────────────────────────────────── */
group('Field validation');
const requiredText = { name: 'client_name', label: 'What is your name?', type: 'text', required: true };
check('required text rejects empty', validateField(requiredText, '') !== '', true);
check('required text rejects whitespace only', validateField(requiredText, '   ') !== '', true);
check('required text accepts a value', validateField(requiredText, 'Amina'), '');
check('required text message is human readable',
  validateField(requiredText, '').toLowerCase().includes('please'), true);

const optionalText = { name: 'notes', label: 'Notes', type: 'text', required: false };
check('optional text accepts empty', validateField(optionalText, ''), '');
check('optional text still validates maxlength',
  validateField({ ...optionalText, maxlength: 5 }, '123456') !== '', true);

const multi = { name: 'goals[]', label: 'Goals', type: 'checkbox', required: true };
check('checkbox group rejects empty array', validateField(multi, []) !== '', true);
check('checkbox group accepts a selection', validateField(multi, ['a']), '');

const toggle = { name: 'consent', label: 'Consent', type: 'toggle', required: true };
check('required toggle rejects false', validateField(toggle, false) !== '', true);
check('required toggle accepts true', validateField(toggle, true), '');

const urlField = { name: 'site', label: 'Website', type: 'url', required: true };
check('url field rejects javascript:', validateField(urlField, 'javascript:alert(1)') !== '', true);
check('url field accepts a domain', validateField(urlField, 'example.com'), '');

const radioField = {
  name: 'type', label: 'Type', type: 'radio', required: true,
  options: [{ value: 'a' }, { value: 'b' }],
};
check('radio rejects a value not in the list', validateField(radioField, 'zzz') !== '', true);
check('radio accepts a listed value', validateField(radioField, 'a'), '');

const shortText = { name: 'summary', label: 'Summary', type: 'textarea', required: true, minlength: 20 };
check('minlength reports the shortfall', validateField(shortText, 'too short') !== '', true);
check('minlength passes when long enough',
  validateField(shortText, 'This sentence is definitely longer than twenty characters.'), '');

/* ── Summary ─────────────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(66));
if (failed === 0) {
  console.log(`  ✓  All ${passed} validation assertions passed.`);
  console.log('─'.repeat(66));
  process.exit(0);
} else {
  console.log(`  ✖  ${failed} of ${passed + failed} assertions FAILED:\n`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}\n`));
  console.log('─'.repeat(66));
  process.exit(1);
}
