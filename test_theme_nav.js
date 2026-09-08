// test_theme_nav.js — 5 testes: tema, sem-SPA, confirm, toast XSS-safe
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = new Map();
const elements = {};

function makeLocalStorage(store) {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'getItem') return k => (store.has(k) ? store.get(k) : null);
      if (prop === 'setItem') return (k, v) => store.set(k, String(v));
      if (prop === 'removeItem') return k => store.delete(k);
      if (prop === 'key') return i => [...store.keys()][i] ?? null;
      if (prop === 'length') return store.size;
      return store.has(String(prop)) ? store.get(String(prop)) : undefined;
    },
    set() { return true; },
    has(_, prop) { return store.has(String(prop)); },
    ownKeys() { return [...store.keys()]; },
    getOwnPropertyDescriptor(_, prop) {
      if (store.has(String(prop))) return { enumerable: true, configurable: true, value: store.get(String(prop)) };
    },
  });
}

function makeClassList() {
  const set = new Set();
  return {
    add(c) { set.add(c); },
    remove(c) { set.delete(c); },
    toggle(c, force) {
      if (force === undefined) { if (set.has(c)) set.delete(c); else set.add(c); }
      else if (force) set.add(c); else set.delete(c);
    },
    contains(c) { return set.has(c); },
  };
}

function mockEl(id, props = {}) {
  const el = {
    id,
    value: props.value ?? '',
    textContent: '',
    innerHTML: '',
    className: props.className ?? '',
    style: {},
    dataset: {},
    classList: makeClassList(),
    children: [],
    firstElementChild: null,
    setAttribute() {},
    getAttribute() { return ''; },
    removeAttribute() {},
    appendChild(c) { this.children.push(c); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    remove() {},
    focus() {},
  };
  Object.assign(el, props);
  elements[id] = el;
  return el;
}

const created = [];
const documentMock = {
  documentElement: {
    _attrs: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] ?? null; },
    dataset: {},
  },
  body: { style: {}, classList: makeClassList(), addEventListener() {} },
  getElementById(id) { return elements[id] || null; },
  querySelector(sel) {
    if (sel.includes('meta[name="theme-color"]')) return null;
    return null;
  },
  querySelectorAll(sel) {
    if (sel === '.modal-overlay.open') return elements['modal-confirm'] ? [elements['modal-confirm']] : [];
    return [];
  },
  createElement() {
    const el = { className: '', textContent: '', style: {}, classList: makeClassList(), appendChild(c) { this.children.push(c); }, remove() {}, children: [], querySelector() { return null; } };
    created.push(el);
    return el;
  },
  addEventListener() {},
  title: '',
};

const windowMock = {
  matchMedia() { return { matches: false }; },
  scrollTo() {},
  addEventListener() {},
  localStorage: makeLocalStorage(store),
};

global.localStorage = windowMock.localStorage;
global.document = documentMock;
global.window = windowMock;
global.getComputedStyle = () => ({ getPropertyValue: () => '' });

for (const rel of [
  'scripts/core/theme.js',
  'scripts/core/store.js',
  'scripts/core/shell.js',
  'scripts/pages/settings.js',
  'scripts/pages/dashboard.js',
  'scripts/pages/tasks.js',
]) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, rel), 'utf8'), { filename: rel });
}

function call(fn, ...args) { return vm.runInThisContext(fn)(...args); }

let passed = 0, failed = 0, total = 0;
const failures = [];

function initGlobals() {
  store.clear();
  Object.keys(elements).forEach(k => delete elements[k]);
  created.length = 0;
  documentMock.documentElement._attrs = {};
}

function it(desc, fn) {
  total++;
  try {
    initGlobals();
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${desc}`);
  } catch (e) {
    failed++;
    failures.push({ desc, error: e.stack || e.message });
    console.log(`  \x1b[31m✗\x1b[0m ${desc}`);
    console.log(`    ${e.message}`);
  }
}

// =============================================
console.log('\n\x1b[1m=== Tema + Sem-SPA + Confirm + Toast (5) ===\x1b[0m');

it('setTheme aplica e persiste mr_theme', () => {
  call('setTheme', 'dark-tech', { silent: true });
  // save() serializa com JSON.stringify → valor é a string JSON com aspas
  assert.strictEqual(store.get('mr_theme'), JSON.stringify('dark-tech'));
  assert.strictEqual(documentMock.documentElement._attrs['data-theme'], 'dark-tech');
});

it('initTheme aplica tema salvo no localStorage', () => {
  store.set('mr_theme', 'dark-tech');
  call('initTheme');
  assert.strictEqual(documentMock.documentElement._attrs['data-theme'], 'dark-tech');
});

it('sem SPA: navigate/toggleSidebar não existem (links reais)', () => {
  mockEl('dash-critical', { textContent: '' });
  assert.throws(() => vm.runInThisContext('navigate'), ReferenceError);
  assert.throws(() => vm.runInThisContext('toggleSidebar'), ReferenceError);
  assert.throws(() => vm.runInThisContext('updateMobileNavigation'), ReferenceError);
});

it('showConfirm executa callback via confirmDialogYes', () => {
  mockEl('confirm-title');
  mockEl('confirm-msg');
  mockEl('modal-confirm');
  let called = false;
  call('showConfirm', 'Título', 'Mensagem', () => { called = true; });
  assert.ok(called === false);
  call('confirmDialogYes');
  assert.strictEqual(called, true);
});

it('showToast usa textContent (XSS-safe)', () => {
  mockEl('toast-stack');
  call('showToast', '<img src=x onerror=alert(1)>', '<script>bad()</script>', 'danger');
  const toast = elements['toast-stack'].children[0];
  assert.ok(toast);
  assert.strictEqual(toast.children[0].textContent, '<img src=x onerror=alert(1)>');
  assert.strictEqual(toast.children[1].textContent, '<script>bad()</script>');
  // nenhum innerHTML usado para o texto
  assert.ok(!toast.innerHTML);
});

// =============================================
console.log(`\n\x1b[1m=== Results: ${passed}/${total} passed, ${failed} failed ===\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.desc}\n    ${f.error.split('\n').slice(0, 4).join('\n    ')}`));
  process.exit(1);
}