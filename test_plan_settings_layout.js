// test_plan_settings_layout.js — 30 testes: estrutura HTML/CSS (3 páginas), presets, breakpoints
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const pages = {};
let html = '';
let css = '';

let passed = 0, failed = 0, total = 0;
const failures = [];

function it(desc, fn) {
  total++;
  try {
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

function loadSources() {
  // Mocks mínimos: tasks.js registra listeners no top-level.
  if (typeof document === 'undefined') {
    global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    global.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
    global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  }
  pages.index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  pages.planejar = fs.readFileSync(path.join(root, 'planejar.html'), 'utf8');
  pages.ajustes = fs.readFileSync(path.join(root, 'ajustes.html'), 'utf8');
  html = pages.index + '\n' + pages.planejar + '\n' + pages.ajustes;
  css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const code = fs.readFileSync(path.join(root, 'scripts', 'pages', 'tasks.js'), 'utf8');
  vm.runInThisContext(code, { filename: 'scripts/pages/tasks.js' });
}
loadSources();

// =============================================
console.log('\n\x1b[1m=== Section 1: IDs essenciais no HTML (15) ===\x1b[0m');

function hasId(id) { return html.includes(`id="${id}"`); }

it('page-dashboard existe', () => assert.ok(hasId('page-dashboard')));
it('page-tasks existe', () => assert.ok(hasId('page-tasks')));
it('page-settings existe', () => assert.ok(hasId('page-settings')));

it('formulário criar: task-input, task-datetime', () => {
  assert.ok(hasId('task-input'));
  assert.ok(hasId('task-datetime'));
});

it('opções criar: task-no-datetime e task-repeat-daily', () => {
  assert.ok(hasId('task-no-datetime'));
  assert.ok(hasId('task-repeat-daily'));
});

it('select de período existe (task-block)', () => assert.ok(hasId('task-block')));

it('formulário editar: edit-task-text/datetime/block', () => {
  assert.ok(hasId('edit-task-text'));
  assert.ok(hasId('edit-task-datetime'));
  assert.ok(hasId('edit-task-block'));
});

it('opções editar existem', () => {
  assert.ok(hasId('edit-task-no-datetime'));
  assert.ok(hasId('edit-task-repeat-daily'));
});

it('settings-clock-toggle existe', () => assert.ok(hasId('settings-clock-toggle')));

it('preset-grid e weekly-heatmap existem', () => {
  assert.ok(hasId('preset-grid'));
  assert.ok(hasId('weekly-heatmap'));
});

it('modais: confirm, edit-task, name', () => {
  assert.ok(hasId('modal-confirm'));
  assert.ok(hasId('modal-edit-task'));
  assert.ok(hasId('modal-name'));
});

it('cada página tem sua seção (sem vazar)', () => {
  assert.ok(pages.index.includes('id="page-dashboard"'));
  assert.ok(!pages.index.includes('id="page-tasks"'));
  assert.ok(!pages.index.includes('id="page-settings"'));
  assert.ok(pages.planejar.includes('id="page-tasks"'));
  assert.ok(!pages.planejar.includes('id="page-dashboard"'));
  assert.ok(pages.ajustes.includes('id="page-settings"'));
  assert.ok(!pages.ajustes.includes('id="page-dashboard"'));
});

it('navegação por links com ativo fixo por página', () => {
  assert.ok(pages.index.includes('href="./planejar.html"'));
  assert.ok(pages.planejar.includes('href="./ajustes.html"'));
  assert.ok(pages.ajustes.includes('href="./index.html"'));
  assert.ok(!html.includes('data-action="navigate"'));
});

it('sem drawer/topbar mortos (sem overlay, sem hamburger)', () => {
  assert.ok(!html.includes('sidebar-overlay'));
  assert.ok(!html.includes('mobile-topbar'));
  assert.ok(!html.includes('toggle-sidebar'));
});

it('toast-stack e import-backup-file existem', () => {
  assert.ok(hasId('toast-stack'));
  assert.ok(hasId('import-backup-file'));
});

// =============================================
console.log('\n\x1b[1m=== Section 2: HTML limpo (6) ===\x1b[0m');

it('zero atributos onclick inline', () => {
  assert.ok(!/onclick\s*=/i.test(html));
});

it('zero atributos onchange inline', () => {
  assert.ok(!/onchange\s*=/i.test(html));
});

it('zero atributos oninput inline', () => {
  assert.ok(!/oninput\s*=/i.test(html));
});

it('scripts do Hoje em ordem (sem app.js)', () => {
  const order = ['scripts/core/theme.js', 'scripts/core/store.js', 'scripts/core/shell.js', 'scripts/pages/dashboard.js'];
  const idx = order.map(s => pages.index.indexOf(s));
  assert.ok(idx.every(i => i >= 0));
  assert.ok(idx[0] < idx[1] && idx[1] < idx[2] && idx[2] < idx[3]);
  assert.ok(!pages.index.includes('app.js'));
});

it('scripts do Planejar em ordem (sem app.js)', () => {
  const order = ['scripts/core/theme.js', 'scripts/core/store.js', 'scripts/core/shell.js', 'scripts/pages/tasks.js'];
  const idx = order.map(s => pages.planejar.indexOf(s));
  assert.ok(idx.every(i => i >= 0));
  assert.ok(idx[0] < idx[1] && idx[1] < idx[2] && idx[2] < idx[3]);
  assert.ok(!pages.planejar.includes('app.js'));
});

it('scripts dos Ajustes em ordem (sem app.js)', () => {
  const order = ['scripts/core/theme.js', 'scripts/core/store.js', 'scripts/core/shell.js', 'scripts/pages/settings.js'];
  const idx = order.map(s => pages.ajustes.indexOf(s));
  assert.ok(idx.every(i => i >= 0));
  assert.ok(idx[0] < idx[1] && idx[1] < idx[2] && idx[2] < idx[3]);
  assert.ok(!pages.ajustes.includes('app.js'));
});

// =============================================
console.log('\n\x1b[1m=== Section 3: Modelos pré-definidos (5) ===\x1b[0m');

it('PRESET_ROUTINES tem 5 rotinas', () => {
  assert.strictEqual(vm.runInThisContext('PRESET_ROUTINES.length'), 5);
});

it('ids dos presets são únicos', () => {
  const ids = vm.runInThisContext('PRESET_ROUTINES.map(p => p.id)');
  assert.strictEqual(new Set(ids).size, 5);
});

it('manha-produtiva: 3 diárias sem hora no bloco Manhã', () => {
  const p = vm.runInThisContext(`getPresetRoutine('manha-produtiva')`);
  assert.strictEqual(p.items.length, 3);
  assert.ok(p.items.every(i => i.daily === true && i.block === 'morning' && !i.time));
});

it('bem-estar-noturno inclui diária com hora 22:00', () => {
  const p = vm.runInThisContext(`getPresetRoutine('bem-estar-noturno')`);
  const withTime = p.items.find(i => i.time);
  assert.ok(withTime);
  assert.strictEqual(withTime.time, '22:00');
  assert.strictEqual(withTime.daily, true);
});

it('treino-rapido: 3 pontuais sem hora no bloco Manhã', () => {
  const p = vm.runInThisContext(`getPresetRoutine('treino-rapido')`);
  assert.strictEqual(p.items.length, 3);
  assert.ok(p.items.every(i => i.block === 'morning' && !i.daily));
});

// =============================================
console.log('\n\x1b[1m=== Section 4: CSS layout (4) ===\x1b[0m');

it('CSS tem media query max-width: 768px', () => {
  assert.ok(/@media[\s\S]*max-width:\s*768px/.test(css));
});

it('grid do dashboard com .no-focus definido', () => {
  assert.ok(/\.no-focus/.test(css));
});

it('classes do formulário presentes: .option-toggle, .task-block-panel', () => {
  assert.ok(/\.option-toggle/.test(css));
  assert.ok(/\.task-block-panel/.test(css));
});

it('classes de bloco de período presentes', () => {
  assert.ok(css.includes('.time-block'));
  assert.ok(css.includes('morning'));
});

// =============================================
console.log(`\n\x1b[1m=== Results: ${passed}/${total} passed, ${failed} failed ===\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.desc}\n    ${f.error.split('\n').slice(0, 4).join('\n    ')}`));
  process.exit(1);
}