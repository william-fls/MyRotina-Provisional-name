// =============================================
// Minha Rotina — núcleo (estado, storage, navegação, modais)
// Vanilla JS. Mantém o modelo localStorage existente.
// =============================================

// ---- Storage: chaves estáveis (não renomear: quebra dados de usuários) ----
const STORAGE_KEYS = {
  tasks: 'mr_tasks',
  appSettings: 'mr_appSettings',
  dailyTaskLogs: 'mr_dailyTaskLogs',
  name: 'mr_name',
  theme: 'mr_theme',
  timeblocks: 'mr_timeblocks',
  dailyReset: 'mr_dailyReset',
};

function load(key, def) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? def : (JSON.parse(raw) ?? def);
  } catch { return def; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ---- Estado global ----
let tasks = load(STORAGE_KEYS.tasks, []);
let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});
let timeblocks = load(STORAGE_KEYS.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
let lastDayOpen = load(STORAGE_KEYS.dailyReset, '');
let appSettings = load(STORAGE_KEYS.appSettings, { showDashboardClock: true });
let editingTaskId = null;
let currentFilter = 'all';

// ---- Constantes ----
const EMPTY_TIMEBLOCKS = { morning: [], afternoon: [], evening: [], night: [] };
const DEFAULT_APP_SETTINGS = { showDashboardClock: true };
// Textos de demonstração de versões antigas: se for tudo que existe, limpa.
const DEMO_TASK_TEXTS = [
  'Verificar e-mails de trabalho',
  'Praticar exercício físico',
  'Ler por 20 minutos',
  'Planejar tarefas de amanhã',
];
// Migração única: chaves de recursos antigos removidos (hábitos, fitness,
// game, IA, sync, notificações...). Mantida para limpar navegadores de quem
// usou versões antigas. Pode ser removida em versão futura se não houver
// mais usuários legados.
const LEGACY_STORAGE_KEYS = [
  'mr_syncConfig', 'mr_syncMeta', 'mr_syncDeviceId',
  'mr_habits', 'mr_habitLogs', 'mr_taskPenaltyLog', 'mr_taskExerciseLog',
  'mr_exerciseChallenges', 'mr_gameState', 'mr_fitnessGameState',
  'mr_rewardLedger', 'mr_aiChatHistory', 'mr_aiSettings',
  'mr_fitnessProfile', 'mr_fitnessPlan', 'mr_fitnessLogs',
  'mr_fitnessWeightLog', 'mr_fitnessRoutine', 'mr_fitnessSelectableLogs',
  'mr_progressPhotos', 'mr_notificationSettings', 'mr_notificationLog',
  'mr_dashboardCardOrder', 'mr_dashboardCardVisibility', 'mr_lastDarkTheme',
  'mr_taskStats', 'mr_timeblockHistory',
];

function pruneLegacyStorage() {
  LEGACY_STORAGE_KEYS.forEach((key) => {
    try { localStorage.removeItem(key); } catch { /* ignora */ }
  });
}

// Mantém no máximo N dias de log de diárias (evita crescimento infinito).
function pruneDailyLogs(maxDays = 14) {
  const keys = Object.keys(dailyTaskLogs).sort();
  if (keys.length <= maxDays) return;
  keys.slice(0, keys.length - maxDays).forEach((k) => { delete dailyTaskLogs[k]; });
}

// ---- Normalização (compatível com dados existentes) ----
function normalizeStorage() {
  pruneLegacyStorage();
  tasks = Array.isArray(tasks) ? tasks : [];
  dailyTaskLogs = dailyTaskLogs && typeof dailyTaskLogs === 'object' ? dailyTaskLogs : {};
  timeblocks = timeblocks && typeof timeblocks === 'object' ? timeblocks : { ...EMPTY_TIMEBLOCKS };
  lastDayOpen = typeof lastDayOpen === 'string'
    ? lastDayOpen
    : (lastDayOpen?.lastDate || '');
  appSettings = appSettings && typeof appSettings === 'object'
    ? { showDashboardClock: appSettings.showDashboardClock !== false }
    : { ...DEFAULT_APP_SETTINGS };

  // Remove IDs de bloco que não correspondem a tarefas válidas sem hora marcada.
  const tasksById = new Map();
  tasks.forEach((task) => { if (task?.id && !tasksById.has(task.id)) tasksById.set(task.id, task); });
  Object.keys(EMPTY_TIMEBLOCKS).forEach((block) => {
    const ids = Array.isArray(timeblocks[block]) ? timeblocks[block] : [];
    timeblocks[block] = ids.filter((id) => isTaskPeriodAssignable(tasksById.get(id)));
  });
  tasks = tasks
    .filter((t) => t && typeof t.id === 'string' && typeof t.text === 'string')
    .map((task) => ({ ...task, repeatDaily: Boolean(task.repeatDaily), datetime: task.datetime || '' }));

  pruneDailyLogs();

  const onlyDemoTasks = tasks.length > 0 && tasks.every((task) => DEMO_TASK_TEXTS.includes(task.text));
  const hasNoActivity = Object.keys(dailyTaskLogs).length === 0 &&
    Object.values(timeblocks).every((ids) => Array.isArray(ids) && ids.length === 0);
  if (hasNoActivity && onlyDemoTasks) {
    tasks = [];
    dailyTaskLogs = {};
    timeblocks = { ...EMPTY_TIMEBLOCKS };
    save(STORAGE_KEYS.tasks, tasks);
    save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
    save(STORAGE_KEYS.timeblocks, timeblocks);
    if (load(STORAGE_KEYS.name, '') === 'Jota') localStorage.removeItem(STORAGE_KEYS.name);
  }

  save(STORAGE_KEYS.dailyReset, lastDayOpen);
  save(STORAGE_KEYS.appSettings, appSettings);
}

// =============================================
// Datas / tarefas (helpers puros)
// =============================================
function uid() { return Math.random().toString(36).slice(2, 10); }

function localDateKey(date = new Date()) {
  const safe = new Date(date);
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}-${String(safe.getDate()).padStart(2, '0')}`;
}
const todayKey = () => localDateKey(new Date());

function toInputDateTime(date) {
  const safe = new Date(date);
  safe.setSeconds(0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${safe.getFullYear()}-${p(safe.getMonth() + 1)}-${p(safe.getDate())}T${p(safe.getHours())}:${p(safe.getMinutes())}`;
}

function getDefaultTaskDateTime(baseDate = new Date()) {
  const safe = new Date(baseDate);
  safe.setSeconds(0, 0);
  const rounded = Math.ceil(safe.getMinutes() / 15) * 15;
  if (rounded === 60) safe.setHours(safe.getHours() + 1, 0, 0, 0);
  else safe.setMinutes(rounded, 0, 0);
  return toInputDateTime(safe);
}

function getTaskDateKey(task) {
  if (task?.datetime) return task.datetime.slice(0, 10);
  if (task?.created) {
    const d = new Date(task.created);
    if (!Number.isNaN(d.getTime())) return localDateKey(d);
  }
  return todayKey();
}

function getTaskEffectiveDateTime(task, dateKey = todayKey()) {
  if (!task?.datetime) return '';
  if (!task.repeatDaily) return task.datetime;
  const timePart = task.datetime.slice(11, 16) || '09:00';
  return `${dateKey}T${timePart}`;
}

function hasTaskDateTime(task) { return Boolean(task?.datetime); }

// Qualquer tarefa sem hora marcada pode ir para um período
// (pontual ou diária — o que vale é não ter datetime).
function isTaskPeriodAssignable(task) {
  return Boolean(task) && !hasTaskDateTime(task);
}

function getTaskAssignedBlock(taskId) {
  return Object.keys(timeblocks).find((block) => (timeblocks[block] || []).includes(taskId)) || '';
}

function isTaskForDate(task, dateKey = todayKey()) {
  if (!task) return false;
  if (task.repeatDaily) return true;
  if (hasTaskDateTime(task)) return getTaskDateKey(task) === dateKey;
  return Boolean(getTaskAssignedBlock(task.id));
}

function getTaskStateLabel(task) {
  if (task?.repeatDaily) return hasTaskDateTime(task) ? 'Diária' : 'Diária sem hora';
  if (hasTaskDateTime(task)) return 'Pontual';
  return 'Sem hora';
}

function getTodayTasks() {
  const today = todayKey();
  return tasks.filter((task) => isTaskForDate(task, today));
}

// =============================================
// UI pequena: toast, escape, texto
// =============================================
function showToast(title, body = '', tone = 'default') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  while (stack.children.length >= 3) stack.firstElementChild?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  const t = document.createElement('div');
  t.className = 'toast-title';
  t.textContent = title;
  toast.appendChild(t);
  if (body) {
    const b = document.createElement('div');
    b.className = 'toast-body';
    b.textContent = body;
    toast.appendChild(b);
  }
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
// Pisca o campo para indicar erro (keyframes estão no style.css).
function shake(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // reinicia a animação
  el.classList.add('shake');
}

function refreshUI() {
  renderDashboard();
  renderTasks();
  renderHeatmap();
  renderTimeBlocks();
  if (typeof renderPresetRoutines === 'function') renderPresetRoutines();
  renderSettingsPage();
}

// =============================================
// Novo dia / reset
// =============================================
function resetDayState({ manual = false, autoCycle = false } = {}) {
  const today = todayKey();
  tasks.forEach((task) => {
    if (task.repeatDaily) {
      if (autoCycle || manual) {
        task.done = false;
        if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
      }
    } else if (manual && isTaskForDate(task, today)) {
      task.done = false;
    }
  });
  // Virada automática: diárias sem hora mantêm o período (a rotina continua);
  // reinício manual zera tudo mesmo ("Tarefas e blocos zerados").
  const keepDailyBlocks = {};
  if (autoCycle) {
    const byId = new Map(tasks.map((t) => [t?.id, t]));
    Object.entries(timeblocks).forEach(([block, ids]) => {
      keepDailyBlocks[block] = (ids || []).filter((id) => {
        const t = byId.get(id);
        return t?.repeatDaily && !t.datetime;
      });
    });
  }
  timeblocks = { ...EMPTY_TIMEBLOCKS, ...(autoCycle ? keepDailyBlocks : {}) };
  save(STORAGE_KEYS.timeblocks, timeblocks);
  if (manual) {
    dailyTaskLogs[today] = [];
    save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
  }
  save(STORAGE_KEYS.tasks, tasks);
  lastDayOpen = today;
  save(STORAGE_KEYS.dailyReset, lastDayOpen);
  refreshUI();
  showToast(
    manual ? 'Reiniciado' : 'Novo dia',
    manual ? 'Tarefas e blocos zerados.' : 'Tarefas recomeçaram.',
    manual ? 'warn' : 'success',
  );
}

function checkNewDay() {
  const today = todayKey();
  if (!lastDayOpen) {
    lastDayOpen = today;
    save(STORAGE_KEYS.dailyReset, lastDayOpen);
    return false;
  }
  if (lastDayOpen === today) return false;
  resetDayState({ autoCycle: true });
  return true;
}

// =============================================
// Navegação (desktop + mobile, consistente)
// =============================================
const PAGES = ['dashboard', 'tasks', 'settings'];
const PAGE_LABELS = { dashboard: 'Hoje', tasks: 'Planejar', settings: 'Ajustes' };
const isValidPage = (p) => PAGES.includes(p);

function isMobileLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function setSidebarOpen(shouldOpen) {
  document.body.classList.toggle('sidebar-open', shouldOpen);
  const overlay = document.getElementById('sidebar-overlay');
  overlay?.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  const sidebar = document.getElementById('sidebar');
  sidebar?.setAttribute('aria-hidden', shouldOpen || !isMobileLayout() ? 'false' : 'true');
  document.querySelector('[data-action="toggle-sidebar"]')
    ?.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}
function toggleSidebar(force) {
  const shouldOpen = typeof force === 'boolean'
    ? force
    : !document.body.classList.contains('sidebar-open');
  setSidebarOpen(shouldOpen);
  // Ao abrir no mobile, foca o primeiro item; ao fechar, devolve ao botão.
  if (shouldOpen && isMobileLayout()) {
    document.querySelector('#sidebar .nav-item')?.focus();
  }
}
function closeSidebar() { setSidebarOpen(false); }

// Ativa o item certo na sidebar e no dock mobile (ignora botões "Ver mais").
function updateMobileNavigation(page) {
  const label = document.getElementById('mobile-page-label');
  if (label) label.textContent = PAGE_LABELS[page] || 'Minha Rotina';
  document.querySelectorAll('.nav-item, .mobile-dock-item').forEach((node) => {
    const isActive = node.getAttribute('data-page') === page;
    node.classList.toggle('active', isActive);
    if (node.matches('button')) {
      if (isActive) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    }
  });
}

function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  else if (page === 'tasks') {
    renderTasks();
    renderTimeBlocks();
    if (typeof renderPresetRoutines === 'function') renderPresetRoutines();
  } else if (page === 'settings') renderSettingsPage();
}

function navigate(page) {
  if (!isValidPage(page)) return;
  document.querySelectorAll('.page').forEach((p) => {
    const isTarget = p.id === `page-${page}`;
    p.classList.toggle('active', isTarget);
    if (isTarget) {
      p.removeAttribute('hidden');
      if (typeof p.scrollTo === 'function') p.scrollTo({ top: 0 });
    }
  });
  updateMobileNavigation(page);
  if (isMobileLayout()) closeSidebar();
  scrollToTop();
  renderPage(page);
}

// =============================================
// Relógio / saudação
// =============================================
function startClock() {
  const tick = () => {
    const greetEl = document.getElementById('greeting-text');
    if (greetEl) {
      const hr = new Date().getHours();
      greetEl.textContent = hr < 12 ? 'Bom dia,' : hr < 18 ? 'Boa tarde,' : 'Boa noite,';
    }
  };
  tick();
  setInterval(tick, 60000);
}

// =============================================
// Nome
// =============================================
function updateUserName(name) {
  const safeName = name || 'você';
  const el = document.getElementById('user-name');
  if (el) el.textContent = safeName;
  document.title = name ? `Minha Rotina - ${name}` : 'Minha Rotina';
}
function initName() {
  const name = (load(STORAGE_KEYS.name, '') || '').trim();
  updateUserName(name);
  if (!name) openNameModal();
}
function openNameModal() {
  const input = document.getElementById('name-input');
  if (input) input.value = load(STORAGE_KEYS.name, '');
  openModal('modal-name');
}
function saveName() {
  const input = document.getElementById('name-input');
  const n = (input?.value || '').trim();
  if (n) save(STORAGE_KEYS.name, n);
  else localStorage.removeItem(STORAGE_KEYS.name);
  updateUserName(n);
  renderSettingsPage();
  closeModal('modal-name');
}

// =============================================
// Backup / import / export (modelo compatível v3)
// =============================================
function buildBackupSnapshot() {
  return {
    tasks, dailyTaskLogs, timeblocks, lastDayOpen, appSettings,
    name: load(STORAGE_KEYS.name, ''),
    theme: getCurrentThemeId(),
  };
}
function buildBackupPayload() {
  return { app: 'Minha Rotina', version: 3, exportedAt: new Date().toISOString(), data: buildBackupSnapshot() };
}
function exportData() {
  const blob = new Blob([JSON.stringify(buildBackupPayload(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `minha-rotina-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Exportado', 'Arquivo pronto.', 'success');
}
function triggerImportData() {
  document.getElementById('import-backup-file')?.click();
}
function extractBackupSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.data && typeof raw.data === 'object') return raw.data;
  return raw;
}
function applyImportedBackup(snapshot, { showSuccessToast = true } = {}) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  tasks = Array.isArray(source.tasks) ? source.tasks : [];
  dailyTaskLogs = source.dailyTaskLogs && typeof source.dailyTaskLogs === 'object' ? source.dailyTaskLogs : {};
  timeblocks = source.timeblocks && typeof source.timeblocks === 'object' ? source.timeblocks : { ...EMPTY_TIMEBLOCKS };
  lastDayOpen = typeof source.lastDayOpen === 'string'
    ? source.lastDayOpen
    : (source.dailyReset?.lastDate || '');
  appSettings = source.appSettings && typeof source.appSettings === 'object'
    ? { showDashboardClock: source.appSettings.showDashboardClock !== false }
    : { ...DEFAULT_APP_SETTINGS };

  const importedName = typeof source.name === 'string' ? source.name.trim() : '';
  if (importedName) save(STORAGE_KEYS.name, importedName);
  else localStorage.removeItem(STORAGE_KEYS.name);

  applyTheme(typeof source.theme === 'string' ? source.theme : DEFAULT_THEME_ID, { persist: true });

  normalizeStorage();
  updateUserName(importedName);
  checkNewDay();
  refreshUI();
  if (showSuccessToast) showToast('Importado', 'Backup aplicado.', 'success');
}
async function importDataFromFile(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const snapshot = extractBackupSnapshot(JSON.parse(await file.text()));
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Formato inválido');
    showConfirm('Substituir dados?', 'Dados atuais serão substituídos pelo arquivo.', () => applyImportedBackup(snapshot));
  } catch {
    showToast('Falhou', 'Arquivo inválido.', 'danger');
  } finally {
    if (input) input.value = '';
  }
}
// Mantida global para o input file (também ligada via addEventListener).
window.importDataFromFile = importDataFromFile;

function clearAllDataNow() {
  Object.keys(localStorage).forEach((key) => { if (key.startsWith('mr_')) localStorage.removeItem(key); });
  tasks = [];
  dailyTaskLogs = {};
  timeblocks = { ...EMPTY_TIMEBLOCKS };
  lastDayOpen = '';
  appSettings = { ...DEFAULT_APP_SETTINGS };
  normalizeStorage();
  applyTheme(DEFAULT_THEME_ID, { persist: true });
  initName();
  refreshUI();
  navigate('dashboard');
  showToast('Excluído', 'Todos os dados removidos.', 'success');
}
function clearAllData() {
  showConfirm('Excluir tudo?', 'Dados, configurações e backups serão apagados. Irreversível.', () => {
    const confirmation = window.prompt('Digite EXCLUIR para confirmar:');
    if ((confirmation || '').trim().toUpperCase() !== 'EXCLUIR') {
      showToast('Cancelado', 'Nenhum dado apagado.', 'warn');
      return;
    }
    clearAllDataNow();
  });
}

// =============================================
// Modais
// =============================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector('input, button, select, textarea')?.focus();
}
function closeModal(id) {
  const modal = typeof id === 'string' ? document.getElementById(id) : id;
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}
let confirmCallback = () => {};
function showConfirm(title, msg, cb = () => {}) {
  setEl('confirm-title', title);
  setEl('confirm-msg', msg);
  confirmCallback = cb;
  openModal('modal-confirm');
}
function confirmDialogYes() {
  const cb = confirmCallback;
  confirmCallback = () => {};
  closeModal('modal-confirm');
  cb();
}

// =============================================
// Eventos: delegação (clique + change + teclado)
// =============================================
function handleActionClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action, page, filter, taskId, block } = target.dataset;
  // Tema usa data-theme-id; presets usam data-preset-id (compat: aceita ambos).
  const themeId = target.dataset.themeId || target.dataset.presetId;
  const presetId = target.dataset.presetId || target.dataset.themeId;

  switch (action) {
    case 'navigate': if (page) navigate(page); break;
    case 'toggle-sidebar': toggleSidebar(); break;
    case 'close-sidebar': closeSidebar(); break;
    case 'filter-tasks': if (filter) filterTasks(filter, target); break;
    case 'toggle-task-composer': toggleTaskComposer(); break;
    case 'add-task': addTask(); break;
    case 'clear-done-tasks': clearDoneTasks(); break;
    case 'restart-day': restartDay(); break;
    case 'export-data': exportData(); break;
    case 'import-data': triggerImportData(); break;
    case 'clear-all-data': clearAllData(); break;
    case 'open-name-modal': openNameModal(); break;
    case 'save-name': saveName(); break;
    case 'save-edit-task': saveEditTask(); break;
    case 'confirm-yes': confirmDialogYes(); break;
    case 'close-modal': {
      const modal = target.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
      break;
    }
    case 'toggle-task': if (taskId) toggleTask(taskId); break;
    case 'edit-task': if (taskId) editTask(taskId); break;
    case 'delete-task': if (taskId) deleteTask(taskId); break;
    case 'move-to-block': if (taskId && block) moveTaskToBlock(taskId, block); break;
    case 'remove-from-block': if (taskId && block) removeFromBlock(taskId, block); break;
    case 'apply-preset': if (presetId) applyPresetRoutine(presetId); break;
    case 'focus-task-input': focusTaskInput(); break;
    case 'set-theme': if (themeId) setTheme(themeId); break;
    // sync-task-form é tratado no evento 'change' (mais confiável p/ checkbox).
    default: break;
  }
}

// Checkbox do formulário: 'change' garante o estado já atualizado.
function handleFormChange(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'sync-task-form') syncTaskFormState(false);
  else if (target.dataset.action === 'sync-task-form-edit') syncTaskFormState(true);
  else if (target.id === 'settings-clock-toggle') toggleDashboardClock();
}

// Fecha modal clicando no fundo.
function handleOverlayClick(event) {
  if (event.target.classList?.contains('modal-overlay')) closeModal(event.target.id);
  if (event.target.id === 'sidebar-overlay') closeSidebar();
}

function handleKeydown(event) {
  if (event.key === 'Enter' && document.activeElement?.id === 'task-input') {
    event.preventDefault();
    addTask();
  }
  // Acessibilidade: div.task-check com role=checkbox responde a Enter/Espaço.
  if ((event.key === 'Enter' || event.key === ' ') && document.activeElement?.matches?.('.task-check[role="checkbox"]')) {
    const id = document.activeElement.getAttribute('data-task-id');
    if (id) {
      event.preventDefault();
      toggleTask(id);
    }
  }
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach((m) => closeModal(m.id));
    closeSidebar();
  }
}

// =============================================
// Init
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', handleActionClick);
  document.body.addEventListener('change', handleFormChange);
  document.addEventListener('click', handleOverlayClick, true);
  document.addEventListener('keydown', handleKeydown);

  // Botão fixo de confirmação (evita onclick inline duplicado).
  document.getElementById('confirm-yes-btn')
    ?.addEventListener('click', confirmDialogYes);
  // Backup: sem inline onchange no HTML.
  document.getElementById('import-backup-file')
    ?.addEventListener('change', importDataFromFile);

  initTheme();
  normalizeStorage();

  const nowValue = getDefaultTaskDateTime();
  const addInput = document.getElementById('task-datetime');
  const editInput = document.getElementById('edit-task-datetime');
  if (addInput && !addInput.value) addInput.value = nowValue;
  if (editInput && !editInput.value) editInput.value = nowValue;

  if (typeof initTaskComposer === 'function') initTaskComposer();
  else syncTaskFormState();

  initName();
  checkNewDay();
  startClock();
  refreshUI();
  updateMobileNavigation('dashboard');

  if (typeof lucide !== 'undefined') lucide.createIcons();

  window.addEventListener('resize', () => { if (!isMobileLayout()) closeSidebar(); });
  window.addEventListener('focus', () => { checkNewDay(); refreshUI(); });
  setInterval(() => {
    checkNewDay();
    if (document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard();
  }, 60000);
});
