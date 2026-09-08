// test_dash_layout.js — 16 testes: dashboard (estatísticas, listas, foco oculto)
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
    checked: props.checked ?? false,
    hidden: props.hidden ?? false,
    disabled: props.disabled ?? false,
    textContent: '',
    innerHTML: '',
    className: props.className ?? '',
    style: {},
    dataset: {},
    classList: makeClassList(),
    firstElementChild: null,
    children: [],
    setAttribute() {},
    getAttribute() { return ''; },
    appendChild(c) { this.children.push(c); },
    remove() {},
    focus() {},
  };
  Object.assign(el, props);
  elements[id] = el;
  return el;
}

let gridClassList = makeClassList();
const gridFake = { classList: gridClassList };

const documentMock = {
  documentElement: { _attrs: {}, setAttribute(k, v) { this._attrs[k] = v; }, getAttribute(k) { return this._attrs[k] ?? null; }, dataset: {} },
  body: { style: {}, classList: makeClassList(), addEventListener() {} },
  getElementById(id) { return elements[id] || null; },
  querySelector(sel) {
    if (sel === '#page-dashboard .dashboard-grid') return gridFake;
    if (sel.includes('meta[name="theme-color"]')) return null;
    return null;
  },
  querySelectorAll() { return []; },
  createElement() { return { className: '', textContent: '', style: {}, classList: makeClassList(), appendChild() {}, remove() {} }; },
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
  gridClassList = makeClassList();
  gridFake.classList = gridClassList;
  const g = vm.runInThisContext('({ tasks, dailyTaskLogs, timeblocks, appSettings })');
  g.tasks.length = 0;
  Object.keys(g.dailyTaskLogs).forEach(k => delete g.dailyTaskLogs[k]);
  Object.assign(g.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
  g.appSettings.showDashboardClock = true;
}

function todayLocal() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

function seedTask(id, text, opts = {}) {
  const t = vm.runInThisContext('tasks');
  t.push({
    id, text,
    datetime: opts.datetime ?? `${todayLocal()}T09:00`,
    repeatDaily: opts.repeatDaily ?? false,
    done: opts.done ?? false,
    created: '2026-09-01T10:00:00.000Z',
  });
}

function setupDashEls() {
  mockEl('ov-progress');
  mockEl('ov-progress-bar');
  mockEl('ov-tasks-done');
  mockEl('ov-daily-done');
  mockEl('dash-stat-tasks');
  mockEl('dash-tasks-list');
  mockEl('dash-card-tasks');
  mockEl('dash-daily-list');
  mockEl('dash-card-daily');
  mockEl('dashboard-now-pill');
  mockEl('dashboard-now-title');
  mockEl('dashboard-now-range');
  mockEl('dashboard-now-list');
  mockEl('dash-card-focus');
}

function currentBlock() { return call('getCurrentTimeBlock'); }

// =============================================
console.log('\n\x1b[1m=== Section 1: Estatísticas (4) ===\x1b[0m');

it('zero tasks → overall 0% e contadores zerados', () => {
  setupDashEls();
  call('renderDashboardStats', todayLocal());
  assert.strictEqual(elements['ov-progress'].textContent, '0%');
  assert.strictEqual(elements['ov-tasks-done'].textContent, '0/0');
  assert.strictEqual(elements['ov-daily-done'].textContent, '0/0');
});

it('com tarefas → porcentagem correta', () => {
  seedTask('p1', 'feita', { done: true });
  seedTask('p2', 'pendente1', {});
  seedTask('p3', 'pendente2', {});
  setupDashEls();
  call('renderDashboardStats', todayLocal());
  assert.strictEqual(elements['ov-progress'].textContent, '33%');
  assert.strictEqual(elements['ov-progress-bar'].style.width, '33%');
});

it('punctual done conta em ov-tasks-done', () => {
  seedTask('p1', 'feita', { done: true });
  seedTask('p2', 'pendente', {});
  setupDashEls();
  call('renderDashboardStats', todayLocal());
  assert.strictEqual(elements['ov-tasks-done'].textContent, '1/2');
});

it('daily done via log conta em ov-daily-done', () => {
  seedTask('d1', 'diária', { repeatDaily: true });
  const logs = vm.runInThisContext('dailyTaskLogs');
  logs[todayLocal()] = ['d1'];
  setupDashEls();
  call('renderDashboardStats', todayLocal());
  assert.strictEqual(elements['ov-daily-done'].textContent, '1/1');
});

// =============================================
console.log('\n\x1b[1m=== Section 2: Lista Hoje (4) ===\x1b[0m');

it('zero tarefas → empty state com botão Planejar', () => {
  setupDashEls();
  call('renderDashboardTasks');
  assert.ok(elements['dash-tasks-list'].innerHTML.includes('Nenhuma tarefa'));
  assert.ok(elements['dash-tasks-list'].innerHTML.includes('Planejar o dia'));
});

it('com pontuais hoje → itens renderizados com label', () => {
  seedTask('p1', 'Beber água', { datetime: `${todayLocal()}T08:00` });
  setupDashEls();
  call('renderDashboardTasks');
  const html = elements['dash-tasks-list'].innerHTML;
  assert.ok(html.includes('Beber água'));
  assert.ok(html.includes('Pontual'));
});

it('diárias não entram na lista "Hoje"', () => {
  seedTask('d1', 'diária', { repeatDaily: true });
  setupDashEls();
  call('renderDashboardTasks');
  assert.ok(!elements['dash-tasks-list'].innerHTML.includes('diária'));
});

it('pontuais feitas são excluídas', () => {
  seedTask('p1', 'feita', { done: true });
  setupDashEls();
  call('renderDashboardTasks');
  assert.ok(!elements['dash-tasks-list'].innerHTML.includes('feita'));
});

// =============================================
console.log('\n\x1b[1m=== Section 3: Diárias (4) ===\x1b[0m');

it('mostra diária pendente com label Diária', () => {
  seedTask('d1', 'Estudar', { repeatDaily: true, datetime: `${todayLocal()}T18:00` });
  setupDashEls();
  call('renderDashboardDaily', todayLocal());
  const html = elements['dash-daily-list'].innerHTML;
  assert.ok(html.includes('Estudar'));
  assert.ok(html.includes('Diária'));
});

it('mostra diária sem hora com label Diária sem hora', () => {
  seedTask('d2', 'Alongar', { repeatDaily: true, datetime: '' });
  setupDashEls();
  call('renderDashboardDaily', todayLocal());
  assert.ok(elements['dash-daily-list'].innerHTML.includes('Diária sem hora'));
});

it('diária concluída (log) não aparece', () => {
  seedTask('d1', 'Feita hoje', { repeatDaily: true });
  const logs = vm.runInThisContext('dailyTaskLogs');
  logs[todayLocal()] = ['d1'];
  seedTask('d2', 'Pendente', { repeatDaily: true });
  setupDashEls();
  call('renderDashboardDaily', todayLocal());
  const html = elements['dash-daily-list'].innerHTML;
  assert.ok(!html.includes('Feita hoje'));
  assert.ok(html.includes('Pendente'));
});

it('sem diárias → empty state', () => {
  setupDashEls();
  call('renderDashboardDaily', todayLocal());
  assert.ok(elements['dash-daily-list'].innerHTML.includes('Nenhuma diária pendente'));
});

// =============================================
console.log('\n\x1b[1m=== Section 4: Foco (4) ===\x1b[0m');

it('renderCurrentBlockCard preenche título/range/pill', () => {
  seedTask('s1', 'sem hora', { datetime: '' });
  const block = currentBlock();
  const blocks = vm.runInThisContext('timeblocks');
  blocks[block].push('s1');
  setupDashEls();
  call('renderCurrentBlockCard');
  assert.ok(elements['dashboard-now-title'].textContent);
  assert.ok(elements['dashboard-now-range'].textContent.includes(':'));
  assert.ok(elements['dashboard-now-pill'].textContent.includes('Agora:'));
  assert.ok(elements['dashboard-now-list'].innerHTML.includes('sem hora'));
});

it('foco mostra diária sem hora do bloco', () => {
  seedTask('d1', 'rotina', { repeatDaily: true, datetime: '' });
  const block = currentBlock();
  const blocks = vm.runInThisContext('timeblocks');
  blocks[block].push('d1');
  setupDashEls();
  call('renderCurrentBlockCard');
  assert.ok(elements['dashboard-now-list'].innerHTML.includes('rotina'));
});

it('tarefa com hora NÃO aparece no foco', () => {
  seedTask('c1', 'com hora', { datetime: `${todayLocal()}T15:00` });
  const block = currentBlock();
  const blocks = vm.runInThisContext('timeblocks');
  blocks[block].push('c1');
  setupDashEls();
  call('renderCurrentBlockCard');
  assert.ok(!elements['dashboard-now-list'].innerHTML.includes('com hora'));
});

it('foco oculto adiciona .no-focus e esconde card', () => {
  setupDashEls();
  const settings = vm.runInThisContext('appSettings');
  settings.showDashboardClock = false;
  call('renderDashboard');
  assert.ok(gridFake.classList.contains('no-focus'));
  assert.strictEqual(elements['dash-card-focus'].style.display, 'none');
  assert.strictEqual(elements['dashboard-now-pill'].style.display, 'none');
});

// =============================================
console.log(`\n\x1b[1m=== Results: ${passed}/${total} passed, ${failed} failed ===\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.desc}\n    ${f.error.split('\n').slice(0, 4).join('\n    ')}`));
  process.exit(1);
}