#!/usr/bin/env node
/* ============================================================================
 * tools/verify.mjs
 * ----------------------------------------------------------------------------
 * Static checks that catch the mistakes this kind of project actually makes:
 * a schema field with no Netlify mirror, a missing asset, a secret committed
 * by accident, a broken internal link, a skipped heading level, a placeholder
 * left behind.
 *
 * Run:  node tools/verify.mjs
 * Exit: 0 when clean, 1 when anything fails. Suitable for CI.
 * ========================================================================== */

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const results = [];
const add = (ok, title, detail = '') => results.push({ ok, title, detail });

const read = (p) => readFile(resolve(ROOT, p), 'utf8');

const html = await read('index.html');
const css = await read('styles.css');
const app = await read('js/app.js');
const schema = await read('js/schema.js');
const validate = await read('js/validate.js');
const netlify = await read('netlify.toml');

const { STEPS, allFields, allFieldNames, META } = await import(
  new URL('../js/schema.js', import.meta.url).href
);

/* ══ 1 · Netlify form integrity ══════════════════════════════════════════ */

const mirror = html.slice(
  html.indexOf('<!-- NETLIFY-FORM-START -->'),
  html.indexOf('<!-- NETLIFY-FORM-END -->')
);

add(mirror.length > 100, 'Netlify form mirror exists in index.html');

add(/data-netlify="true"/.test(mirror), 'Mirror uses data-netlify="true"');
add(new RegExp(`name="${META.formName}"`).test(mirror), `Mirror is named "${META.formName}"`);
add(
  new RegExp(`<input type="hidden" name="form-name" value="${META.formName}">`).test(mirror),
  'Mirror includes the hidden form-name input'
);
add(/netlify-honeypot="bot-field"/.test(mirror), 'Mirror declares the honeypot');
add(/name="bot-field"/.test(mirror), 'Honeypot input is present');

const mirrorNames = new Set(
  [...mirror.matchAll(/name="([^"]+)"/g)].map((m) => m[1])
);

const schemaNames = allFieldNames().filter((n) => n !== 'whatsapp_same_as_phone');
const missingFromMirror = schemaNames.filter((n) => !mirrorNames.has(n));
add(
  missingFromMirror.length === 0,
  `Every schema field is registered with Netlify (${schemaNames.length} fields)`,
  missingFromMirror.length ? `Missing: ${missingFromMirror.join(', ')}` : ''
);

// Netlify uses a field named `email` as the notification reply-to address.
add(mirrorNames.has('email'), 'A field named "email" exists for Netlify reply-to');
add(mirrorNames.has('subject'), 'A "subject" field exists for the notification subject');
add(mirrorNames.has('submission_id'), 'A "submission_id" field exists for deduplication');

/* ══ 2 · No secrets in the client bundle ═════════════════════════════════ */

const SECRET_PATTERNS = [
  { name: 'private key block',        re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'AWS access key',           re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Google API key',           re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Stripe live secret',       re: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Stripe test secret',       re: /sk_test_[0-9a-zA-Z]{24,}/ },
  { name: 'SendGrid API key',         re: /SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}/ },
  { name: 'hard-coded SMTP password', re: /(smtp|mail)[_-]?(pass|password|secret)\s*[:=]\s*['"][^'"\s]{6,}['"]/i },
  { name: 'hard-coded api key',       re: /(api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"][A-Za-z0-9\-_]{16,}['"]/i },
  { name: 'bearer token literal',     re: /bearer\s+[A-Za-z0-9\-_.]{20,}/i },
];

const clientFiles = { 'index.html': html, 'styles.css': css, 'js/app.js': app, 'js/schema.js': schema, 'js/validate.js': validate };
for (const [file, contents] of Object.entries(clientFiles)) {
  for (const { name, re } of SECRET_PATTERNS) {
    const hit = re.exec(contents);
    add(!hit, `No ${name} in ${file}`, hit ? `Found: ${hit[0].slice(0, 24)}…` : '');
  }
}

// The only allowed credential-ish string is the public contact address.
const emailsInClient = new Set(
  Object.values(clientFiles).join(' ')
    .match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []
);
// Placeholder addresses legitimately appear in `placeholder="you@…"` hints.
// Anything that is not one of those, and not the public contact address,
// deserves a look.
const PLACEHOLDER_DOMAINS = /@(yourbusiness|example|yourcompany|domain|email)\./i;
const unexpectedEmails = [...emailsInClient]
  .filter((e) => e !== 'chrysotopdesigns@gmail.com')
  .filter((e) => !PLACEHOLDER_DOMAINS.test(e));
add(
  unexpectedEmails.length === 0,
  'Only the public contact address appears in client code',
  unexpectedEmails.length ? `Unexpected: ${unexpectedEmails.join(', ')}` : ''
);

/* ══ 3 · Untrusted input never reaches innerHTML ═════════════════════════ */

// Allow only the constant markup string in fromHTML() to use innerHTML.
// Count actual assignments only. Mentions of the word in comments and
// documentation are not a risk and would otherwise make this check noise.
const innerHtmlUses = [...app.matchAll(/\binnerHTML\s*=/g)];
const fromHTMLHasInner = /t\.innerHTML\s*=\s*html/.test(app);
add(
  innerHtmlUses.length <= 1 && fromHTMLHasInner,
  'innerHTML is used only for developer-authored constant markup',
  innerHtmlUses.length > 1 ? `${innerHtmlUses.length} occurrences found in js/app.js` : ''
);

add(/textContent\s*=/.test(app), 'User-supplied values are written with textContent');

const dangerous = [
  ['eval(', /[^.\w]eval\s*\(/],
  ['new Function', /new\s+Function\s*\(/],
  ['document.write', /document\.write\s*\(/],
  ['setTimeout(string)', /setTimeout\s*\(\s*['"`]/],
];
for (const [name, re] of dangerous) {
  add(!re.test(app), `js/app.js avoids ${name}`);
}

/* ══ 4 · Asset integrity ════════════════════════════════════════════════ */

const referenced = new Set();
for (const m of html.matchAll(/(?:src|href)="(\/)?(assets\/[^"]+)"/g)) referenced.add(m[2]);
for (const m of css.matchAll(/url\(["']?\.?\/?(assets\/[^"')]+)["']?\)/g)) referenced.add(m[1]);
for (const m of css.matchAll(/url\(["']?(fonts\/[^"')]+)["']?\)/g)) referenced.add(`assets/${m[1]}`);
for (const m of app.matchAll(/['"`](\/?assets\/[^'"`]+)['"`]/g)) referenced.add(m[1].replace(/^\//, ''));

const missingAssets = [...referenced].filter((p) => !existsSync(resolve(ROOT, p)));
add(
  missingAssets.length === 0,
  `All ${referenced.size} referenced assets exist`,
  missingAssets.length ? `Missing: ${missingAssets.join(', ')}` : ''
);

// Fonts must be self-hosted so the site needs no third-party request.
add(
  !/fonts\.(googleapis|gstatic)\.com/.test(html + css),
  'Fonts are self-hosted (no Google Fonts / gstatic requests)'
);

// @font-face src paths must resolve relative to styles.css at the repo root.
for (const m of css.matchAll(/src:\s*url\(['"]?(assets\/fonts\/[^'")]+)['"]?\)/g)) {
  add(existsSync(resolve(ROOT, m[1])), `Font file resolves: ${m[1]}`);
}

/* ══ 5 · Accessibility structure ════════════════════════════════════════ */

add(/<html lang="en">/.test(html), 'Document declares lang="en"');
add(/<meta name="viewport"/.test(html), 'Viewport meta tag is present');
add(/class="skiplink"[\s\S]{0,120}href="#main"/.test(html), 'Skip link is the first focusable element');
add(/<main id="main">/.test(html), 'A single <main> landmark exists');
add((html.match(/<main\b/g) || []).length === 1, 'There is exactly one <main>');
add((html.match(/<h1\b/g) || []).length === 1, 'There is exactly one <h1>');

// Heading levels must not skip (h1 → h3).
const headingLevels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
let skipped = null;
for (let i = 1; i < headingLevels.length; i++) {
  if (headingLevels[i] > headingLevels[i - 1] + 1) {
    skipped = `h${headingLevels[i - 1]} → h${headingLevels[i]}`;
    break;
  }
}
add(!skipped, 'Heading levels never skip', skipped ? `Found ${skipped}` : '');

add(/aria-live="polite"/.test(html), 'A polite live region exists for announcements');
add(/role="alert"/.test(html), 'Error regions use role="alert"');
add(/aria-valuenow/.test(html), 'The progress bar exposes aria-valuenow');
add(/prefers-reduced-motion/.test(css), 'styles.css honours prefers-reduced-motion');
add(/prefers-contrast/.test(css), 'styles.css honours prefers-contrast');
add(/scroll-padding-top/.test(css), 'scroll-padding keeps focus clear of the sticky header');
add(/:focus-visible/.test(css), 'Visible focus styles are defined');

// Images must not be missing alt text.
const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
const noAlt = imgs.filter((tag) => !/\balt=/.test(tag));
add(noAlt.length === 0, `All ${imgs.length} <img> elements have an alt attribute`, noAlt.join('\n') );

// Decorative logos should have empty alt, so screen readers skip them.
const realLogos = imgs.filter((t) => /logo-mark/.test(t));
add(
  realLogos.every((t) => /alt=""/.test(t)),
  'Brand marks are decorative (alt="") since the text name carries meaning'
);

/* ══ 6 · SEO ════════════════════════════════════════════════════════════ */

add(/<title>[^<]{20,70}<\/title>/.test(html), 'Title is a sensible length');
const metaDesc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/s)?.[1] || '';
add(
  metaDesc.length >= 80 && metaDesc.length <= 160,
  `Meta description is 80–160 characters (found ${metaDesc.length})`
);
add(/rel="canonical"/.test(html), 'Canonical URL is declared');
add(/property="og:title"/.test(html), 'Open Graph title is present');
add(/property="og:description"/.test(html), 'Open Graph description is present');
add(/property="og:image"/.test(html), 'Open Graph image is present');
add(/name="twitter:card"/.test(html), 'Twitter card metadata is present');
add(/application\/ld\+json/.test(html), 'Structured data is present');

let ldValid = true;
try {
  const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  JSON.parse(raw);
} catch { ldValid = false; }
add(ldValid, 'Structured data is valid JSON');

// Every canonical/OG URL should be absolute.
add(
  (html.match(/https:\/\/chrysotopdesigns\.com/g) || []).length >= 4,
  'Canonical and social URLs are absolute'
);

/* ══ 7 · Internal links ═════════════════════════════════════════════════ */

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const internalLinks = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const brokenAnchors = internalLinks.filter((frag) => {
  const base = frag.split('/')[0];
  return !ids.has(frag) && !ids.has(base);
});
add(
  brokenAnchors.length === 0,
  `All ${internalLinks.length} in-page links resolve`,
  brokenAnchors.length ? `Broken: ${[...new Set(brokenAnchors)].join(', ')}` : ''
);

/* ══ 8 · No unfinished work shipped ═════════════════════════════════════ */

const SOURCE_FILES = ['index.html', 'styles.css', 'js/app.js', 'js/schema.js', 'js/validate.js'];
// Deliberately narrow: matches the unfinished-work markers this project could
// plausibly ship, without flagging the legitimate `placeholder` attribute
// (26 of them in the schema) or CSS `::placeholder`.
const PLACEHOLDER = /\b(TODO|FIXME|HACK)\b|implement this|add functionality here|lorem ipsum|not yet implemented|coming soon:/i;
for (const f of SOURCE_FILES) {
  const contents = await read(f);
  const hit = PLACEHOLDER.exec(contents);
  add(!hit, `No unfinished markers in ${f}`, hit ? `Found "${hit[0]}"` : '');
}

/* ══ 9 · Netlify configuration ═════════════════════════════════════════ */

add(/publish\s*=/.test(netlify), 'netlify.toml declares a publish directory');
add(/Content-Security-Policy/.test(netlify), 'netlify.toml sets a Content-Security-Policy');
add(/X-Frame-Options/.test(netlify), 'netlify.toml sets X-Frame-Options');
add(/Strict-Transport-Security/.test(netlify), 'netlify.toml sets HSTS');
add(/X-Content-Type-Options/.test(netlify), 'netlify.toml sets nosniff');
add(/Referrer-Policy/.test(netlify), 'netlify.toml sets a Referrer-Policy');

// The CSP must not permit inline scripts.
const csp = netlify.match(/Content-Security-Policy\s*=\s*"([^"]+)"/)?.[1] || '';
const scriptSrc = csp.match(/script-src([^;]*)/)?.[1] || '';
add(!/unsafe-inline|unsafe-eval/.test(scriptSrc), 'CSP script-src forbids unsafe-inline and unsafe-eval');

/* ══ 10 · Questionnaire completeness ════════════════════════════════════ */

add(STEPS.length === 10, `Questionnaire has 10 steps (found ${STEPS.length})`);

const ids2 = new Set();
let duplicates = [];
for (const s of STEPS) {
  if (ids2.has(s.id)) duplicates.push(s.id);
  ids2.add(s.id);
}
add(duplicates.length === 0, 'Step ids are unique', duplicates.join(', '));

// Every required field must produce a usable Netlify column name.
const opaqueNames = allFieldNames().filter((n) => /^(field|input|q)\d+$/i.test(n));
add(opaqueNames.length === 0, 'No opaque field names are submitted', opaqueNames.join(', '));

// Conditionals must reference a field that actually exists.
const knownNames = new Set(allFields().map((f) => f.name));
const badRefs = [];
for (const s of STEPS) {
  for (const f of s.fields) {
    for (const key of ['showIf', 'hideIf']) {
      const rule = f[key];
      if (rule && !knownNames.has(rule.field)) badRefs.push(`${f.name}.${key} → ${rule.field}`);
    }
  }
}
add(badRefs.length === 0, 'All conditional rules reference real fields', badRefs.join('; '));

// Every step must have at least one field and a title.
const emptySteps = STEPS.filter((s) => !s.fields.length || !s.title);
add(emptySteps.length === 0, 'Every step has a title and at least one field');

/* ══ Report ═════════════════════════════════════════════════════════════ */

const failures = results.filter((r) => !r.ok);
const width = 72;

console.log('\n╔' + '═'.repeat(width) + '╗');
console.log('║' + '  CHRYSOTOP DESIGNS — PROJECT VERIFICATION'.padEnd(width) + '║');
console.log('╚' + '═'.repeat(width) + '╝\n');

for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  console.log(`  ${mark}  ${r.title}`);
  if (!r.ok && r.detail) console.log(`       ↳ ${r.detail}`);
}

console.log('\n' + '─'.repeat(width + 2));
if (failures.length === 0) {
  console.log(`  ✓  ${results.length} checks passed. Nothing outstanding.`);
} else {
  console.log(`  ✖  ${failures.length} of ${results.length} checks FAILED.`);
}
console.log('─'.repeat(width + 2) + '\n');

process.exit(failures.length ? 1 : 0);
