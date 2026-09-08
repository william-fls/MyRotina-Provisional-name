// =============================================
// Minha Rotina — store compartilhado (estado, storage, tarefas, backup)
// Carregado em TODAS as páginas, antes de shell.js e do script da página.
// Vanilla JS, funções globais. Modelo localStorage inalterado.
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

// ---- Estado global (fonte única; storage é a verdade entre páginas) ----
let tasks = load(STORAGE_KEYS.tasks, []);
let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});
let timeblocks = load(STORAGE_KEYS.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
let lastDayOpen = load(STORAGE_KEYS.dailyReset, '');
let appSettings = load(STORAGE_KEYS.appSettings, { showDashboardClock: true });

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
// Datas / tarefas (helpers puros e compartilhados)
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

function getTaskBlockLabel(taskId) {
  const map = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', night: 'Madrugada' };
  return map[getTaskAssignedBlock(taskId)] || '';
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

function getCurrentTimeBlock() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function getTimeBlockMeta(block) {
  const map = {
    morning: { label: 'Manhã', range: '06:00 - 12:00' },
    afternoon: { label: 'Tarde', range: '12:00 - 18:00' },
    evening: { label: 'Noite', range: '18:00 - 22:00' },
    night: { label: 'Madrugada', range: '22:00 - 06:00' },
  };
  return map[block] || map.morning;
}

function formatDT(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function isDashboardClockEnabled() {
  return appSettings.showDashboardClock !== false;
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
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

// =============================================
// Aviso de mudança: cada página registra seu render.
// Mutações do store avisam a página atual (substitui o refreshUI global).
// =============================================
let storeChangedHandler = null;
function setStoreChangedHandler(fn) {
  storeChangedHandler = typeof fn === 'function' ? fn : null;
}
function emitStoreChanged() {
  if (storeChangedHandler) storeChangedHandler();
}

// =============================================
// Mutações de tarefas usadas em mais de uma página
// =============================================
function setDailyLog(taskId, done) {
  const today = todayKey();
  if (!dailyTaskLogs[today]) dailyTaskLogs[today] = [];
  if (done) {
    if (!dailyTaskLogs[today].includes(taskId)) dailyTaskLogs[today].push(taskId);
  } else {
    dailyTaskLogs[today] = dailyTaskLogs[today].filter((x) => x !== taskId);
  }
  save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  const willBeDone = !t.done;
  if (t.repeatDaily) setDailyLog(id, willBeDone);
  t.done = willBeDone;
  t.completedAt = willBeDone ? new Date().toISOString() : '';
  save(STORAGE_KEYS.tasks, tasks);
  emitStoreChanged();
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
  emitStoreChanged();
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
  emitStoreChanged();
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
  // Volta para o Hoje com estado limpo (recarrega a partir do storage).
  window.location.href = './index.html';
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
