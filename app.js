
    // =============================================
    // STATE & STORAGE
    // =============================================
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
      try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
    }
    function save(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    }

    let tasks = load(STORAGE_KEYS.tasks, []);
    let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});
    let timeblocks = load(STORAGE_KEYS.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
    let lastDayOpen = load(STORAGE_KEYS.dailyReset, '');
    let appSettings = load(STORAGE_KEYS.appSettings, { showDashboardClock: true });
    let editingTaskId = null;
    let currentFilter = 'all';

    function localDateKey(date = new Date()) {
      const safe = new Date(date);
      return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}-${String(safe.getDate()).padStart(2, '0')}`;
    }

    const todayKey = () => localDateKey(new Date());
    const EMPTY_TIMEBLOCKS = { morning: [], afternoon: [], evening: [], night: [] };
    const DEMO_TASK_TEXTS = [
      'Verificar e-mails de trabalho',
      'Praticar exercício físico',
      'Ler por 20 minutos',
      'Planejar tarefas de amanhã',
    ];
    const DEFAULT_APP_SETTINGS = { showDashboardClock: true };
    const DEPRECATED_STORAGE_KEYS = [
      'mr_syncConfig',
      'mr_syncMeta',
      'mr_syncDeviceId',
      'mr_habits',
      'mr_habitLogs',
      'mr_taskPenaltyLog',
      'mr_taskExerciseLog',
      'mr_exerciseChallenges',
      'mr_gameState',
      'mr_fitnessGameState',
      'mr_rewardLedger',
      'mr_aiChatHistory',
      'mr_aiSettings',
      'mr_fitnessProfile',
      'mr_fitnessPlan',
      'mr_fitnessLogs',
      'mr_fitnessWeightLog',
      'mr_fitnessRoutine',
      'mr_fitnessSelectableLogs',
      'mr_progressPhotos',
      'mr_notificationSettings',
      'mr_notificationLog',
      'mr_dashboardCardOrder',
      'mr_dashboardCardVisibility',
      'mr_lastDarkTheme',
      'mr_taskStats',
      'mr_timeblockHistory',
    ];

    function clearDeprecatedStorageKeys() {
      DEPRECATED_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    }

    // =============================================
    // STORAGE NORMALIZATION
    // =============================================
    function normalizeStorage() {
      clearDeprecatedStorageKeys();
      tasks = Array.isArray(tasks) ? tasks : [];
      dailyTaskLogs = dailyTaskLogs && typeof dailyTaskLogs === 'object' ? dailyTaskLogs : {};
      timeblocks = timeblocks && typeof timeblocks === 'object' ? timeblocks : { ...EMPTY_TIMEBLOCKS };
      lastDayOpen = typeof lastDayOpen === 'string'
        ? lastDayOpen
        : (lastDayOpen?.lastDate || '');
      appSettings = appSettings && typeof appSettings === 'object'
        ? { showDashboardClock: appSettings.showDashboardClock !== false }
        : { ...DEFAULT_APP_SETTINGS };

      const tasksById = new Map();
      tasks.forEach(task => {
        if (!tasksById.has(task.id)) tasksById.set(task.id, task);
      });
      Object.keys(EMPTY_TIMEBLOCKS).forEach(block => {
        const blockTasks = Array.isArray(timeblocks[block]) ? timeblocks[block] : [];
        timeblocks[block] = blockTasks.filter(taskId => isTaskPeriodAssignable(tasksById.get(taskId)));
      });
      tasks = tasks.map(task => ({
        ...task,
        repeatDaily: Boolean(task.repeatDaily),
        datetime: task.datetime || '',
      }));

      const onlyDemoTasks = tasks.length > 0 && tasks.every(task => DEMO_TASK_TEXTS.includes(task.text));
      const hasNoActivity = !Object.keys(dailyTaskLogs).length &&
        Object.values(timeblocks).every(blockTasks => Array.isArray(blockTasks) && blockTasks.length === 0);

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

    function uid() { return Math.random().toString(36).slice(2, 10); }

    function toInputDateTime(date) {
      const safe = new Date(date);
      safe.setSeconds(0, 0);
      return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}-${String(safe.getDate()).padStart(2, '0')}T${String(safe.getHours()).padStart(2, '0')}:${String(safe.getMinutes()).padStart(2, '0')}`;
    }

    function getDefaultTaskDateTime(baseDate = new Date()) {
      const safe = new Date(baseDate);
      safe.setSeconds(0, 0);
      const roundedMinutes = Math.ceil(safe.getMinutes() / 15) * 15;
      if (roundedMinutes === 60) {
        safe.setHours(safe.getHours() + 1, 0, 0, 0);
      } else {
        safe.setMinutes(roundedMinutes, 0, 0);
      }
      return toInputDateTime(safe);
    }

    function getTaskDateKey(task) {
      if (task.datetime) return task.datetime.slice(0, 10);
      if (task.created) return localDateKey(new Date(task.created));
      return todayKey();
    }

    function getTaskEffectiveDateTime(task, dateKey = todayKey()) {
      if (!task.datetime) return '';
      if (!task.repeatDaily) return task.datetime;
      const timePart = task.datetime.slice(11, 16) || '09:00';
      return `${dateKey}T${timePart}`;
    }

    function hasTaskDateTime(task) {
      return Boolean(task?.datetime);
    }

    function isTaskPeriodAssignable(task) {
      return Boolean(task) && !task.repeatDaily && !hasTaskDateTime(task);
    }

    function getTaskAssignedBlock(taskId) {
      return Object.keys(timeblocks).find(block => (timeblocks[block] || []).includes(taskId)) || '';
    }

    function isTaskForDate(task, dateKey = todayKey()) {
      if (!task) return false;
      if (task.repeatDaily) return true;
      if (hasTaskDateTime(task)) return getTaskDateKey(task) === dateKey;
      return Boolean(getTaskAssignedBlock(task.id));
    }

    function getTaskStateLabel(task) {
      if (task.repeatDaily) return 'Diária';
      if (hasTaskDateTime(task)) return 'Pontual';
      return 'Sem data';
    }

    function syncTaskFormState(isEdit = false) {
      const repeatCheckbox = document.getElementById(isEdit ? 'edit-task-repeat-daily' : 'task-repeat-daily');
      const dtInput = document.getElementById(isEdit ? 'edit-task-datetime' : 'task-datetime');
      const noDateToggle = document.getElementById(isEdit ? 'edit-task-no-datetime' : 'task-no-datetime');
      const dtWrap = document.getElementById(isEdit ? 'edit-task-datetime-wrap' : 'task-datetime-wrap');
      const blockWrap = document.getElementById(isEdit ? 'edit-task-block-wrap' : 'task-block-wrap');
      const blockSelect = document.getElementById(isEdit ? 'edit-task-block' : 'task-block');
      const noDate = Boolean(noDateToggle?.checked);
      if (repeatCheckbox) {
        repeatCheckbox.disabled = noDate;
        if (noDate) repeatCheckbox.checked = false;
      }
      if (dtInput) {
        dtInput.disabled = noDate;
        if (!noDate && !dtInput.value) dtInput.value = getDefaultTaskDateTime();
      }
      if (dtWrap) {
        if (isEdit) {
          dtWrap.hidden = noDate;
        } else {
          dtWrap.hidden = false;
          dtWrap.classList.toggle('is-no-date-active', noDate);
        }
      }
      if (blockWrap) blockWrap.hidden = !noDate;
      if (!noDate && blockSelect) blockSelect.value = '';
      if (!noDate && repeatCheckbox?.checked && dtInput?.value) {
        const current = new Date(dtInput.value);
        if (!Number.isNaN(current.getTime())) {
          const normalized = new Date();
          normalized.setHours(current.getHours(), current.getMinutes(), 0, 0);
          dtInput.value = toInputDateTime(normalized);
        }
      }
    }

    function getTodayTasks() {
      const today = todayKey();
      return tasks.filter(task => isTaskForDate(task, today));
    }

    function showToast(title, body = '', tone = 'default') {
      const stack = document.getElementById('toast-stack');
      if (!stack) return;
      while (stack.children.length >= 3) {
        stack.firstElementChild?.remove();
      }
      const toast = document.createElement('div');
      toast.className = `toast ${tone}`;
      toast.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div>${body ? `<div class="toast-body">${escapeHtml(body)}</div>` : ''}`;
      stack.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
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

    function refreshUI() {
      renderDashboard();
      renderTasks();
      renderHeatmap();
      renderTimeBlocks();
      if (typeof renderPresetRoutines === 'function') renderPresetRoutines();
      renderSettingsPage();
    }

    function resetDayState({ manual = false, autoCycle = false } = {}) {
      const today = todayKey();
      tasks.forEach(task => {
        if (task.repeatDaily) {
          if (autoCycle || manual) {
            task.done = false;
            if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
          }
        } else if (manual && isTaskForDate(task, today)) {
          task.done = false;
        }
      });
      timeblocks = { ...EMPTY_TIMEBLOCKS };
      save(STORAGE_KEYS.timeblocks, timeblocks);
      if (manual) {
        dailyTaskLogs[today] = [];
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
      }
      save(STORAGE_KEYS.tasks, tasks);
      lastDayOpen = today;
      save(STORAGE_KEYS.dailyReset, lastDayOpen);
      refreshUI();
      if (manual) {
        showToast('Reiniciado', 'Tarefas e blocos zerados.', 'warn');
      } else {
        showToast('Novo dia', 'Tarefas recomeçaram.', 'success');
      }
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
    // THEME & LAYOUT
    // =============================================
    function isMobileLayout() {
      return window.matchMedia('(max-width: 768px)').matches;
    }
    function toggleSidebar(force) {
      const shouldOpen = typeof force === 'boolean' ? force : !document.body.classList.contains('sidebar-open');
      document.body.classList.toggle('sidebar-open', shouldOpen);
    }
    function closeSidebar() {
      toggleSidebar(false);
    }
    function updateMobileNavigation(page) {
      const pageMap = {
        dashboard: 'Hoje',
        tasks: 'Planejar',
        settings: 'Ajustes',
      };
      const label = document.getElementById('mobile-page-label');
      if (label) label.textContent = pageMap[page] || 'Minha Rotina';
      document.querySelectorAll('[data-page]').forEach(node => {
        node.classList.toggle('active', node.getAttribute('data-page') === page);
      });
    }
    function navigate(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`)?.classList.add('active');
      updateMobileNavigation(page);
      if (isMobileLayout()) closeSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'tasks':
          renderTasks();
          renderTimeBlocks();
          if (typeof renderPresetRoutines === 'function') renderPresetRoutines();
          break;
        case 'settings': renderSettingsPage(); break;
      }
    }

    // =============================================
    // CLOCK
    // =============================================
    function startClock() {
      function tick() {
        const now = new Date();
        const greetEl = document.getElementById('greeting-text');
        if (greetEl) {
          const hr = now.getHours();
          greetEl.textContent = hr < 12 ? 'Bom dia,' : hr < 18 ? 'Boa tarde,' : 'Boa noite,';
        }
      }
      tick();
      setInterval(tick, 60000);
    }

    // =============================================
    // NAME
    // =============================================
    function updateUserName(name) {
      const safeName = name || 'você';
      const userNameEl = document.getElementById('user-name');
      if (userNameEl) userNameEl.textContent = safeName;
      document.title = name ? `Minha Rotina - ${name}` : 'Minha Rotina';
    }
    function initName() {
      const name = (load(STORAGE_KEYS.name, '') || '').trim();
      updateUserName(name);
      if (!name) openNameModal();
    }
    function openNameModal() {
      document.getElementById('name-input').value = load(STORAGE_KEYS.name, '');
      openModal('modal-name');
    }
    function saveName() {
      const n = document.getElementById('name-input').value.trim();
      if (n) save(STORAGE_KEYS.name, n);
      else localStorage.removeItem(STORAGE_KEYS.name);
      updateUserName(n);
      renderSettingsPage();
      closeModal('modal-name');
    }

    // =============================================
    // BACKUP / IMPORT / EXPORT
    // =============================================
    function buildBackupSnapshot() {
      return {
        tasks,
        dailyTaskLogs,
        timeblocks,
        lastDayOpen,
        appSettings,
        name: load(STORAGE_KEYS.name, ''),
        theme: getCurrentThemeId(),
      };
    }

    function buildBackupPayload() {
      return {
        app: 'Minha Rotina',
        version: 3,
        exportedAt: new Date().toISOString(),
        data: buildBackupSnapshot(),
      };
    }

    function exportData() {
      const payload = buildBackupPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minha-rotina-${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exportado', 'Arquivo pronto.', 'success');
    }

    function triggerImportData() {
      document.getElementById('import-backup-file')?.click();
    }

    function extractBackupSnapshot(rawPayload) {
      if (!rawPayload || typeof rawPayload !== 'object') return null;
      if (rawPayload.data && typeof rawPayload.data === 'object') return rawPayload.data;
      return rawPayload;
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

      const importedTheme = typeof source.theme === 'string' ? source.theme : DEFAULT_THEME_ID;
      applyTheme(importedTheme, { persist: true });

      normalizeStorage();
      checkNewDay();
      refreshUI();
      if (typeof renderSettingsPage === 'function') renderSettingsPage();
      if (showSuccessToast) {
        showToast('Importado', 'Backup aplicado.', 'success');
      }
    }

    async function importDataFromFile(event) {
      const input = event?.target;
      const file = input?.files?.[0];
      if (!file) return;
      try {
        const rawText = await file.text();
        const parsed = JSON.parse(rawText);
        const snapshot = extractBackupSnapshot(parsed);
        if (!snapshot || typeof snapshot !== 'object') throw new Error('Formato inválido');
        showConfirm(
          'Substituir dados?',
          'Dados atuais serão substituídos pelo arquivo.',
          () => applyImportedBackup(snapshot)
        );
      } catch {
        showToast('Falhou', 'Arquivo inválido.', 'danger');
      } finally {
        if (input) input.value = '';
      }
    }

    function clearAllDataNow() {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mr_')) localStorage.removeItem(key);
      });
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
      showConfirm(
        'Excluir tudo?',
        'Dados, configurações e backups serão apagados. Irreversível.',
        () => {
          const confirmation = window.prompt('Digite EXCLUIR para confirmar:');
          if ((confirmation || '').trim().toUpperCase() !== 'EXCLUIR') {
            showToast('Cancelado', 'Nenhum dado apagado.', 'warn');
            return;
          }
          clearAllDataNow();
        }
      );
    }

    // =============================================
    // MODAL HELPERS
    // =============================================
    function openModal(id) { document.getElementById(id)?.classList.add('open'); }
    function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

    function showConfirm(title, msg, cb = () => {}) {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent = msg;
      document.getElementById('confirm-yes-btn').onclick = () => { cb(); closeModal('modal-confirm'); };
      openModal('modal-confirm');
    }

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    });

    // =============================================
    // DOM HELPERS
    // =============================================
    function setEl(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }
    function setStyle(id, prop, val) { const e = document.getElementById(id); if (e) e.style[prop] = val; }
    function shake(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.animation = 'shake 0.3s ease';
      el.addEventListener('animationend', () => el.style.animation = '', { once: true });
    }

    const style = document.createElement('style');
    style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`;
    document.head.appendChild(style);

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.activeElement.id === 'task-input') addTask();
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        closeSidebar();
      }
    });

    // =============================================
    // INIT
    // =============================================
    document.addEventListener('DOMContentLoaded', () => {
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
      renderSettingsPage();
      if (typeof lucide !== 'undefined') lucide.createIcons();
      window.addEventListener('resize', () => {
        if (!isMobileLayout()) closeSidebar();
      });
      window.addEventListener('focus', () => {
        checkNewDay();
        refreshUI();
      });
      setInterval(() => {
        checkNewDay();
        if (document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard();
      }, 60000);
    });
