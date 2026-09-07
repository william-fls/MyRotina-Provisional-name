// test_form_matrix.js — 66 testes: formulário de 4 combinações, presets, normalização
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

function makeClassList(initial = '') {
  const set = new Set(String(initial).split(' ').filter(Boolean));
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
    className: props.className ?? '',
    style: {},
    dataset: {},
    files: [],
    classList: makeClassList(props.className),
    setAttribute() {},
    getAttribute(name) { return this[name] ?? ''; },
    appendChild() {},
    removeChild() {},
    remove() {},
    focus() {},
    scrollIntoView() {},
  };
  Object.assign(el, props);
  // keep classList consistent with toggles
  if (props.classList) el.classList = props.classList;
  elements[id] = el;
  return el;
}

const documentMock = {
  documentElement: {
    _attrs: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] ?? null; },
    dataset: {},
  },
  body: { style: {}, classList: makeClassList(), addEventListener() {}, dataset: {} },
  getElementById(id) { return elements[id] || null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { style: {}, className: '', textContent: '', classList: makeClassList(), appendChild() {}, remove() {} }; },
  addEventListener() {},
  title: '',
};

const windowMock = {
  matchMedia() { return { matches: false }; },
  scrollTo() {},
  addEventListener() {},
  localStorage: localStorageMock,
  prompt() { return 'EXCLUIR'; },
  innerWidth: 1440,
};

// ---- Install globals BEFORE loading sources ----
global.localStorage = localStorageMock;
global.document = documentMock;
global.window = windowMock;
global.Response = class { static error() { return new (class {}); } };

// ---- Load source files ----
for (const rel of [
  'scripts/core/theme.js',
  'scripts/pages/settings.js',
  'scripts/pages/dashboard.js',
  'scripts/pages/tasks.js',
  'app.js',
]) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  vm.runInThisContext(code, { filename: rel });
}

function el(id) { return documentMock.getElementById(id); }
function todayStr() { return vm.runInThisContext('todayKey()'); }

// capture mutable refs
const g = {
  tasks: null,
  dailyTaskLogs: null,
  timeblocks: null,
  appSettings: null,
  editingTaskId: null,
  currentFilter: null,
};
(() => {
  g.tasks = vm.runInThisContext('tasks');
  g.dailyTaskLogs = vm.runInThisContext('dailyTaskLogs');
  g.timeblocks = vm.runInThisContext('timeblocks');
  g.appSettings = vm.runInThisContext('appSettings');
  g.editingTaskId = vm.runInThisContext('editingTaskId');
  g.currentFilter = vm.runInThisContext('currentFilter');
})();

function reloadState() {
  g.tasks = vm.runInThisContext('tasks');
  g.dailyTaskLogs = vm.runInThisContext('dailyTaskLogs');
  g.timeblocks = vm.runInThisContext('timeblocks');
  g.appSettings = vm.runInThisContext('appSettings');
  g.currentFilter = vm.runInThisContext('currentFilter');
}

// ---- Test runner ----
let passed = 0, failed = 0, total = 0;
const failures = [];

function resetStore() {
  store.clear();
  Object.keys(elements).forEach(k => delete elements[k]);
  documentMock.documentElement._attrs = {};
  documentMock.body.style = {};
}

function initGlobals() {
  resetStore();
  reloadState();
  g.tasks.length = 0;
  Object.keys(g.dailyTaskLogs).forEach(k => delete g.dailyTaskLogs[k]);
  Object.assign(g.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
  g.appSettings.showDashboardClock = true;
  g.currentFilter = 'all';
}

const cities = {
  'atom-walk': 'a',
};

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

function call(fn, ...args) { return vm.runInThisContext(fn)(...args); }

function setupForm() {
  mockEl('task-input', { value: 'Teste' });
  mockEl('task-datetime', { value: '2026-09-07T10:00' });
  mockEl('task-repeat-daily');
  mockEl('task-no-datetime');
  mockEl('task-block');
  mockEl('task-datetime-wrap');
  mockEl('task-block-wrap');
  mockEl('task-daily-hint');
  mockEl('edit-task-text', { value: 'Editar' });
  mockEl('edit-task-datetime', { value: '2026-09-07T10:00' });
  mockEl('edit-task-repeat-daily');
  mockEl('edit-task-no-datetime');
  mockEl('edit-task-block');
  mockEl('edit-task-datetime-wrap');
  mockEl('edit-task-block-wrap');
  mockEl('edit-task-daily-hint');
}

// =============================================
console.log('\n\x1b[1m=== Section 1: getTaskFormFlags (8) ===\x1b[0m');

it('create: noTime=false, daily=false', () => {
  setupForm();
  const f = call('getTaskFormFlags', false);
  assert.strictEqual(f.noTime, false);
  assert.strictEqual(f.daily, false);
});

it('create: noTime=false, daily=true', () => {
  setupForm();
  el('task-repeat-daily').checked = true;
  const f = call('getTaskFormFlags', false);
  assert.strictEqual(f.noTime, false);
  assert.strictEqual(f.daily, true);
});

it('create: noTime=true, daily=false', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  const f = call('getTaskFormFlags', false);
  assert.strictEqual(f.noTime, true);
  assert.strictEqual(f.daily, false);
});

it('create: noTime=true, daily=true', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  el('task-repeat-daily').checked = true;
  const f = call('getTaskFormFlags', false);
  assert.strictEqual(f.noTime, true);
  assert.strictEqual(f.daily, true);
});

it('edit: noTime=false, daily=false', () => {
  setupForm();
  const f = call('getTaskFormFlags', true);
  assert.strictEqual(f.noTime, false);
  assert.strictEqual(f.daily, false);
});

it('edit: noTime=false, daily=true', () => {
  setupForm();
  el('edit-task-repeat-daily').checked = true;
  const f = call('getTaskFormFlags', true);
  assert.strictEqual(f.noTime, false);
  assert.strictEqual(f.daily, true);
});

it('edit: noTime=true, daily=false', () => {
  setupForm();
  el('edit-task-no-datetime').checked = true;
  const f = call('getTaskFormFlags', true);
  assert.strictEqual(f.noTime, true);
  assert.strictEqual(f.daily, false);
});

it('edit: noTime=true, daily=true', () => {
  setupForm();
  el('edit-task-no-datetime').checked = true;
  el('edit-task-repeat-daily').checked = true;
  const f = call('getTaskFormFlags', true);
  assert.strictEqual(f.noTime, true);
  assert.strictEqual(f.daily, true);
});

// =============================================
console.log('\n\x1b[1m=== Section 2: readTaskForm (8) ===\x1b[0m');

it('punctual with time: returns correct fields', () => {
  setupForm();
  const r = call('readTaskForm', false);
  assert.strictEqual(r.text, 'Teste');
  assert.strictEqual(r.noTime, false);
  assert.strictEqual(r.daily, false);
  assert.ok(r.datetime.includes('T'));
  assert.strictEqual(r.block, '');
});

it('daily with time: datetime normalized to today', () => {
  setupForm();
  el('task-repeat-daily').checked = true;
  const r = call('readTaskForm', false);
  assert.strictEqual(r.daily, true);
  assert.strictEqual(r.datetime.slice(0, 10), todayStr());
  assert.strictEqual(r.datetime.slice(11), '10:00');
});

it('punctual without time: datetime empty, block preserved', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  el('task-block').value = 'morning';
  const r = call('readTaskForm', false);
  assert.strictEqual(r.noTime, true);
  assert.strictEqual(r.datetime, '');
  assert.strictEqual(r.block, 'morning');
});

it('daily without time: datetime empty, block preserved', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  el('task-repeat-daily').checked = true;
  el('task-block').value = 'afternoon';
  const r = call('readTaskForm', false);
  assert.strictEqual(r.noTime, true);
  assert.strictEqual(r.daily, true);
  assert.strictEqual(r.datetime, '');
  assert.strictEqual(r.block, 'afternoon');
});

it('empty text returns empty string', () => {
  setupForm();
  el('task-input').value = '';
  const r = call('readTaskForm', false);
  assert.strictEqual(r.text, '');
});

it('block cleared when noTime=false', () => {
  setupForm();
  el('task-block').value = 'morning';
  const r = call('readTaskForm', false);
  assert.strictEqual(r.block, '');
});

it('block preserved when noTime=true', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  el('task-block').value = 'evening';
  const r = call('readTaskForm', false);
  assert.strictEqual(r.block, 'evening');
});

it('readTaskForm edit mode reads edit elements', () => {
  setupForm();
  el('edit-task-text').value = 'Editado';
  el('edit-task-no-datetime').checked = true;
  el('edit-task-block').value = 'night';
  const r = call('readTaskForm', true);
  assert.strictEqual(r.text, 'Editado');
  assert.strictEqual(r.noTime, true);
  assert.strictEqual(r.block, 'night');
});

// =============================================
console.log('\n\x1b[1m=== Section 3: getTaskStateLabel (4) ===\x1b[0m');

it('punctual with datetime → Pontual', () => {
  assert.strictEqual(vm.runInThisContext("getTaskStateLabel({ repeatDaily: false, datetime: '2026-09-07T10:00' })"), 'Pontual');
});

it('daily with datetime → Diária', () => {
  assert.strictEqual(vm.runInThisContext("getTaskStateLabel({ repeatDaily: true, datetime: '2026-09-07T10:00' })"), 'Diária');
});

it('punctual without datetime → Sem hora', () => {
  assert.strictEqual(vm.runInThisContext("getTaskStateLabel({ repeatDaily: false, datetime: '' })"), 'Sem hora');
});

it('daily without datetime → Diária sem hora', () => {
  assert.strictEqual(vm.runInThisContext("getTaskStateLabel({ repeatDaily: true, datetime: '' })"), 'Diária sem hora');
});

// =============================================
console.log('\n\x1b[1m=== Section 4: isTaskPeriodAssignable (4) ===\x1b[0m');

it('with datetime → false', () => {
  assert.strictEqual(call('isTaskPeriodAssignable', { datetime: '2026-09-07T10:00' }), false);
});

it('without datetime → true', () => {
  assert.strictEqual(call('isTaskPeriodAssignable', { datetime: '' }), true);
});

it('daily without datetime → true', () => {
  assert.strictEqual(call('isTaskPeriodAssignable', { datetime: '', repeatDaily: true }), true);
});

it('null and undefined → false', () => {
  assert.strictEqual(call('isTaskPeriodAssignable', null), false);
  assert.strictEqual(call('isTaskPeriodAssignable', undefined), false);
});

// =============================================
console.log('\n\x1b[1m=== Section 5: hasTaskDateTime (3) ===\x1b[0m');

it('datetime present → true', () => {
  assert.strictEqual(call('hasTaskDateTime', { datetime: '2026-09-07T10:00' }), true);
});

it('datetime empty → false', () => {
  assert.strictEqual(call('hasTaskDateTime', { datetime: '' }), false);
});

it('null → false', () => {
  assert.strictEqual(call('hasTaskDateTime', null), false);
});

// =============================================
console.log('\n\x1b[1m=== Section 6: getTaskEffectiveDateTime (4) ===\x1b[0m');

it('punctual: returns datetime as-is', () => {
  const dt = '2026-09-07T10:00';
  assert.strictEqual(call('getTaskEffectiveDateTime', { datetime: dt, repeatDaily: false }), dt);
});

it('daily with time: normalizes to dateKey + time', () => {
  const result = call('getTaskEffectiveDateTime', { datetime: '2026-01-01T14:30', repeatDaily: true }, '2026-09-07');
  assert.strictEqual(result, '2026-09-07T14:30');
});

it('no datetime: returns empty', () => {
  assert.strictEqual(call('getTaskEffectiveDateTime', { datetime: '', repeatDaily: true }), '');
});

it('daily with no time part possible → defaults 09:00 path does not crash', () => {
  const dt = '2026-09-07T10:00';
  assert.strictEqual(call('getTaskEffectiveDateTime', { datetime: dt, repeatDaily: true }, '2026-09-07'), '2026-09-07T10:00');
});

// =============================================
console.log('\n\x1b[1m=== Section 7: isTaskForDate (5) ===\x1b[0m');

it('repeatDaily=true → always true', () => {
  assert.strictEqual(call('isTaskForDate', { repeatDaily: true, datetime: '' }, '2026-09-07'), true);
});

it('punctual matching dateKey → true', () => {
  assert.strictEqual(call('isTaskForDate', { repeatDaily: false, datetime: '2026-09-07T10:00', id: 'x' }, '2026-09-07'), true);
});

it('punctual not matching dateKey → false', () => {
  assert.strictEqual(call('isTaskForDate', { repeatDaily: false, datetime: '2026-09-06T10:00', id: 'x' }, '2026-09-07'), false);
});

it('no datetime, in block → true', () => {
  reloadState();
  g.timeblocks.morning = ['task1'];
  assert.strictEqual(call('isTaskForDate', { repeatDaily: false, datetime: '', id: 'task1' }, '2026-09-07'), true);
});

it('no datetime, not in any block → false', () => {
  assert.strictEqual(call('isTaskForDate', { repeatDaily: false, datetime: '', id: 'none' }, '2026-09-07'), false);
});

// =============================================
console.log('\n\x1b[1m=== Section 8: fillTaskForm round-trip (4) ===\x1b[0m');

it('fill from punctual with time', () => {
  setupForm();
  call('fillTaskForm', false, { id: 't1', text: 'Task', datetime: '2026-09-07T10:00', repeatDaily: false });
  assert.strictEqual(el('task-input').value, 'Task');
  assert.strictEqual(el('task-repeat-daily').checked, false);
  assert.strictEqual(el('task-no-datetime').checked, false);
});

it('fill from daily with time', () => {
  setupForm();
  call('fillTaskForm', false, { id: 't2', text: 'Diária', datetime: '2026-09-07T14:00', repeatDaily: true });
  assert.strictEqual(el('task-repeat-daily').checked, true);
  assert.strictEqual(el('task-no-datetime').checked, false);
});

it('fill from punctual no time', () => {
  setupForm();
  call('fillTaskForm', false, { id: 't3', text: 'Sem hora', datetime: '', repeatDaily: false });
  assert.strictEqual(el('task-no-datetime').checked, true);
  assert.strictEqual(el('task-repeat-daily').checked, false);
});

it('fill from daily no time', () => {
  setupForm();
  call('fillTaskForm', false, { id: 't4', text: 'Diária sem hora', datetime: '', repeatDaily: true });
  assert.strictEqual(el('task-no-datetime').checked, true);
  assert.strictEqual(el('task-repeat-daily').checked, true);
});

// =============================================
console.log('\n\x1b[1m=== Section 9: syncTaskFormState (4) ===\x1b[0m');

it('noTime=true: dtInput disabled, blockWrap visible', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  call('syncTaskFormState', false);
  assert.strictEqual(el('task-datetime').disabled, true);
  assert.strictEqual(el('task-block-wrap').hidden, false);
});

it('noTime=false: dtInput enabled, blockWrap hidden', () => {
  setupForm();
  call('syncTaskFormState', false);
  assert.strictEqual(el('task-datetime').disabled, false);
  assert.strictEqual(el('task-block-wrap').hidden, true);
});

it('daily=true + noTime=false: dailyHint visible', () => {
  setupForm();
  el('task-repeat-daily').checked = true;
  call('syncTaskFormState', false);
  assert.strictEqual(el('task-daily-hint').hidden, false);
});

it('daily=false: dailyHint hidden', () => {
  setupForm();
  call('syncTaskFormState', false);
  assert.strictEqual(el('task-daily-hint').hidden, true);
});

// =============================================
console.log('\n\x1b[1m=== Section 10: resetTaskComposer (3) ===\x1b[0m');

it('resets text to empty', () => {
  setupForm();
  el('task-input').value = 'Old text';
  call('resetTaskComposer');
  assert.strictEqual(el('task-input').value, '');
});

it('resets repeatDaily to false', () => {
  setupForm();
  el('task-repeat-daily').checked = true;
  call('resetTaskComposer');
  assert.strictEqual(el('task-repeat-daily').checked, false);
});

it('resets noDateInput to false', () => {
  setupForm();
  el('task-no-datetime').checked = true;
  call('resetTaskComposer');
  assert.strictEqual(el('task-no-datetime').checked, false);
});

// =============================================
console.log('\n\x1b[1m=== Section 11: Preset dedup keys (4) ===\x1b[0m');

it('presetItemKey format is correct', () => {
  const key = call('presetItemKey', 'Teste', true, 'morning', '10:00');
  assert.strictEqual(key, 'teste::D::morning::10:00');
});

it('different daily flag → different key', () => {
  const k1 = call('presetItemKey', 'Test', false, 'morning', '');
  const k2 = call('presetItemKey', 'Test', true, 'morning', '');
  assert.notStrictEqual(k1, k2);
});

it('different block → different key', () => {
  const k1 = call('presetItemKey', 'Test', false, 'morning', '');
  const k2 = call('presetItemKey', 'Test', false, 'afternoon', '');
  assert.notStrictEqual(k1, k2);
});

it('taskToPresetKey matches presetItemKey format', () => {
  reloadState();
  g.timeblocks.morning = ['t1'];
  g.tasks.push({ id: 't1', text: 'Teste', datetime: '2026-09-07T10:00', repeatDaily: true, done: false });
  const key = vm.runInThisContext("taskToPresetKey(tasks[0])");
  assert.ok(key.includes('teste'));
  assert.ok(key.includes('D'));
});

// =============================================
console.log('\n\x1b[1m=== Section 12: normalizeStorage (4) ===\x1b[0m');

let normalizeCalls = 0;
function seedStorage() {
  store.set('mr_tasks', '[]');
  store.set('mr_dailyTaskLogs', '{}');
  store.set('mr_timeblocks', '{}');
  store.set('mr_dailyReset', '');
  store.set('mr_appSettings', '{}');
}
function setTasksGlobal(value) {
  vm.runInThisContext('tasks = ' + value);
  reloadState();
}

it('invalid tasks array → resets to []', () => {
  initGlobals();
  seedStorage();
  setTasksGlobal('"not-an-array"');
  call('normalizeStorage');
  reloadState();
  assert.ok(Array.isArray(g.tasks));
  assert.strictEqual(g.tasks.length, 0);
});

it('old "sem data" tasks → datetime empty, repeatDaily false', () => {
  initGlobals();
  seedStorage();
  setTasksGlobal('[{ id: "old1", text: "Legacy", datetime: null, repeatDaily: undefined, done: false }]');
  call('normalizeStorage');
  reloadState();
  assert.strictEqual(g.tasks[0].datetime, '');
  assert.strictEqual(g.tasks[0].repeatDaily, false);
});

it('daily tasks with time → preserved', () => {
  initGlobals();
  seedStorage();
  setTasksGlobal('[{ id: "d1", text: "Daily", datetime: "2026-09-07T10:00", repeatDaily: true, done: false }]');
  call('normalizeStorage');
  reloadState();
  assert.strictEqual(g.tasks[0].repeatDaily, true);
  assert.strictEqual(g.tasks[0].datetime, '2026-09-07T10:00');
});

it('tasks with missing id or text → filtered out', () => {
  initGlobals();
  seedStorage();
  setTasksGlobal('[ { text: "no-id" }, { id: "ok", text: "OK", datetime: "", repeatDaily: false, done: false } ]');
  call('normalizeStorage');
  reloadState();
  assert.strictEqual(g.tasks.length, 1);
  assert.strictEqual(g.tasks[0].id, 'ok');
});

// =============================================
console.log('\n\x1b[1m=== Section 13: pruneDailyLogs (3) ===\x1b[0m');

it('under max → no pruning', () => {
  reloadState();
  for (let i = 1; i <= 5; i++) g.dailyTaskLogs[`2026-09-0${i}`] = [];
  call('pruneDailyLogs', 14);
  reloadState();
  assert.strictEqual(Object.keys(g.dailyTaskLogs).length, 5);
});

it('over max → oldest removed', () => {
  reloadState();
  for (let i = 1; i <= 20; i++) g.dailyTaskLogs[`2026-09-${String(i).padStart(2, '0')}`] = [];
  call('pruneDailyLogs', 14);
  reloadState();
  assert.strictEqual(Object.keys(g.dailyTaskLogs).length, 14);
  assert.ok(!g.dailyTaskLogs['2026-09-01']);
  assert.ok(g.dailyTaskLogs['2026-09-20']);
});

it('empty logs → no error', () => {
  reloadState();
  call('pruneDailyLogs', 14);
  assert.strictEqual(Object.keys(g.dailyTaskLogs).length, 0);
});

// =============================================
console.log('\n\x1b[1m=== Section 14: applyPresetRoutine (6) ===\x1b[0m');

it('creates tasks from preset items', () => {
  call('applyPresetRoutine', 'treino-rapido');
  reloadState();
  assert.strictEqual(g.tasks.length, 3);
});

it('daily items get repeatDaily=true', () => {
  call('applyPresetRoutine', 'manha-produtiva');
  reloadState();
  assert.ok(g.tasks.every(t => t.repeatDaily === true));
});

it('items with time get datetime with today date', () => {
  call('applyPresetRoutine', 'bem-estar-noturno');
  reloadState();
  const withTime = g.tasks.find(t => t.datetime !== '');
  assert.ok(withTime);
  assert.strictEqual(withTime.datetime.slice(0, 10), todayStr());
  assert.strictEqual(withTime.datetime.slice(11), '22:00');
});

it('items without time get datetime empty', () => {
  call('applyPresetRoutine', 'treino-rapido');
  reloadState();
  assert.ok(g.tasks.every(t => t.datetime === ''));
});

it('already applied → no new tasks created', () => {
  call('applyPresetRoutine', 'treino-rapido');
  reloadState();
  const count = g.tasks.length;
  call('applyPresetRoutine', 'treino-rapido');
  reloadState();
  assert.strictEqual(g.tasks.length, count);
});

it('tasks without datetime added to blocks', () => {
  call('applyPresetRoutine', 'treino-rapido');
  reloadState();
  const inBlock = Object.values(g.timeblocks).flat();
  assert.strictEqual(inBlock.length, 3);
});

// =============================================
console.log('\n\x1b[1m=== Section 15: Backup/Import (3) ===\x1b[0m');

it('buildBackupPayload has version 3 and data keys', () => {
  const payload = call('buildBackupPayload');
  assert.strictEqual(payload.app, 'Minha Rotina');
  assert.strictEqual(payload.version, 3);
  assert.ok(typeof payload.exportedAt === 'string');
  assert.ok(payload.data && typeof payload.data === 'object');
});

it('extractBackupSnapshot with data wrapper or flat object', () => {
  const wrapped = call('extractBackupSnapshot', { app: 'x', data: { tasks: [] } });
  assert.ok(wrapped && wrapped.tasks);
  const flat = call('extractBackupSnapshot', { tasks: [], timeblocks: {} });
  assert.ok(flat && flat.tasks);
});

// =============================================
console.log(`\n\x1b[1m=== Results: ${passed}/${total} passed, ${failed} failed ===\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.desc}\n    ${f.error.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}