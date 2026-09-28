/* ============================================================================
 * Chrysotop Designs — Project Brief
 * js/validate.js · Pure validation helpers (no DOM, no side effects)
 * ----------------------------------------------------------------------------
 * Kept separate from js/app.js so the rules can be unit-tested in Node
 * (see tools/test-validation.mjs) and reasoned about independently of the UI.
 *
 * SECURITY NOTE
 * Every value here is treated as UNTRUSTED. Validation runs twice:
 *   1. In the browser, to give immediate, human-readable feedback.
 *   2. On Netlify's side, which is the authoritative check. The client is
 *      never the last line of defence.
 * ========================================================================== */

/* ── Normalisation ───────────────────────────────────────────────────────── */

/** Collapse whitespace and trim. Never throws on non-strings. */
export function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Multi-line-safe cleaning: keeps line breaks, trims each line. */
export function cleanMultiline(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strip characters that have no business in a submitted value.
 * Removes control characters (including null bytes) which are a common vector
 * for log injection and header manipulation.
 */
export function stripControl(value) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** Full pipeline for a single-line text value. */
export function sanitiseText(value, maxLength = 500) {
  const out = stripControl(clean(value));
  return maxLength ? out.slice(0, maxLength) : out;
}

/** Full pipeline for a multi-line value. */
export function sanitiseMultiline(value, maxLength = 2000) {
  const out = stripControl(cleanMultiline(value));
  return maxLength ? out.slice(0, maxLength) : out;
}

/* ── Primitive checks ────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@"'`<>\\,;:]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function isValidEmail(value) {
  const v = clean(value);
  if (!v || v.length > 160) return false;
  if (v.includes('..')) return false;
  return EMAIL_RE.test(v);
}

/** Loose international phone check. Deliberately permissive: formats vary. */
export function isValidPhone(value) {
  const v = clean(value);
  if (!v) return false;
  const digits = v.replace(/[^\d]/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  // Reject anything containing characters that aren't typical in a phone number
  return /^[+()\d\s.\-/]+$/.test(v);
}

/**
 * Accept a bare domain ("example.com"), a path, or a full URL.
 * Returns a normalised, safe https:// URL string, or null when invalid.
 *
 * SECURITY: We never hand the raw value to the DOM or to an href. The caller
 * gets back a URL that has passed protocol allow-listing, so javascript:,
 * data:, and vbscript: payloads cannot survive this function.
 */
export function normaliseUrl(value) {
  const raw = clean(value);
  if (!raw || raw.length > 300) return null;
  if (/[\s<>"'`\\]/.test(raw)) return null;

  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  // Protocol allow-list — the critical control.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname.includes('.')) return null;
  if (url.hostname.length > 253) return null;
  // Basic hostname sanity: no leading/trailing dot or hyphen per label
  const labels = url.hostname.split('.');
  if (labels.some((l) => !l || l.length > 63 || l.startsWith('-') || l.endsWith('-'))) return null;

  url.protocol = 'https:';
  return url.toString();
}

export function isSafeUrl(value) {
  return normaliseUrl(value) !== null;
}

/** Parse a block of text into a list of URLs (one per line, or comma separated). */
export function extractUrls(value) {
  return cleanMultiline(value)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normaliseUrl(s))
    .filter(Boolean);
}

/** Accepts YYYY-MM-DD and confirms it is a real calendar date in the future. */
export function isValidFutureDate(value, today = new Date()) {
  const v = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return false;
  const floor = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return date.getTime() >= floor.getTime();
}

/** Colour inputs must be a 6-digit hex; anything else is discarded. */
export function normaliseHex(value) {
  const v = clean(value).toLowerCase();
  if (!v) return '';
  const m = /^#?([0-9a-f]{6})$/.exec(v);
  if (m) return `#${m[1]}`;
  const short = /^#?([0-9a-f]{3})$/.exec(v);
  if (short) return `#${short[1].split('').map((c) => c + c).join('')}`;
  return '';
}

/* ── Field-level validation ──────────────────────────────────────────────── */

/**
 * Validate one field against its schema definition.
 * @returns {string} An empty string when valid, otherwise a human-readable message.
 */
export function validateField(field, rawValue, ctx = {}) {
  const { allValues = {}, today = new Date() } = ctx;
  const isMulti = field.type === 'checkbox';

  const values = isMulti
    ? (Array.isArray(rawValue) ? rawValue.filter((v) => clean(v) !== '') : [])
    : [];

  const value = isMulti ? '' : (typeof rawValue === 'string' ? rawValue : '');
  const c = isMulti ? '' : clean(value);

  /* Required rules ------------------------------------------------------- */
  if (field.required) {
    if (isMulti && values.length === 0) {
      return 'Please choose at least one option.';
    }
    if (!isMulti) {
      const empty = field.type === 'toggle' ? !rawValue : c === '';
      if (empty) {
        if (field.type === 'toggle') return 'Please tick this box to continue.';
        return `Please enter your ${field.label.replace(/\?$/, '').toLowerCase()}.`;
      }
    }
  }

  // Nothing further to check when the field is empty and optional
  if (!isMulti && c === '' && field.type !== 'toggle') return '';

  /* Type-specific rules --------------------------------------------------- */
  switch (field.type) {
    case 'email':
      if (!isValidEmail(c)) return 'That email address does not look right — please check it.';
      break;

    case 'tel':
      if (!isValidPhone(c)) return 'Please enter a valid phone number, including the country code if you can.';
      break;

    case 'url':
      if (!isSafeUrl(c)) return 'Please enter a valid web address, for example yourbusiness.com';
      break;

    case 'date':
      if (!isValidFutureDate(c, today)) return 'Please choose a date from today onwards.';
      break;

    case 'text':
    case 'textarea': {
      if (field.minlength && c.length < field.minlength) {
        const remaining = field.minlength - c.length;
        return `A little more detail please — about ${remaining} more character${remaining === 1 ? '' : 's'}.`;
      }
      if (field.maxlength && c.length > field.maxlength) {
        return `Please shorten this to ${field.maxlength} characters or fewer.`;
      }
      break;
    }

    case 'select':
    case 'radio': {
      if (!field.required) break;
      const allowed = (field.options || []).map((o) => String(o.value));
      if (allowed.length && !allowed.includes(c)) return 'Please choose one of the listed options.';
      break;
    }

    default:
      break;
  }

  /* Cross-field rules ----------------------------------------------------- */
  if (field.name === 'email' && ctx.emailOf) {
    // Reserved for future cross-field checks; kept explicit for clarity.
  }

  return '';
}

/* ── Step-level validation ───────────────────────────────────────────────── */

/**
 * Validate every visible field in a step.
 * @returns {Object} map of fieldName → message (only invalid fields included)
 */
export function validateStep(step, fields, values, ctx = {}) {
  const errors = {};
  for (const field of fields) {
    if (field.type === 'assetmatrix') {
      for (const row of field.rows_assets) {
        const rowField = { name: row.name, label: row.label, type: 'radio', required: true, options: field.options };
        const msg = validateField(rowField, values[row.name] ?? '', ctx);
        if (msg) errors[row.name] = msg;
      }
      continue;
    }
    const msg = validateField(field, values[field.name] ?? (field.type === 'checkbox' ? [] : ''), ctx);
    if (msg) errors[field.name] = msg;
  }
  return errors;
}
