// test_mechanics.js — 61 testes: helpers, datas, toggle, reset, backup, nav, XSS
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- Browser mocks ----
const store = new Map();
const elements = {};

// localStorage mock com comportamento de navegador:
// Object.keys(localStorage) retorna as CHAVES armazenadas (ownKeys trap).
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
      if (store.has(String(prop))) {
        return { enumerable: true, configurable: true, value: store.get(String(prop)) };
      }
    },
  });
}
const localStorageMock = makeLocalStorage(store);

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
    setAttribute() {},
    getAttribute() { return ''; },
    appendChild() {},
    remove() {},
    focus() {},
  };
  Object.assign(el, props);
  elements[id] = el;
  return el;
}

const classes = new Map();
const fakeEl = (cls, props = {}) => ({
  cls, classList: makeClassList(), hidden: false, style: {}, dataset: props.dataset || {}, textContent: '', innerHTML: '',
  setAttribute() {}, removeAttribute() {}, focus() {}, matches() { return false; }, scrollTo() {}, scrollIntoView() {},
});

const documentMock = {
  documentElement: {
    _attrs: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] ?? null; },
    dataset: {},
    style: {},
  },
  body: { style: {}, classList: makeClassList(), addEventListener() {} },
  getElementById(id) { return elements[id] || null; },
  querySelector(sel) {
    if (sel.includes('meta[name="theme-color"]')) return null;
    if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
    return fakeEl(sel);
  },
  querySelectorAll(sel) {
    if (sel.replace(/[.#]/g, '') === 'page') return [];
    if (sel === '#page-tasks .time-block.morning') return [];
    return classes.get(sel) || [];
  },
  createElement() { return { style: {}, className: '', textContent: '', classList: makeClassList(), appendChild() {}, remove() {} }; },
  addEventListener() {},
  title: '',
};

const windowMock = {
  matchMedia() { return { matches: false }; },
  scrollTo() {},
  addEventListener() {},
  localStorage: localStorageMock,
};

global.localStorage = localStorageMock;
global.document = documentMock;
global.window = windowMock;
global.getComputedStyle = () => ({ getPropertyValue: () => '' });

for (const rel of [
  'scripts/core/theme.js',
  'scripts/pages/settings.js',
  'scripts/pages/dashboard.js',
  'scripts/pages/tasks.js',
  'app.js',
]) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, rel), 'utf8'), { filename: rel });
}

function call(fn, ...args) { return vm.runInThisContext(fn)(...args); }

const g = { tasks: null, dailyTaskLogs: null, timeblocks: null, appSettings: null, lastDayOpen: null };
function reload() {
  g.tasks = vm.runInThisContext('tasks');
  g.dailyTaskLogs = vm.runInThisContext('dailyTaskLogs');
  g.timeblocks = vm.runInThisContext('timeblocks');
  g.appSettings = vm.runInThisContext('appSettings');
  g.lastDayOpen = vm.runInThisContext('lastDayOpen');
}
reload();

let passed = 0, failed = 0, total = 0;
const failures = [];

function initGlobals() {
  store.clear();
  Object.keys(elements).forEach(k => delete elements[k]);
  reload();
  g.tasks.length = 0;
  Object.keys(g.dailyTaskLogs).forEach(k => delete g.dailyTaskLogs[k]);
  Object.assign(g.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
  g.appSettings.showDashboardClock = true;
  vm.runInThisContext(`lastDayOpen = '${todayLocal()}'`);
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

function seedTasks(array) {
  g.tasks.length = 0;
  array.forEach(t => g.tasks.push(t));
}
function addPunctual(id, dt, done = false) {
  g.tasks.push({ id, text: id, datetime: dt, repeatDaily: false, done, created: '2026-09-01T10:00:00.000Z' });
}

const fixedDate = new Date(2026, 8, 7, 15, 30, 45);

// =============================================
console.log('\n\x1b[1m=== Section 1: Date helpers (9) ===\x1b[0m');

it('localDateKey formats as YYYY-MM-DD', () => {
  assert.strictEqual(vm.runInThisContext(`localDateKey(${JSON.stringify(fixedDate.toISOString())})`), '2026-09-07');
});

it('localDateKey pads month and day', () => {
  const d = new Date(2026, 0, 3);
  const key = vm.runInThisContext(`localDateKey(new Date(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}))`);
  assert.strictEqual(key, '2026-01-03');
});

it('todayKey returns valid YYYY-MM-DD', () => {
  const key = vm.runInThisContext('todayKey()');
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

it('toInputDateTime formats datetime-local', () => {
  const out = vm.runInThisContext(`toInputDateTime(new Date(2026, 8, 7, 9, 5, 0))`);
  assert.strictEqual(out, '2026-09-07T09:05');
});

it('toInputDateTime zeroes seconds', () => {
  const out = vm.runInThisContext(`toInputDateTime(${JSON.stringify(fixedDate.toISOString())})`);
  assert.strictEqual(out, '2026-09-07T15:30');
});

it('getDefaultTaskDateTime returns 16-char datetime', () => {
  const out = vm.runInThisContext('getDefaultTaskDateTime()');
  assert.strictEqual(out.length, 16);
  assert.match(out, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

it('getDefaultTaskDateTime rounds minutes to nearest 15', () => {
  const out = vm.runInThisContext(`getDefaultTaskDateTime(new Date(2026, 8, 7, 10, 52, 0))`);
  assert.strictEqual(out, '2026-09-07T11:00');
});

it('getTaskDateKey from datetime', () => {
  const key = vm.runInThisContext(`getTaskDateKey({ datetime: '2026-09-07T10:00' })`);
  assert.strictEqual(key, '2026-09-07');
});

it('getTaskDateKey falls back to created date', () => {
  const key = vm.runInThisContext(`getTaskDateKey({ created: '2026-08-20T08:00:00.000Z' })`);
  assert.strictEqual(key, '2026-08-20');
});

// =============================================
console.log('\n\x1b[1m=== Section 2: Toggle / daily logs (8) ===\x1b[0m');

it('toggleTask sets done=true', () => {
  addPunctual('t1', '2026-09-07T10:00', false);
  call('toggleTask', 't1');
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 't1').done, true);
});

it('toggleTask toggles back to false', () => {
  addPunctual('t1', '2026-09-07T10:00', true);
  call('toggleTask', 't1');
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 't1').done, false);
});

it('toggleTask sets completedAt on check', () => {
  addPunctual('t1', '2026-09-07T10:00', false);
  call('toggleTask', 't1');
  reload();
  assert.ok(g.tasks.find(t => t.id === 't1').completedAt);
});

it('toggleTask clears completedAt on uncheck', () => {
  addPunctual('t1', '2026-09-07T10:00', true);
  g.tasks[0].completedAt = 'x';
  call('toggleTask', 't1');
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 't1').completedAt, '');
});

it('toggleTask on daily writes to dailyTaskLogs', () => {
  g.tasks.push({ id: 'd1', text: 'diária', datetime: '2026-09-07T10:00', repeatDaily: true, done: false });
  call('toggleTask', 'd1');
  reload();
  const key = todayLocal();
  assert.ok((g.dailyTaskLogs[key] || []).includes('d1'));
});

it('toggleTask on daily uncheck removes from log', () => {
  g.tasks.push({ id: 'd1', text: 'diária', datetime: '2026-09-07T10:00', repeatDaily: true, done: true });
  const key = todayLocal();
  g.dailyTaskLogs[key] = ['d1'];
  call('toggleTask', 'd1');
  reload();
  assert.ok(!(g.dailyTaskLogs[key] || []).includes('d1'));
});

it('toggleTask unknown id → no-op no throw', () => {
  call('toggleTask', 'nao-existe');
  reload();
  assert.strictEqual(g.tasks.length, 0);
});

it('setDailyLog removes id when done=false', () => {
  g.dailyTaskLogs[todayLocal()] = ['x', 'y'];
  call('setDailyLog', 'x', false);
  reload();
  assert.deepStrictEqual(g.dailyTaskLogs[todayLocal()], ['y']);
});

// =============================================
console.log('\n\x1b[1m=== Section 3: Reset (9) ===\x1b[0m');

it('manual reset makes today punctual tasks pending', () => {
  addPunctual('t1', `${todayLocal()}T10:00`, true);
  call('resetDayState', { manual: true });
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 't1').done, false);
});

it('manual reset leaves other-day punctual unaffected', () => {
  addPunctual('t1', '2026-12-31T10:00', true);
  call('resetDayState', { manual: true });
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 't1').done, true);
});

it('manual reset empties all timeblocks', () => {
  g.timeblocks.morning = ['a'];
  g.timeblocks.evening = ['b'];
  call('resetDayState', { manual: true });
  reload();
  assert.ok(Object.values(g.timeblocks).every(a => a.length === 0));
});

it('manual reset zeros today daily log', () => {
  g.dailyTaskLogs[todayLocal()] = ['a', 'b'];
  call('resetDayState', { manual: true });
  reload();
  assert.deepStrictEqual(g.dailyTaskLogs[todayLocal()], []);
});

it('autoCycle preserves daily-without-time blocks', () => {
  g.tasks.push({ id: 'd1', text: 'rotina diária', datetime: '', repeatDaily: true, done: true });
  g.timeblocks.morning = ['d1'];
  call('resetDayState', { autoCycle: true });
  reload();
  assert.deepStrictEqual(g.timeblocks.morning, ['d1']);
});

it('autoCycle clears punctual blocks', () => {
  g.tasks.push({ id: 'p1', text: 'p', datetime: '', repeatDaily: false, done: true });
  g.timeblocks.morning = ['p1'];
  call('resetDayState', { autoCycle: true });
  reload();
  assert.strictEqual(g.timeblocks.morning.length, 0);
});

it('autoCycle moves daily-with-time to today', () => {
  g.tasks.push({ id: 'd1', text: 'd', datetime: '2026-01-01T07:30', repeatDaily: true, done: true });
  call('resetDayState', { autoCycle: true });
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 'd1').datetime, `${todayLocal()}T07:30`);
});

it('autoCycle resets daily done to false', () => {
  g.tasks.push({ id: 'd1', text: 'd', datetime: '', repeatDaily: true, done: true });
  call('resetDayState', { autoCycle: true });
  reload();
  assert.strictEqual(g.tasks.find(t => t.id === 'd1').done, false);
});

it('resetDayState updates lastDayOpen to today', () => {
  vm.runInThisContext("lastDayOpen = '2026-01-01'");
  call('resetDayState', { manual: true });
  reload();
  assert.strictEqual(g.lastDayOpen, todayLocal());
});

// =============================================
console.log('\n\x1b[1m=== Section 4: Blocks (9) ===\x1b[0m');

it('removeTaskFromAllBlocks strips id from every block', () => {
  g.timeblocks.morning = ['x', 'y'];
  g.timeblocks.night = ['x'];
  call('removeTaskFromAllBlocks', 'x');
  reload();
  assert.deepStrictEqual(g.timeblocks.morning, ['y']);
  assert.deepStrictEqual(g.timeblocks.night, []);
});

it('applyTaskBlockSelection adds id to block', () => {
  call('applyTaskBlockSelection', 'n1', 'afternoon');
  reload();
  assert.deepStrictEqual(g.timeblocks.afternoon, ['n1']);
});

it('applyTaskBlockSelection moves between blocks', () => {
  g.timeblocks.morning = ['n1'];
  call('applyTaskBlockSelection', 'n1', 'evening');
  reload();
  assert.strictEqual(g.timeblocks.morning.length, 0);
  assert.deepStrictEqual(g.timeblocks.evening, ['n1']);
});

it('isInAnyBlock returns true when assigned', () => {
  g.timeblocks.morning = ['a1'];
  assert.strictEqual(call('isInAnyBlock', 'a1'), true);
  assert.strictEqual(call('isInAnyBlock', 'zz'), false);
});

it('getTaskAssignedBlock returns block name', () => {
  g.timeblocks.night = ['a1'];
  assert.strictEqual(call('getTaskAssignedBlock', 'a1'), 'night');
});

it('getTaskBlockLabel maps Portuguese labels', () => {
  g.timeblocks.morning = ['a1'];
  assert.strictEqual(call('getTaskBlockLabel', 'a1'), 'Manhã');
});

it('moveTaskToBlock works for task without datetime', () => {
  g.tasks.push({ id: 's1', text: 'sem hora', datetime: '', repeatDaily: false, done: false });
  call('moveTaskToBlock', 's1', 'morning');
  reload();
  assert.deepStrictEqual(g.timeblocks.morning, ['s1']);
});

it('moveTaskToBlock rejects task with datetime', () => {
  g.tasks.push({ id: 'c1', text: 'com hora', datetime: `${todayLocal()}T10:00`, repeatDaily: false, done: false });
  call('moveTaskToBlock', 'c1', 'morning');
  reload();
  assert.strictEqual(g.timeblocks.morning.length, 0);
});

it('getAssignableBlockTasks filters done and non-assignable', () => {
  g.tasks.push(
    { id: 'ok', text: 'ok', datetime: '', repeatDaily: false, done: false },
    { id: 'done', text: 'feita', datetime: '', repeatDaily: false, done: true },
    { id: 'comhora', text: 'com hora', datetime: `${todayLocal()}T10:00`, repeatDaily: false, done: false },
  );
  g.timeblocks.morning = ['ok', 'done', 'comhora'];
  const out = call('getAssignableBlockTasks', 'morning');
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].id, 'ok');
});

// =============================================
console.log('\n\x1b[1m=== Section 5: Filter + summary (5) ===\x1b[0m');

function fixtures() {
  const t = todayLocal();
  seedTasks([
    { id: 'p1', text: 'pendente', datetime: `${t}T09:00`, repeatDaily: false, done: false },
    { id: 'p2', text: 'feita', datetime: `${t}T10:00`, repeatDaily: false, done: true },
    { id: 'p3', text: 'amanhã', datetime: '2099-01-01T09:00', repeatDaily: false, done: false },
  ]);
}

it('filterTasks sets currentFilter', () => {
  call('filterTasks', 'pending', fakeEl('b'));
  reload();
  assert.strictEqual(vm.runInThisContext('currentFilter'), 'pending');
});

it('getFilteredTasks: all returns everything', () => {
  fixtures();
  vm.runInThisContext("currentFilter = 'all'");
  assert.strictEqual(call('getFilteredTasks').length, 3);
});

it('getFilteredTasks: pending filters done', () => {
  fixtures();
  vm.runInThisContext("currentFilter = 'pending'");
  const out = call('getFilteredTasks');
  assert.strictEqual(out.length, 2);
  assert.ok(out.every(t => !t.done));
});

it('getFilteredTasks: done returns done only', () => {
  fixtures();
  vm.runInThisContext("currentFilter = 'done'");
  const out = call('getFilteredTasks');
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].id, 'p2');
});

it('getFilteredTasks: today includes daily + punctual today', () => {
  fixtures();
  seedTasks([
    { id: 'd1', text: 'diária', datetime: '', repeatDaily: true, done: false },
    { id: 'p1', text: 'hoje', datetime: `${todayLocal()}T09:00`, repeatDaily: false, done: false },
    { id: 'p3', text: 'outro dia', datetime: '2099-01-01T09:00', repeatDaily: false, done: false },
  ]);
  vm.runInThisContext("currentFilter = 'today'");
  const out = call('getFilteredTasks');
  assert.strictEqual(out.length, 2);
});

// =============================================
console.log('\n\x1b[1m=== Section 6: Backup / import (5) ===\x1b[0m');

it('buildBackupSnapshot includes all keys', () => {
  const s = call('buildBackupSnapshot');
  assert.ok('tasks' in s && 'dailyTaskLogs' in s && 'timeblocks' in s && 'lastDayOpen' in s && 'appSettings' in s && 'name' in s && 'theme' in s);
});

it('applyImportedBackup restores tasks and timeblocks', () => {
  const snap = {
    tasks: [{ id: 'i1', text: 'importada', datetime: '', repeatDaily: true, done: false }],
    dailyTaskLogs: {},
    timeblocks: { morning: ['i1'], afternoon: [], evening: [], night: [] },
    lastDayOpen: todayLocal(),
    appSettings: { showDashboardClock: true },
    name: 'Ana',
    theme: 'dark-tech',
  };
  call('applyImportedBackup', snap, { showSuccessToast: false });
  reload();
  assert.strictEqual(g.tasks.length, 1);
  assert.strictEqual(g.tasks[0].text, 'importada');
  assert.deepStrictEqual(g.timeblocks.morning, ['i1']);
});

it('applyImportedBackup ignores invalid structure safely', () => {
  call('applyImportedBackup', null, { showSuccessToast: false });
  reload();
  assert.strictEqual(g.tasks.length, 0);
});

it('clearAllDataNow removes mr_ keys from storage', () => {
  store.set('mr_tasks', JSON.stringify([{ id: 'x', text: 'x', datetime: '', repeatDaily: false, done: false }]));
  store.set('mr_timeblocks', JSON.stringify({ morning: ['x'], afternoon: [], evening: [], night: [] }));
  store.set('mr_name', 'Jota');
  call('clearAllDataNow');
  assert.strictEqual(store.has('mr_tasks'), false);
  assert.strictEqual(store.has('mr_timeblocks'), false);
  assert.strictEqual(store.has('mr_name'), false);
  reload();
  assert.strictEqual(g.tasks.length, 0);
});

it('extractBackupSnapshot null-safe', () => {
  assert.strictEqual(call('extractBackupSnapshot', null), null);
  assert.strictEqual(call('extractBackupSnapshot', 'xpto'), null);
});

// =============================================
console.log('\n\x1b[1m=== Section 7: Navegação (5) ===\x1b[0m');

it('isValidPage aceita as 3 páginas', () => {
  assert.strictEqual(call('isValidPage', 'dashboard'), true);
  assert.strictEqual(call('isValidPage', 'tasks'), true);
  assert.strictEqual(call('isValidPage', 'settings'), true);
});

it('isValidPage rejeita página inválida', () => {
  assert.strictEqual(call('isValidPage', 'admin'), false);
  assert.strictEqual(call('isValidPage', ''), false);
});

it('PAGE_LABELS mapeia títulos em PT', () => {
  const labels = vm.runInThisContext('PAGE_LABELS');
  assert.strictEqual(labels.dashboard, 'Hoje');
  assert.strictEqual(labels.tasks, 'Planejar');
  assert.strictEqual(labels.settings, 'Ajustes');
});

it('navigate com página inválida não lança erro', () => {
  call('navigate', 'página-invalida');
  reload();
  assert.ok(true);
});

it('navigate dashboard/tasks/settings não lança com DOM vazio', () => {
  call('navigate', 'dashboard');
  call('navigate', 'tasks');
  call('navigate', 'settings');
  reload();
  assert.ok(true);
});

// =============================================
console.log('\n\x1b[1m=== Section 8: XSS / formatação (6) ===\x1b[0m');

it('escapeHtml escapa &, <, >', () => {
  assert.strictEqual(call('escapeHtml', '<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
});

it('escapeHtml de string vazia/undefined', () => {
  assert.strictEqual(call('escapeHtml', ''), '');
  assert.strictEqual(call('escapeHtml', undefined), '');
});

it('buildTaskItemHtml escapa script injection', () => {
  const html = call('buildTaskItemHtml', { id: 'x1', text: '<script>alert(1)</script>', datetime: '', repeatDaily: false, done: false });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('data-task-id="x1"'));
});

it('buildTaskItemHtml mostra label Sem hora', () => {
  const html = call('buildTaskItemHtml', { id: 'x2', text: 'coisa', datetime: '', repeatDaily: false, done: false });
  assert.ok(html.includes('Sem hora'));
});

it('buildTaskItemHtml marca done', () => {
  const html = call('buildTaskItemHtml', { id: 'x3', text: 'feita', datetime: '', repeatDaily: false, done: true });
  assert.ok(html.includes('class="task-item done"'));
});

it('formatDT invalid input → empty string', () => {
  assert.strictEqual(call('formatDT', ''), '');
  assert.strictEqual(call('formatDT', 'garbage-garbage'), '');
});

// =============================================
console.log('\n\x1b[1m=== Section 9: Diversos (5) ===\x1b[0m');

it('uid gera ids únicos de 8 caracteres', () => {
  const ids = new Set();
  for (let i = 0; i < 200; i++) ids.add(call('uid'));
  assert.strictEqual(ids.size, 200);
  assert.ok([...ids].every(id => id.length === 8));
});

it('showToast com stack ausente não lança', () => {
  call('showToast', 't', 'b', 'success');
  reload();
  assert.ok(true);
});

it('shake com elemento ausente não lança', () => {
  call('shake', 'task-input');
  reload();
  assert.ok(true);
});

it('setEl seta textContent quando existe', () => {
  mockEl('target-el', { textContent: '' });
  call('setEl', 'target-el', 'valor');
  assert.strictEqual(documentMock.getElementById('target-el').textContent, 'valor');
});

it('getTaskStateLabel de objeto sem campos → Sem hora', () => {
  assert.strictEqual(call('getTaskStateLabel', {}), 'Sem hora');
});

// =============================================
console.log(`\n\x1b[1m=== Results: ${passed}/${total} passed, ${failed} failed ===\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.desc}\n    ${f.error.split('\n').slice(0, 4).join('\n    ')}`));
  process.exit(1);
}