/* ============================================================================
 * Chrysotop Designs — Project Brief
 * js/app.js · Application: state, rendering, navigation, review, submission
 * ----------------------------------------------------------------------------
 * Data lives in js/schema.js. Validation rules live in js/validate.js.
 * This file wires them to the document.
 *
 * SECURITY POSTURE
 *  • Untrusted values are only ever inserted into the DOM via textContent or
 *    form-control `value` properties — never through innerHTML.
 *  • innerHTML is used only for build-time constant markup (icons, skeletons).
 *  • URLs are normalised and protocol-checked in js/validate.js before use.
 *  • No credentials, keys, or secrets exist in this file or anywhere in the
 *    client bundle. Submission goes to Netlify Forms, which handles it.
 * ========================================================================== */

import { META, STEPS, allFields, REVIEW_GROUPS } from './schema.js';
import {
  validateField, validateStep, sanitiseText, sanitiseMultiline,
  extractUrls, normaliseUrl, normaliseHex, clean,
} from './validate.js';

/* ══════════════════════════════════════════════════════════════════════════
   1. Micro DOM helpers
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Element factory. Text children are always assigned with textContent.
 * @param {string} tag
 * @param {Object} [props]  className, dataset, attrs, on:{}, and any DOM prop
 * @param {Array|Node|string} [children]
 */
function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(props)) {
    if (val === null || val === undefined || val === false) continue;

    if (key === 'class') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key === 'attrs') {
      for (const [a, v] of Object.entries(val)) {
        if (v === null || v === undefined || v === false) continue;
        el.setAttribute(a, v === true ? '' : String(v));
      }
    } else if (key === 'on') {
      for (const [evt, fn] of Object.entries(val)) el.addEventListener(evt, fn);
    } else if (key === 'text') {
      el.textContent = String(val);
    } else {
      el[key] = val;
    }
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Build an element from a developer-authored, constant HTML string. */
function fromHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html;              // constant input only — never user data
  return t.content.firstElementChild;
}

/* ── Icon set: consistent 24×24 stroke geometry, no emoji ────────────────── */

const ICON_PATHS = {
  target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  mail:      '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7.5 12 13l8.5-5.5"/>',
  bag:       '<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  spark:     '<path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/><path d="M6.7 6.7l3 3M14.3 14.3l3 3M17.3 6.7l-3 3M9.7 14.3l-3 3"/>',
  grid:      '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  shield:    '<path d="M12 3.5 5 6.5v5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9v-5l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.4-3.6"/>',
  calendar:  '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>',
  phone:     '<path d="M7 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 5.5 5.7 2 2 0 0 1 7 3.5Z"/>',
  store:     '<path d="M4 9.5h16V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V9.5Z"/><path d="M3.2 9.5 5 4.5h14l1.8 5"/><path d="M9.5 20.5v-6h5v6"/>',
  globe:     '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5S14.4 18.1 12 20.5c-2.4-2.4-3.6-5.4-3.6-8.5S9.6 5.9 12 3.5Z"/>',
  info:      '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  plus:      '<path d="M12 5.5v13M5.5 12h13"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>',
  building:  '<path d="M5 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9.5h3.5a1 1 0 0 1 1 1v10M3.5 20.5h17"/><path d="M8 7h1.5M11 7h1M8 10.5h1.5M11 10.5h1M8 14h1.5M11 14h1"/>',
  cup:       '<path d="M5 5.5h11v6a5.5 5.5 0 0 1-11 0v-6Z"/><path d="M16 7.5h1.8a2.7 2.7 0 0 1 0 5.4H16"/><path d="M4 20.5h13"/>',
  home:      '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z"/><path d="M9.5 20.5v-6h5v6"/>',
  users:     '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.7a3.2 3.2 0 0 1 0 5.6M17 14.4a5.5 5.5 0 0 1 3.5 5.1"/>',
  pen:       '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z"/><path d="m14.5 7 3 3"/>',
  user:      '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0"/>',
  clock:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
  cart:      '<circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/><path d="M3 4h2.2l2.3 10.2h10.2L20 7.5H6"/>',
  card:      '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M6.5 14.5h3"/>',
  send:      '<path d="M20.5 3.5 3.5 10.4l6.4 2.7 2.7 6.4L20.5 3.5Z"/><path d="m9.9 13.1 4.4-4.4"/>',
  key:       '<circle cx="8" cy="15.5" r="3.5"/><path d="m10.6 13 8-8M16.5 7.2 19 9.7M14.2 9.5 16.7 12"/>',
  quote:     '<path d="M9 6.5C6.5 7.6 5 9.8 5 12.4v5.1h5.4v-5.4H7.8c0-1.7.9-3 2.4-3.7L9 6.5Z"/><path d="M19 6.5c-2.5 1.1-4 3.3-4 5.9v5.1h5.4v-5.4h-2.6c0-1.7.9-3 2.4-3.7L19 6.5Z"/>',
  image:     '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4.5 17 4.6-4.3 3.4 3 2.7-2.3 4.3 3.9"/>',
  pin:       '<path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.4"/>',
  share:     '<circle cx="17.5" cy="6.5" r="2.6"/><circle cx="6.5" cy="12" r="2.6"/><circle cx="17.5" cy="17.5" r="2.6"/><path d="m9 10.8 6-2.7M9 13.2l6 2.7"/>',
  search:    '<circle cx="11" cy="11" r="6"/><path d="m15.6 15.6 4 4"/>',
  chat:      '<path d="M20 12.5c0 3.9-3.6 7-8 7a9 9 0 0 1-2.4-.3L5 21l1.3-3.4A6.6 6.6 0 0 1 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z"/>',
  star:      '<path d="m12 4 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 4Z"/>',
  chart:     '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 20v-6M12.5 20V8M17 20v-9"/>',
  check:     '<path d="m5 12.5 4.5 4.5L19 7"/>',
  refresh:   '<path d="M20 11.5a8 8 0 1 0-2.4 6.1"/><path d="M20 5.5v6h-6"/>',
  half:      '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/>',
  help:      '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 16.4v.2"/>',
  whatsapp:  '<path d="M12 3.8a8.2 8.2 0 0 0-7 12.5L4 20.2l4-1.1A8.2 8.2 0 1 0 12 3.8Z"/><path d="M9.2 8.6c.3-.6 1.3-.4 1.5.2l.4 1.2-.7.7a4.6 4.6 0 0 0 2.2 2.2l.7-.7 1.2.4c.6.2.8 1.2.2 1.5-1 .6-2.3.3-3.6-.7a8 8 0 0 1-2.6-3.1c-.4-1-.4-1.9.2-2.5Z"/>',
  arrowL:    '<path d="M14.5 6 8.5 12l6 6"/>',
  arrowR:    '<path d="M9.5 6l6 6-6 6"/>',
  close:     '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  edit:      '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z"/><path d="m14.5 7 3 3"/>',
  alert:     '<path d="M12 4.5 3 19.5h18L12 4.5Z"/><path d="M12 10v4M12 16.8v.2"/>',
  lifebuoy:  '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/><path d="m6 6 3.6 3.6M14.4 14.4 18 18M18 6l-3.6 3.6M9.6 14.4 6 18"/>',
};

/** Returns a decorative SVG icon element (aria-hidden: text always carries meaning). */
function icon(name, size = 20) {
  const paths = ICON_PATHS[name] || ICON_PATHS.spark;
  const el = fromHTML(
    `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${paths}</svg>`
  );
  return el;
}

/* ══════════════════════════════════════════════════════════════════════════
   2. State
   ══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'chrysotop.brief.draft.v1';
const SUBMIT_KEY = 'chrysotop.brief.submitted.v1';

const state = {
  stepIndex: 0,
  values: {},
  errors: {},
  touched: {},
  maxVisited: 0,
  submitting: false,
  submitted: false,
  submissionId: '',
  lastError: '',
  editingFromReview: false,
  editingStepIndex: null,
};

const FIELDS = allFields();

/** All field definitions for a given step id, including synthetic matrix rows. */
function fieldsForStep(stepId) {
  const step = STEPS.find((s) => s.id === stepId);
  return step ? step.fields : [];
}

/* ── Persistence ─────────────────────────────────────────────────────────── */

function saveDraft() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      values: state.values,
      stepIndex: state.stepIndex,
      maxVisited: state.maxVisited,
      submissionId: state.submissionId,
    }));
  } catch {
    /* Storage can be unavailable (private mode, quota). The brief still works. */
  }
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
}

/** Stable id for this enquiry, used to spot accidental duplicates server-side. */
function ensureSubmissionId() {
  if (state.submissionId) return state.submissionId;
  const stored = (() => {
    try { return sessionStorage.getItem(SUBMIT_KEY); } catch { return null; }
  })();
  const id = (stored && /^[A-Za-z0-9-]{8,64}$/.test(stored))
    ? stored
    : (crypto?.randomUUID?.() || `cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  state.submissionId = id;
  try { sessionStorage.setItem(SUBMIT_KEY, id); } catch { /* no-op */ }
  return id;
}

/* ══════════════════════════════════════════════════════════════════════════
   3. Conditional logic
   ══════════════════════════════════════════════════════════════════════════ */

function asArray(v) { return Array.isArray(v) ? v : (v === undefined || v === '' ? [] : [v]); }

/** Evaluate a `showIf` / `hideIf` rule against current values. */
function matches(rule, values) {
  if (!rule) return true;
  const current = values[rule.field];

  if (Array.isArray(rule.in)) {
    if (Array.isArray(current)) return current.some((c) => rule.in.includes(c));
    return rule.in.includes(current);
  }
  if (Array.isArray(rule.includesAny)) {
    return asArray(current).some((c) => rule.includesAny.includes(c));
  }
  if (rule.checked === true) return Boolean(current);
  if (rule.checked === false) return !current;
  if (rule.equals !== undefined) return current === rule.equals;
  return true;
}

/** Is this field currently visible, given the rest of the answers? */
function isVisible(field, values) {
  if (field.showIf && !matches(field.showIf, values)) return false;
  if (field.hideIf && matches(field.hideIf, values)) return false;
  return true;
}

/** Every field in a step that is currently visible (matrix rows expanded). */
function visibleFields(stepId, values) {
  const out = [];
  for (const f of fieldsForStep(stepId)) {
    if (!isVisible(f, values)) continue;
    if (f.type === 'assetmatrix') {
      for (const row of f.rows_assets) {
        out.push({ name: row.name, label: row.label, type: 'radio', required: true, options: f.options, fromMatrix: true });
      }
      continue;
    }
    out.push(f);
  }
  return out;
}

/**
 * Fields that stay in the submission even when their question is hidden.
 *
 * `whatsapp` is hidden when the visitor confirms their WhatsApp number matches
 * their phone number. The value is still worth sending: the owner gets a
 * usable number on the submission rather than a Yes/No flag they have to
 * interpret. `handleDependentFields` keeps it mirrored to the phone number.
 */
const ALWAYS_SUBMIT = new Set(['whatsapp']);

/** Drop answers whose questions are no longer visible, so stale data is never sent. */
function pruneHidden(values) {
  const keep = new Set();
  for (const step of STEPS) {
    for (const f of visibleFields(step.id, values)) keep.add(f.name);
  }
  const pruned = {};
  for (const [k, v] of Object.entries(values)) {
    if (keep.has(k) || ALWAYS_SUBMIT.has(k)) pruned[k] = v;
  }
  return pruned;
}

/* ══════════════════════════════════════════════════════════════════════════
   4. Element references
   ══════════════════════════════════════════════════════════════════════════ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const el = {
  welcome:    $('#welcome'),
  brief:      $('#brief'),
  confirm:    $('#confirmation'),
  form:       $('#briefForm'),
  stepHost:   $('#stepHost'),
  railList:   $('#railList'),
  railBar:    $('#railBar'),
  stepCount:  $('#stepCount'),
  stepName:   $('#stepName'),
  progress:   $('#progress'),
  backBtn:    $('#backBtn'),
  nextBtn:    $('#nextBtn'),
  reviewHost: $('#reviewHost'),
  submitBtn:  $('#submitBtn'),
  formError:  $('#formError'),
  errorList:  $('#errorList'),
  liveStatus: $('#liveStatus'),
  review:     $('#review'),
  submitNote: $('#submitNote'),
};

/* ══════════════════════════════════════════════════════════════════════════
   5. Announcements (screen readers)
   ══════════════════════════════════════════════════════════════════════════ */

let announceTimer = null;
function announce(message, assertive = false) {
  if (!el.liveStatus) return;
  el.liveStatus.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  // Clearing first guarantees the change is announced even for repeated text.
  el.liveStatus.textContent = '';
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => { el.liveStatus.textContent = message; }, 60);
}

/* ══════════════════════════════════════════════════════════════════════════
   6. Rendering — controls
   ══════════════════════════════════════════════════════════════════════════ */

function fieldId(name) {
  return `f-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function errorId(name) { return `${fieldId(name)}-err`; }
function helpId(name)  { return `${fieldId(name)}-help`; }

function describedBy(field, hasError) {
  const ids = [];
  if (field.helper) ids.push(helpId(field.name));
  if (hasError) ids.push(errorId(field.name));
  return ids.length ? ids.join(' ') : null;
}

/**
 * A single mutually-exclusive card (radio) or multi-select card (checkbox).
 * @param {Array} [textNodes] Overrides the default label/description stack.
 */
function optionCard(field, opt, selected, textNodes = null) {
  const input = h('input', {
    type: field.type === 'checkbox' ? 'checkbox' : 'radio',
    name: field.name,
    value: String(opt.value),
    id: `${fieldId(field.name)}-${String(opt.value).replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    checked: Boolean(selected),
    class: 'opt__input',
  });

  input.addEventListener('change', () => {
    readControl(field, input);
    onValueChanged(field);
  });

  const body = h('span', { class: 'opt__body' }, [
    opt.icon ? h('span', { class: 'opt__icon' }, [icon(opt.icon, 18)]) : null,
    h('span', { class: 'opt__text' }, textNodes || [
      h('span', { class: 'opt__label', text: opt.label }),
      opt.desc ? h('span', { class: 'opt__desc', text: opt.desc }) : null,
    ]),
    h('span', { class: 'opt__tick' }, [icon('check', 14)]),
  ]);

  return h('label', { class: 'opt', attrs: { for: input.id } }, [input, body]);
}

/** Group of option cards laid out on a responsive grid. */
function optionGroup(field, value) {
  const cols = field.cols || 3;
  const selectedSet = new Set(asArray(value).map(String));
  const wrap = h('div', {
    class: `optgrid optgrid--c${cols}${field.budget ? ' optgrid--budget' : ''}`,
    attrs: {
      role: field.type === 'checkbox' ? 'group' : 'radiogroup',
      'aria-label': field.label,
    },
  });

  for (const opt of field.options) {
    const selected = selectedSet.has(String(opt.value));

    if (field.budget) {
      // Budget cards lead with the figure, then the tier name, then what it buys.
      const amountText = String(opt.amount || '').replace(/\{C\}/g, META.currency);
      wrap.append(optionCard(field, opt, selected, [
        h('span', { class: 'opt__amount', text: amountText }),
        h('span', { class: 'opt__label', text: opt.label }),
        opt.desc ? h('span', { class: 'opt__desc', text: opt.desc }) : null,
      ]));
    } else {
      wrap.append(optionCard(field, opt, selected));
    }
  }
  return wrap;
}

/** The asset readiness matrix rendered as compact segmented rows. */
function assetMatrix(field, values) {
  const wrap = h('div', { class: 'matrix', attrs: { role: 'group', 'aria-label': field.label } });

  for (const row of field.rows_assets) {
    const current = values[row.name] ?? '';
    const groupId = `matrix-${row.name}`;
    const seg = h('div', { class: 'matrix__seg', attrs: { role: 'radiogroup', 'aria-labelledby': `${groupId}-lbl` } });

    for (const opt of field.options) {
      const input = h('input', {
        type: 'radio', name: row.name, value: opt.value,
        id: `${groupId}-${opt.value}`,
        checked: current === opt.value,
        class: 'seg__input',
      });
      input.addEventListener('change', () => {
        state.values[row.name] = opt.value;
        clearFieldError(row.name);
        onValueChanged({ name: row.name, type: 'radio' });
      });
      seg.append(h('label', { class: 'seg__opt', attrs: { for: input.id } }, [
        input, h('span', { class: 'seg__txt', text: opt.label }),
      ]));
    }

    const err = h('p', {
      class: 'field__error', id: errorId(row.name), hidden: true,
      attrs: { role: 'alert' },
    });

    wrap.append(h('div', { class: 'matrix__row' }, [
      h('span', { class: 'matrix__label', id: `${groupId}-lbl`, text: row.label }),
      seg,
      err,
    ]));
  }
  return wrap;
}

/** A checkbox presented as a switch, for single boolean answers. */
function toggleField(field, value) {
  const id = fieldId(field.name);
  const input = h('input', { type: 'checkbox', class: 'switch__input', id, name: field.name, checked: Boolean(value) });
  input.addEventListener('change', () => {
    state.values[field.name] = input.checked;
    clearFieldError(field.name);
    onValueChanged(field);
  });

  return h('div', { class: 'switch' }, [
    h('label', { class: 'switch__row', attrs: { for: id, 'aria-describedby': describedBy(field, Boolean(state.errors[field.name])) || null } }, [
      input,
      h('span', { class: 'switch__track', attrs: { 'aria-hidden': 'true' } }, [h('span', { class: 'switch__dot' })]),
      h('span', { class: 'switch__label', text: field.label }),
    ]),
  ]);
}

/** Standard text-like input. */
function textInput(field, value) {
  const type = field.type === 'color' ? 'color' : field.type;
  const props = {
    type,
    id: fieldId(field.name),
    name: field.name,
    class: field.type === 'color' ? 'input input--color' : 'input',
    value: value ?? '',
    placeholder: field.placeholder || '',
    autocomplete: field.autocomplete || 'off',
    inputMode: field.inputmode || (type === 'tel' ? 'tel' : null),
    maxLength: field.maxlength || null,
    minLength: field.minlength || null,
  };

  const input = h('input', props);
  input.addEventListener('input', () => {
    state.values[field.name] = input.type === 'color' ? input.value : input.value;
    if (state.errors[field.name]) liveValidate(field, input);
    onValueChanged(field, { silent: true });
  });
  input.addEventListener('blur', () => {
    state.touched[field.name] = true;
    liveValidate(field, input);
  });
  return input;
}

function textareaField(field, value) {
  const input = h('textarea', {
    id: fieldId(field.name), name: field.name, class: 'input input--area',
    rows: field.rows || 4, placeholder: field.placeholder || '',
    maxLength: field.maxlength || null,
  });
  input.value = value ?? '';

  const counter = field.counter && field.maxlength
    ? h('span', { class: 'counter', attrs: { 'aria-hidden': 'true' } })
    : null;

  const sync = () => {
    if (counter) counter.textContent = `${input.value.length} / ${field.maxlength}`;
  };
  sync();

  input.addEventListener('input', () => {
    state.values[field.name] = input.value;
    sync();
    if (state.errors[field.name]) liveValidate(field, input);
    onValueChanged(field, { silent: true });
  });
  input.addEventListener('blur', () => {
    state.touched[field.name] = true;
    liveValidate(field, input);
  });

  return h('div', { class: 'field__areawrap' }, [input, counter]);
}

function selectField(field, value) {
  const select = h('select', { id: fieldId(field.name), name: field.name, class: 'input input--select' }, [
    h('option', { value: '', text: field.placeholder || 'Choose one' }),
    ...field.options.map((o) => h('option', { value: String(o.value), text: o.label })),
  ]);
  select.value = value ?? '';
  select.addEventListener('change', () => {
    state.values[field.name] = select.value;
    if (state.errors[field.name]) liveValidate(field, select);
    onValueChanged(field);
  });
  select.addEventListener('blur', () => { state.touched[field.name] = true; liveValidate(field, select); });
  return select;
}

/** Dispatch to the right control renderer. */
function controlFor(field, values) {
  const value = values[field.name];
  switch (field.type) {
    case 'textarea':   return textareaField(field, value);
    case 'select':     return selectField(field, value);
    case 'radio':
    case 'checkbox':   return optionGroup(field, value);
    case 'toggle':     return toggleField(field, value);
    case 'assetmatrix':return assetMatrix(field, values);
    default:           return textInput(field, value);
  }
}

/**
 * Read a control's value back into state. Used by option cards, where the
 * value comes from the changed input rather than from the DOM value property.
 */
function readControl(field, changedInput) {
  if (field.type === 'checkbox') {
    const all = $$(`input[name="${CSS.escape(field.name)}"]`, el.stepHost)
      .filter((i) => i.checked)
      .map((i) => i.value);
    state.values[field.name] = all;
  } else {
    state.values[field.name] = changedInput.value;
  }
}

/** Called whenever an answer changes: reseed conditionals, then re-render if needed. */
function onValueChanged(field, { silent = false } = {}) {
  handleDependentFields(field);
  if (!silent) refreshDependentVisibility();
  saveDraft();
  updateProgress();
}

/**
 * Keep paired answers consistent (e.g. WhatsApp number mirroring the phone).
 */
function handleDependentFields(field) {
  // Toggling "same as my phone number" copies the phone number across, so the
  // submission always carries a usable WhatsApp value.
  if (field.name === 'whatsapp_same_as_phone') {
    if (state.values.whatsapp_same_as_phone) {
      state.values.whatsapp = state.values.phone || '';
    }
    refreshDependentVisibility();
    return;
  }
  // Editing the phone number updates the mirrored WhatsApp value.
  if (field.name === 'phone' && state.values.whatsapp_same_as_phone) {
    state.values.whatsapp = state.values.phone || '';
  }
}

/**
 * Re-render the current step when a conditional question must appear or
 * disappear. Focus is preserved so the user is never thrown out of position.
 */
let reRenderScheduled = false;
function refreshDependentVisibility() {
  if (reRenderScheduled) return;
  reRenderScheduled = true;
  requestAnimationFrame(() => {
    reRenderScheduled = false;
    const active = document.activeElement;
    const focusName = active && active.name ? active.name : null;
    const step = STEPS[state.stepIndex];
    const wanted = visibleFields(step.id, state.values).map((f) => f.name).join('|');
    if (state.__visibleSig !== wanted) {
      state.__visibleSig = wanted;
      renderStep({ keepFocus: focusName, scroll: false });
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   7. Rendering — step
   ══════════════════════════════════════════════════════════════════════════ */

function fieldWrapper(field, control, values) {
  const name = field.name;
  const hasError = Boolean(state.errors[name]);
  const id = fieldId(name);

  /*
   * Group controls label themselves (each card carries its own text), so they
   * get an invisible group label for assistive tech instead of a visible one.
   * A toggle is also its own label — the switch row already renders it — so it
   * must be excluded here or the question would appear twice.
   */
  const selfLabelled = field.type === 'radio' || field.type === 'checkbox'
    || field.type === 'assetmatrix' || field.type === 'toggle';

  let labelNode = null;
  if (field.type === 'toggle') {
    // The switch row is a <label> wrapping the input, so it already supplies
    // the accessible name. Adding a second label here would duplicate it.
    labelNode = null;
  } else if (selfLabelled) {
    labelNode = h('span', { class: 'field__label field__label--group', id: `${id}-lbl`, text: field.label });
  } else {
    labelNode = h('label', { class: 'field__label', attrs: { for: id } }, [
      field.label,
      field.optional ? h('span', { class: 'field__opt', text: 'Optional' }) : null,
    ]);
  }

  const helper = field.helper
    ? h('p', { class: 'field__helper', id: helpId(name), text: field.helper })
    : null;

  const errorEl = h('p', {
    class: 'field__error', id: errorId(name), attrs: { role: 'alert' },
    hidden: !hasError, text: hasError ? state.errors[name] : '',
  });

  return h('div', {
    class: `field field--${field.type}${field.wide ? ' field--wide' : ''}${hasError ? ' is-invalid' : ''}`,
    dataset: { field: name },
  }, [
    labelNode,
    helper,
    control,
    errorEl,
  ]);
}

function renderStep({ keepFocus = null, scroll = true, autofocus = false } = {}) {
  const step = STEPS[state.stepIndex];
  el.stepHost.replaceChildren();

  const visible = visibleFields(step.id, state.values);
  const grid = h('div', { class: 'fieldgrid' });

  let currentGroup = null;
  for (const field of step.fields) {
    if (!isVisible(field, state.values)) continue;

    if (field.group && field.group !== currentGroup) {
      currentGroup = field.group;
      grid.append(h('div', { class: 'fieldgroup__head field--wide' }, [
        h('span', { class: 'fieldgroup__rule' }),
        h('span', { class: 'fieldgroup__title', text: field.group }),
      ]));
    } else if (!field.group) {
      currentGroup = null;
    }

    const control = controlFor(field, state.values);
    grid.append(fieldWrapper(field, control, state.values));
  }

  const head = h('header', { class: 'step__head' }, [
    h('p', { class: 'step__eyebrow' }, [
      h('span', { class: 'step__num', text: step.num }),
      h('span', { class: 'step__of', text: `Step ${state.stepIndex + 1} of ${STEPS.length}` }),
    ]),
    h('h2', { class: 'step__title', attrs: { id: 'stepTitle', tabindex: '-1' }, text: step.title }),
    step.lede ? h('p', { class: 'step__lede', text: step.lede }) : null,
    step.note ? h('p', { class: 'step__note' }, [icon('lifebuoy', 17), h('span', { text: step.note })]) : null,
  ]);

  el.stepHost.append(head, grid);

  if (scroll) window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  // Focus management: continue where the user left off, else land on the heading.
  if (keepFocus) {
    const next = el.stepHost.querySelector(`[name="${CSS.escape(keepFocus)}"]`);
    if (next) { if (next.type !== 'hidden') next.focus({ preventScroll: true }); return; }
  }
  if (autofocus) {
    const first = el.stepHost.querySelector('input:not([type="hidden"]), textarea, select');
    if (first) { first.focus({ preventScroll: true }); return; }
  }
  const heading = el.stepHost.querySelector('#stepTitle');
  if (heading) heading.focus({ preventScroll: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   8. Validation display
   ══════════════════════════════════════════════════════════════════════════ */

function clearFieldError(name) {
  if (!state.errors[name]) return;
  delete state.errors[name];
  const wrap = el.stepHost.querySelector(`[data-field="${CSS.escape(name)}"]`);
  if (wrap) {
    wrap.classList.remove('is-invalid');
    const p = wrap.querySelector('.field__error');
    if (p) { p.hidden = true; p.textContent = ''; }
  }
  updateErrorSummary();
}

function setFieldError(name, message) {
  state.errors[name] = message;
  const wrap = el.stepHost.querySelector(`[data-field="${CSS.escape(name)}"]`);
  if (!wrap) return;
  wrap.classList.add('is-invalid');
  const p = wrap.querySelector('.field__error');
  if (p) { p.hidden = false; p.textContent = message; }
}

/** Validate one field as the user interacts with it, once they've engaged. */
function liveValidate(field, control) {
  const value = field.type === 'checkbox' ? asArray(state.values[field.name]) : (state.values[field.name] ?? '');
  const msg = validateField(field, value, { allValues: state.values });
  if (msg) { setFieldError(field.name, msg); control?.setAttribute('aria-invalid', 'true'); }
  else {
    clearFieldError(field.name);
    control?.removeAttribute('aria-invalid');
  }
  updateErrorSummary();
}

/** The error summary shown above the step after a failed "Continue". */
function updateErrorSummary() {
  const entries = Object.entries(state.errors);
  if (!entries.length) {
    el.formError.hidden = true;
    el.errorList.replaceChildren();
    return;
  }
  el.errorList.replaceChildren(
    ...entries.map(([name, msg]) => {
      const field = FIELDS.find((f) => f.name === name) || { name, label: name };
      const label = field.label || name;
      const anchor = h('a', {
        class: 'errorlist__link',
        href: `#${fieldId(name)}`,
        text: `${label}: ${msg}`,
      });
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        focusFirstControl(name);
      });
      return h('li', { class: 'errorlist__item' }, [anchor]);
    })
  );
  el.formError.hidden = false;
}

/** Focus the first focusable control belonging to a field, and scroll to it. */
function focusFirstControl(name) {
  const wrap = el.stepHost.querySelector(`[data-field="${CSS.escape(name)}"]`);
  if (!wrap) return;
  const control = wrap.querySelector('input:not([type=hidden]), textarea, select, button');
  if (control) {
    control.focus({ preventScroll: true });
    wrap.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    wrap.classList.add('is-flash');
    window.setTimeout(() => wrap.classList.remove('is-flash'), 900);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   9. Progress
   ══════════════════════════════════════════════════════════════════════════ */

function buildRail() {
  el.railList.replaceChildren(
    ...STEPS.map((step, i) => {
      const btn = h('button', {
        type: 'button',
        class: 'rail__chip',
        dataset: { index: String(i) },
        attrs: {
          'aria-current': i === state.stepIndex ? 'step' : null,
          'aria-label': `Step ${i + 1}: ${step.label}`,
        },
      }, [
        h('span', { class: 'rail__num', text: step.num }),
        h('span', { class: 'rail__label', text: step.label }),
      ]);
      btn.addEventListener('click', () => {
        // Only allow jumping to steps already reached — no skipping ahead.
        if (i <= state.maxVisited) goTo(i);
        else announce('Please complete the current step first.', true);
      });
      return btn;
    })
  );
}

function updateProgress() {
  const step = STEPS[state.stepIndex];
  const pct = ((state.stepIndex + 1) / STEPS.length) * 100;

  el.railBar.style.setProperty('--pct', `${pct}%`);
  el.railBar.setAttribute('aria-valuenow', String(state.stepIndex + 1));
  el.stepCount.textContent = `Step ${state.stepIndex + 1} of ${STEPS.length}`;
  el.stepName.textContent = step.label;

  $$('.rail__chip', el.railList).forEach((chip, i) => {
    chip.classList.toggle('is-current', i === state.stepIndex);
    chip.classList.toggle('is-done', i < state.stepIndex || (i <= state.maxVisited && hasAnswersFor(STEPS[i].id)));
    chip.toggleAttribute('aria-current', i === state.stepIndex);
    if (i === state.stepIndex) chip.setAttribute('aria-current', 'step');
  });

  const active = el.railList.querySelector('.rail__chip.is-current');
  if (active && el.railList.scrollWidth > el.railList.clientWidth) {
    active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}

function hasAnswersFor(stepId) {
  return visibleFields(stepId, state.values).some((f) => {
    const v = state.values[f.name];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== '';
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   10. Navigation
   ══════════════════════════════════════════════════════════════════════════ */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Marketing sections above the brief. Once the visitor commits to the brief we
 * hide these so the page becomes a single, focused task — and so that stepping
 * forward or submitting never leaves them staring at the hero they scrolled
 * past ten minutes ago.
 */
function marketingSections() {
  return Array.from(document.querySelectorAll('[data-marketing]'));
}

/**
 * Toggle between the marketing page and focus mode.
 *
 * In focus mode the header nav and header CTA are hidden (via `is-focus-mode`
 * in styles.css) because they point at sections that are no longer on the
 * page — leaving them visible would present controls that appear broken. The
 * brief and the confirmation each carry their own, context-appropriate actions.
 */
function setMarketingVisible(visible) {
  for (const node of marketingSections()) node.hidden = !visible;
  document.body.classList.toggle('is-focus-mode', !visible);
}

/** Put a section at the top of the viewport without moving keyboard focus. */
function scrollSectionIntoView(node) {
  if (!node) return;
  const top = node.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** Height of the sticky header, so anchored sections are not hidden beneath it. */
function headerOffset() {
  const bar = document.getElementById('topbar');
  return (bar ? bar.getBoundingClientRect().height : 66) + 8;
}

function goTo(index, { skipValidation = false, direction = 1 } = {}) {
  const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
  state.stepIndex = clamped;
  state.maxVisited = Math.max(state.maxVisited, clamped);
  state.errors = {};

  const reduce = prefersReducedMotion();
  el.stepHost.dataset.dir = direction >= 0 ? 'forward' : 'back';
  el.stepHost.classList.remove('is-entering');
  if (!reduce) {
    // Restart the entrance animation without forcing a layout thrash.
    void el.stepHost.offsetWidth;
    el.stepHost.classList.add('is-entering');
  }

  renderStep({ autofocus: !skipValidation && direction > 0 });

  // Keep the visibility signature aligned with what is now on screen, so the
  // next answer change re-renders only when it genuinely alters the form.
  state.__visibleSig = visibleFields(STEPS[clamped].id, state.values).map((f) => f.name).join('|');

  buildRail();
  updateProgress();
  updateErrorSummary();
  setNavState();
  saveDraft();

  // Push history so the browser Back button moves through the brief rather
  // than leaving the site — this is the "accidental navigation" guard.
  const hash = `#brief/${STEPS[clamped].id}`;
  if (window.location.hash !== hash) history.pushState({ step: clamped }, '', hash);
}

function setNavState() {
  el.backBtn.hidden = state.stepIndex === 0;
  const label = state.editingFromReview
    ? 'Save and return to review'
    : (state.stepIndex === STEPS.length - 1 ? 'Review your brief' : 'Continue');
  el.nextBtn.querySelector('.btn__label').textContent = label;
}

/** Advance one step, validating first. */
function next() {
  const step = STEPS[state.stepIndex];
  const visible = visibleFields(step.id, state.values);
  const errors = {};

  for (const field of visible) {
    const raw = state.values[field.name];
    const msg = validateField(field, field.type === 'checkbox' ? asArray(raw) : (raw ?? ''), { allValues: state.values });
    if (msg) errors[field.name] = msg;
  }

  state.errors = errors;

  if (Object.keys(errors).length) {
    renderStep({ scroll: false });
    // Mark every offending control for assistive tech
    for (const name of Object.keys(errors)) {
      el.stepHost.querySelectorAll(`[name="${CSS.escape(name)}"]`)
        .forEach((c) => c.setAttribute('aria-invalid', 'true'));
    }
    updateErrorSummary();
    el.formError.focus?.();
    const first = el.formError.querySelector('.errorlist__link');
    announce(`There ${Object.keys(errors).length === 1 ? 'is 1 problem' : `are ${Object.keys(errors).length} problems`} with this step. Please review the highlighted fields.`, true);
    const firstField = Object.keys(errors)[0];
    window.requestAnimationFrame(() => {
      const wrap = el.stepHost.querySelector(`[data-field="${CSS.escape(firstField)}"]`);
      wrap?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
    // Move focus into the summary so keyboard and screen-reader users land on it.
    el.formError.setAttribute('tabindex', '-1');
    el.formError.focus({ preventScroll: true });
    return false;
  }

  clearDraftStage();

  /* When the visitor arrived here by pressing "Edit" on the review screen,
     Continue takes them straight back to the review rather than marching them
     through every remaining step again. Their place in the flow is preserved. */
  if (state.editingFromReview) {
    const returnStep = state.editingStepIndex ?? state.stepIndex;
    state.editingFromReview = false;
    state.editingStepIndex = null;
    showReview();
    buildRail();
    setNavState();
    // Return the visitor to the section they were reading, not the top.
    window.requestAnimationFrame(() => {
      const group = el.reviewHost.children[returnStep];
      if (group) group.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
    return true;
  }

  if (state.stepIndex === STEPS.length - 1) { showReview(); return true; }
  goTo(state.stepIndex + 1, { direction: 1 });
  return true;
}

function clearDraftStage() { /* reserved: hook for analytics or autosave */ }

function back() {
  if (state.stepIndex === 0) return;
  goTo(state.stepIndex - 1, { skipValidation: true, direction: -1 });
}

/* ══════════════════════════════════════════════════════════════════════════
   11. Review screen
   ══════════════════════════════════════════════════════════════════════════ */

/** Turn a stored value into something a human can read in the summary. */
function displayValue(field, value) {
  if (value === undefined || value === null || value === '') return '';
  if (field?.type === 'toggle') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.map((v) => labelFor(field, v)).join(', ');
  }
  return labelFor(field, value);
}

function labelFor(field, raw) {
  const opts = field?.options || [];
  const found = opts.find((o) => String(o.value) === String(raw));
  if (!found) return String(raw);
  // On the review screen a budget answer shows the tier and its figure, so the
  // client can confirm exactly what they selected. Only appended when the
  // amount contains an actual number — otherwise "Not sure yet" would read as
  // "Not sure yet (We will guide you)", which says the same thing twice.
  if (field?.budget) {
    const amount = String(found.amount || '').replace(/\{C\}/g, META.currency);
    return /\d/.test(amount) ? `${found.label} (${amount})` : found.label;
  }
  return found.label;
}

/** The option's visible label alone, with no added figures. Used for the email subject. */
function plainLabelFor(fieldName, raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  const field = FIELDS.find((f) => f.name === fieldName);
  const found = (field?.options || []).find((o) => String(o.value) === String(raw));
  return found ? found.label : '';
}

/** Field names a review group should show (matrix rows expand in place). */
function reviewItemsFor(stepId) {
  const items = [];
  for (const f of fieldsForStep(stepId)) {
    if (f.type === 'assetmatrix') {
      for (const row of f.rows_assets) {
        items.push({ name: row.name, label: row.label, options: f.options, type: 'radio' });
      }
      continue;
    }
    if (f.type === 'toggle') continue;                 // consent mirrors are noise in a summary
    if (f.name === 'whatsapp_same_as_phone') continue;
    items.push(f);
  }
  return items;
}

function showReview() {
  el.brief.classList.add('is-reviewing');
  el.form.hidden = true;
  el.review.hidden = false;
  el.progress.hidden = true;
  el.submitNote.hidden = false;

  renderReview();
  scrollSectionIntoView(el.review);
  const heading = el.review.querySelector('h2');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  announce('Review screen. Step 11 of 11. Please check your answers before sending.');
}

function renderReview() {
  el.reviewHost.replaceChildren();

  for (const group of REVIEW_GROUPS) {
    const step = STEPS.find((s) => s.id === group.id);
    if (!step) continue;

    const items = reviewItemsFor(step.id)
      .filter((f) => isVisible(f, state.values))
      .map((f) => ({ field: f, value: state.values[f.name] }))
      .filter(({ value }) => Array.isArray(value) ? value.length : (value !== undefined && value !== ''));

    const answered = items.length;
    const missing = reviewItemsFor(step.id)
      .filter((f) => isVisible(f, state.values) && f.required)
      .filter((f) => {
        const v = state.values[f.name];
        return Array.isArray(v) ? v.length === 0 : (v === undefined || v === '');
      }).length;

    const body = h('dl', { class: 'review__list' });

    if (!answered) {
      body.append(h('p', { class: 'review__empty', text: 'Nothing recorded for this section.' }));
    } else {
      for (const { field, value } of items) {
        const shown = displayValue(field, value);
        if (!shown) continue;
        body.append(h('dt', { class: 'review__key', text: field.label }));
        body.append(h('dd', { class: 'review__val', text: shown }));
      }
    }

    const index = STEPS.findIndex((s) => s.id === step.id);
    const edit = h('button', {
      type: 'button', class: 'review__edit',
      attrs: { 'aria-label': `Edit ${group.label}` },
    }, [icon('edit', 15), h('span', { text: 'Edit' })]);
    edit.addEventListener('click', () => {
      el.review.hidden = true;
      el.form.hidden = false;
      el.progress.hidden = false;
      el.submitNote.hidden = true;
      el.brief.classList.remove('is-reviewing');
      state.editingFromReview = true;
      state.editingStepIndex = REVIEW_GROUPS.findIndex((g) => g.id === step.id);
      goTo(index, { skipValidation: true, direction: -1 });
      announce(`Editing ${group.label}. Continue when you are done to return to the summary.`);
    });

    const panel = h('section', { class: 'review__group' }, [
      h('div', { class: 'review__grouphead' }, [
        h('h3', { class: 'review__grouptitle' }, [
          h('span', { class: 'review__groupnum', text: step.num }),
          h('span', { text: group.label }),
        ]),
        h('div', { class: 'review__groupmeta' }, [
          missing ? h('span', { class: 'review__flag', text: `${missing} still to answer` }) : null,
          edit,
        ]),
      ]),
      body,
    ]);
    el.reviewHost.append(panel);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   12. Submission
   ══════════════════════════════════════════════════════════════════════════ */

/** Build the exact payload Netlify will receive. Keys must match the hidden form. */
function buildPayload() {
  const values = pruneHidden(state.values);
  const data = new URLSearchParams();
  data.set('form-name', META.formName);
  data.set('bot-field', '');                     // honeypot: always empty for humans
  data.set('submission_id', ensureSubmissionId());
  data.set('submitted_at', new Date().toISOString());

  // Netlify uses a submitted `subject` field as the notification email subject.
  // Keep it short and scannable in a crowded inbox: who, what kind of site,
  // and roughly what budget. Deliberately uses the plain option label rather
  // than the budget card's "Tier (amount)" phrasing, which reads badly here.
  const who = sanitiseText(state.values.business_name || state.values.client_name || 'New enquiry', 80);
  const kind = plainLabelFor('website_type', state.values.website_type);
  const budget = plainLabelFor('budget_range', state.values.budget_range);
  const subjectParts = [`New project brief — ${who}`];
  if (kind) subjectParts.push(kind);
  if (budget) subjectParts.push(budget);
  data.set('subject', sanitiseText(subjectParts.join(' · '), 200));

  for (const field of FIELDS) {
    const name = field.name;
    if (!(name in values)) continue;
    const v = values[name];

    if (Array.isArray(v)) {
      const parts = v.map((x) => sanitiseText(x, 120)).filter(Boolean);
      if (parts.length) data.append(name, parts.join(', '));
      continue;
    }
    if (typeof v === 'boolean') {
      if (field.type === 'toggle') data.append(name, v ? 'Yes' : 'No');
      continue;
    }

    const isMultiline = field.type === 'textarea';
    const text = isMultiline
      ? sanitiseMultiline(v, field.maxlength || 2000)
      : sanitiseText(v, field.maxlength || 500);

    if (!text && !field.required) continue;

    // Normalise URLs so the owner receives a clickable, safe address.
    if (field.type === 'url' && text) {
      const url = normaliseUrl(text);
      data.append(name, url || text);
      continue;
    }
    if (field.type === 'color' && text) {
      const hex = normaliseHex(text);
      if (hex) data.append(name, hex);
      continue;
    }
    data.append(name, text);
  }

  return data;
}

/** Plain-text version of the brief, used for the email fallback. */
function buildPlainTextSummary() {
  const lines = [
    'PROJECT BRIEF — Chrysotop Designs',
    `Reference: ${ensureSubmissionId()}`,
    `Sent: ${new Date().toLocaleString()}`,
    '',
  ];
  for (const group of REVIEW_GROUPS) {
    const step = STEPS.find((s) => s.id === group.id);
    if (!step) continue;
    const items = reviewItemsFor(step.id)
      .filter((f) => isVisible(f, state.values))
      .map((f) => ({ f, shown: displayValue(f, state.values[f.name]) }))
      .filter(({ shown }) => shown);
    if (!items.length) continue;
    lines.push(`— ${group.label.toUpperCase()} —`);
    for (const { f, shown } of items) {
      const plain = String(shown).replace(/\n/g, '\n    ');
      lines.push(`${f.label}`, `    ${plain}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function setSubmitting(on) {
  state.submitting = on;
  el.submitBtn.disabled = on;
  el.submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
  el.submitBtn.classList.toggle('is-busy', on);
  el.submitBtn.querySelector('.btn__label').textContent = on ? 'Sending your brief…' : 'Send my project brief';
}

function showSubmitError(message, detail = '') {
  state.lastError = message;
  const box = $('#submitError');
  if (!box) return;

  const mailto = `mailto:chrysotopdesigns@gmail.com`
    + `?subject=${encodeURIComponent(`Project brief — ${state.values.business_name || 'New enquiry'} (ref ${state.submissionId})`)}`
    + `&body=${encodeURIComponent(buildPlainTextSummary())}`;

  box.replaceChildren(
    h('div', { class: 'alert__head' }, [icon('alert', 20), h('h3', { class: 'alert__title', text: message })]),
    detail ? h('p', { class: 'alert__body', text: detail }) : null,
    h('p', { class: 'alert__body', text: 'Your answers are still here — nothing has been lost. You can try again, or send the brief straight to us by email instead.' }),
    h('div', { class: 'alert__actions' }, [
      h('button', { type: 'button', class: 'btn btn--ghost', on: { click: () => { box.hidden = true; el.submitBtn.focus(); } } }, [
        h('span', { class: 'btn__label', text: 'Try again' }),
      ]),
      h('a', { class: 'btn btn--quiet', href: mailto, attrs: { rel: 'noopener' } }, [
        h('span', { class: 'btn__label', text: 'Send by email instead' }),
      ]),
    ])
  );
  box.hidden = false;
  box.setAttribute('tabindex', '-1');
  box.focus({ preventScroll: true });
  announce(message, true);
}

async function submitBrief(event) {
  event.preventDefault();

  if (state.submitting) return;                      // hard guard against double submits
  if (state.submitted) { showConfirmation(); return; }

  // Re-validate everything one final time — cheaper than a failed round trip.
  const problems = [];
  for (const step of STEPS) {
    const visible = visibleFields(step.id, state.values);
    for (const f of visible) {
      const raw = state.values[f.name];
      const msg = validateField(f, f.type === 'checkbox' ? asArray(raw) : (raw ?? ''), { allValues: state.values });
      if (msg) problems.push({ step: step.id, name: f.name, label: f.label, msg });
    }
  }

  if (problems.length) {
    state.errors = Object.fromEntries(problems.map((p) => [p.name, p.msg]));
    const firstStepIndex = STEPS.findIndex((s) => s.id === problems[0].step);
    showReview();
    renderReview();
    const banner = $('#reviewAlert');
    if (banner) {
      banner.replaceChildren(
        h('div', { class: 'alert__head' }, [icon('alert', 20), h('h3', { class: 'alert__title', text: 'A few answers still need your attention' })]),
        h('ul', { class: 'alert__list' }, problems.slice(0, 8).map((p) =>
          h('li', {}, [
            h('a', {
              href: '#', class: 'alert__link',
              text: `${p.label}: ${p.msg}`,
              on: {
                click: (e) => {
                  e.preventDefault();
                  el.review.hidden = true; el.form.hidden = false; el.progress.hidden = false;
                  el.submitNote.hidden = true;
                  el.brief.classList.remove('is-reviewing');
                  goTo(firstStepIndex === -1 ? STEPS.findIndex((s) => s.id === p.step) : STEPS.findIndex((s) => s.id === p.step), { skipValidation: true, direction: -1 });
                  window.setTimeout(() => focusFirstControl(p.name), 260);
                },
              },
            }),
          ])
        )),
        h('p', { class: 'alert__body', text: 'Everything else you entered is saved.' })
      );
      banner.hidden = false;
      banner.setAttribute('tabindex', '-1');
      banner.focus({ preventScroll: true });
    }
    announce('Some answers are incomplete. Please review the list.', true);
    return;
  }

  setSubmitting(true);
  const box = $('#submitError');
  if (box) box.hidden = true;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);

  try {
    const payload = buildPayload();
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: payload.toString(),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`The server responded with ${response.status}.`);
    }

    state.submitted = true;
    clearDraft();
    showConfirmation();
  } catch (err) {
    window.clearTimeout(timeout);
    const offline = !navigator.onLine;
    const timedOut = err?.name === 'AbortError';

    let message = 'We could not send your brief just now.';
    let detail = 'This is usually a temporary connection problem.';
    if (offline) { message = 'You appear to be offline.'; detail = 'Reconnect and try again — your answers are safe.'; }
    else if (timedOut) { message = 'The request took too long to complete.'; detail = 'The connection may be slow or unstable.'; }
    else if (err?.message) { detail = err.message; }

    showSubmitError(message, detail);
    setSubmitting(false);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   13. Confirmation
   ══════════════════════════════════════════════════════════════════════════ */

function showConfirmation() {
  el.brief.hidden = true;
  el.confirm.hidden = false;
  // The enquiry is finished: drop the marketing bands so the confirmation is
  // the whole page, and there is no stale hero above it.
  setMarketingVisible(false);
  window.scrollTo({ top: 0, behavior: 'auto' });

  const ref = $('#confirmRef');
  if (ref) {
    ref.replaceChildren(
      h('span', { class: 'confirm__reflabel', text: 'Your reference' }),
      h('code', { class: 'confirm__refcode', text: state.submissionId })
    );
  }

  const heading = el.confirm.querySelector('#confirmTitle');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  announce('Your project brief has been received. Thank you.');
  document.title = 'Brief received — Chrysotop Designs';
}

/* ══════════════════════════════════════════════════════════════════════════
   14. Bootstrap
   ══════════════════════════════════════════════════════════════════════════ */

function startBrief({ restart = false } = {}) {
  el.welcome.hidden = true;
  el.confirm.hidden = true;
  el.brief.hidden = false;
  // Focus mode: the brief replaces the marketing page rather than sitting
  // beneath it. Prevents "Continue" from scrolling back to the hero.
  setMarketingVisible(false);

  if (restart) {
    state.values = {};
    state.stepIndex = 0;
    state.maxVisited = 0;
    state.errors = {};
    state.submitted = false;
    state.submissionId = '';
    state.editingFromReview = false;
    state.editingStepIndex = null;
    try { sessionStorage.removeItem(SUBMIT_KEY); } catch { /* no-op */ }
    clearDraft();
  } else {
    const draft = loadDraft();
    if (draft && draft.values && typeof draft.values === 'object') {
      state.values = draft.values;
      state.stepIndex = Number.isInteger(draft.stepIndex) ? Math.min(draft.stepIndex, STEPS.length - 1) : 0;
      state.maxVisited = Number.isInteger(draft.maxVisited) ? draft.maxVisited : state.stepIndex;
      state.submissionId = typeof draft.submissionId === 'string' ? draft.submissionId : '';
    }
  }

  if (!state.submissionId) ensureSubmissionId();

  buildRail();
  // renderStep places focus on the step heading — the correct behaviour for a
  // change of context, so assistive tech announces the new section.
  renderStep({ scroll: false });
  state.__visibleSig = visibleFields(STEPS[state.stepIndex].id, state.values).map((f) => f.name).join('|');
  buildRail();
  updateProgress();
  setNavState();

  if (window.location.hash !== `#brief/${STEPS[state.stepIndex].id}`) {
    history.pushState({ step: state.stepIndex }, '', `#brief/${STEPS[state.stepIndex].id}`);
  }
  saveDraft();

  const restored = Object.keys(state.values).length > 0;
  if (restored) announce('Welcome back. Your previous answers have been restored.');
}

function init() {
  /* Welcome → brief.
     The triggers are anchors with href="#brief" so the page still works
     without JavaScript. With JavaScript we take over: letting the browser
     also follow the fragment would fire popstate and fight with the state
     machine for focus and history. */
  $$('[data-start]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    startBrief();
  }));

  /* Restart */
  $$('[data-restart]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    startBrief({ restart: true });
  }));

  /* Leave the confirmation and return to the marketing page. */
  $$('[data-return]').forEach((link) => link.addEventListener('click', (e) => {
    e.preventDefault();
    el.confirm.hidden = true;
    el.brief.hidden = true;
    el.welcome.hidden = false;
    setMarketingVisible(true);
    state.submitted = false;
    // Clear the completed enquiry so the site is not stuck behind a warning.
    try { sessionStorage.removeItem(SUBMIT_KEY); } catch { /* no-op */ }
    clearDraft();
    window.scrollTo({ top: 0, behavior: 'auto' });
    const heading = el.welcome.querySelector('h1');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    document.title = 'Chrysotop Designs — Website Design & Development | Start Your Project';
    announce('Returned to the Chrysotop Designs homepage.');
  }));

  /* Nav */
  el.nextBtn.addEventListener('click', () => next());
  el.backBtn.addEventListener('click', back);

  /* Review screen controls */
  const editAll = $('#editFromReview');
  if (editAll) {
    editAll.addEventListener('click', () => {
      el.review.hidden = true; el.form.hidden = false; el.progress.hidden = false;
      el.submitNote.hidden = true;
      el.brief.classList.remove('is-reviewing');
      goTo(STEPS.length - 1, { skipValidation: true, direction: -1 });
    });
  }

  el.form.addEventListener('submit', submitBrief);

  /* Enter advances the step, except inside a textarea (where it makes new lines). */
  el.form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const t = e.target;
    if (t.tagName === 'TEXTAREA') return;
    if (t.type === 'submit' || t.tagName === 'BUTTON') return;
    if (t.tagName === 'INPUT' && t.type !== 'text' && t.type !== 'email' && t.type !== 'tel' && t.type !== 'url' && t.type !== 'date') return;
    e.preventDefault();
    next();
  });

  /* Browser back/forward moves between brief steps rather than away from the
     page. Gated on the hash so that in-page links (#approach, #process, #top)
     do not hijack the brief and jump the visitor back to step 1. */
  window.addEventListener('popstate', (e) => {
    if (el.brief.hidden || state.submitted) return;
    const isStepHash = /^#brief(\/|$)/.test(window.location.hash);
    if (!isStepHash) return;
    const idx = e.state && Number.isInteger(e.state.step) ? e.state.step : 0;
    if (idx === state.stepIndex) return;
    goTo(idx, { skipValidation: true, direction: -1 });
  });

  /* Warn before losing a part-completed brief — but never after submission. */
  window.addEventListener('beforeunload', (e) => {
    if (state.submitted) return;
    if (el.brief.hidden) return;
    if (Object.keys(state.values).length === 0) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* Live region for connection changes. */
  window.addEventListener('offline', () => announce('You are offline. Your answers are saved locally.', true));

  /* Deep link support: #brief or #brief/<step> */
  if (/^#brief/.test(window.location.hash)) {
    startBrief();
    const wanted = window.location.hash.split('/')[1];
    const idx = STEPS.findIndex((s) => s.id === wanted);
    if (idx > 0 && idx <= state.maxVisited) goTo(idx, { skipValidation: true, direction: -1 });
  }

  /* Keep the footer year current without a build step. */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
