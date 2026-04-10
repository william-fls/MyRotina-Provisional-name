
    // =============================================
    // STATE & STORAGE
    // =============================================
    const STORAGE_KEYS = {
      tasks: 'mr_tasks',
      fitnessProfile: 'mr_fitnessProfile',
      fitnessPlan: 'mr_fitnessPlan',
      fitnessLogs: 'mr_fitnessLogs',
      fitnessWeightLog: 'mr_fitnessWeightLog',
      progressPhotos: 'mr_progressPhotos',
      appSettings: 'mr_appSettings',
      dailyTaskLogs: 'mr_dailyTaskLogs',
      taskStats: 'mr_taskStats',
      name: 'mr_name',
      theme: 'mr_theme',
      timeblocks: 'mr_timeblocks',
      dailyReset: 'mr_dailyReset',
      notificationSettings: 'mr_notificationSettings',
      notificationLog: 'mr_notificationLog',
      timeblockHistory: 'mr_timeblockHistory',
      aiChatHistory: 'mr_aiChatHistory',
      aiSettings: 'mr_aiSettings',
    };

    function load(key, def) {
      try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
    }
    function save(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    }

    let tasks = load(STORAGE_KEYS.tasks, []);
    let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});
    let taskStats = load(STORAGE_KEYS.taskStats, {});
    let timeblocks = load(STORAGE_KEYS.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
    let timeblockHistory = load(STORAGE_KEYS.timeblockHistory, {});
    let dailyReset = load(STORAGE_KEYS.dailyReset, { lastDate: '', totalResets: 0 });
    let notificationSettings = load(STORAGE_KEYS.notificationSettings, { enabled: false, permission: 'default', reminderMinutes: 15, dailyBriefing: true, eveningNudge: true });
    let notificationLog = load(STORAGE_KEYS.notificationLog, {});
    let fitnessProfile = load(STORAGE_KEYS.fitnessProfile, null);
    let fitnessPlan = load(STORAGE_KEYS.fitnessPlan, null);
    let fitnessLogs = load(STORAGE_KEYS.fitnessLogs, {});
    let fitnessWeightLog = load(STORAGE_KEYS.fitnessWeightLog, []);
    let progressPhotos = load(STORAGE_KEYS.progressPhotos, []);
    let appSettings = load(STORAGE_KEYS.appSettings, { showDashboardClock: true });
    let aiSettings = load(STORAGE_KEYS.aiSettings, null);
    let editingTaskId = null;
    let currentFilter = 'all';
    let pendingProgressPhotoData = '';

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
    const DEFAULT_NOTIFICATION_SETTINGS = { enabled: false, permission: 'default', reminderMinutes: 15, dailyBriefing: true, eveningNudge: true };
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
    ];
    const AI_PROVIDER_META = {
      gemini: {
        label: 'Google Gemini',
        type: 'gemini',
        defaultModel: 'gemini-2.5-flash',
        baseUrl: 'https://generativelanguage.googleapis.com',
        keyLabel: 'Chave do Google Gemini',
        keyPlaceholder: 'AIzaSy...',
        modelPlaceholder: 'gemini-2.5-flash',
        showBaseUrl: false,
        supportsJsonMode: true,
      },
      openai: {
        label: 'OpenAI (ChatGPT)',
        type: 'openai_compat',
        defaultModel: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        keyLabel: 'Chave da OpenAI',
        keyPlaceholder: 'sk-...',
        modelPlaceholder: 'gpt-4o-mini',
        showBaseUrl: true,
        supportsJsonMode: true,
      },
      groq: {
        label: 'Groq',
        type: 'openai_compat',
        defaultModel: 'llama-3.3-70b-versatile',
        baseUrl: 'https://api.groq.com/openai/v1',
        keyLabel: 'Chave da Groq',
        keyPlaceholder: 'gsk_...',
        modelPlaceholder: 'llama-3.3-70b-versatile',
        showBaseUrl: true,
        supportsJsonMode: true,
      },
      mistral: {
        label: 'Mistral',
        type: 'openai_compat',
        defaultModel: 'mistral-small-latest',
        baseUrl: 'https://api.mistral.ai/v1',
        keyLabel: 'Chave da Mistral',
        keyPlaceholder: 'mistral_...',
        modelPlaceholder: 'mistral-small-latest',
        showBaseUrl: true,
        supportsJsonMode: true,
      },
      custom: {
        label: 'OpenAI compatível (custom)',
        type: 'openai_compat',
        defaultModel: '',
        baseUrl: '',
        keyLabel: 'Chave do provedor',
        keyPlaceholder: 'sua-chave',
        modelPlaceholder: 'seu-modelo',
        showBaseUrl: true,
        supportsJsonMode: false,
        allowCustomBase: true,
      },
    };
    const DEFAULT_AI_SETTINGS = {
      provider: 'gemini',
      providers: Object.fromEntries(
        Object.entries(AI_PROVIDER_META).map(([id, meta]) => ([
          id,
          { key: '', model: meta.defaultModel || '', baseUrl: meta.baseUrl || '' },
        ]))
      ),
    };
    function normalizeAiSettings(raw) {
      const safe = raw && typeof raw === 'object' ? raw : {};
      const provider = AI_PROVIDER_META[safe.provider] ? safe.provider : DEFAULT_AI_SETTINGS.provider;
      const sourceProviders = safe.providers && typeof safe.providers === 'object'
        ? { ...safe.providers }
        : {};
      if (!Object.keys(sourceProviders).length) {
        const legacyProvider = AI_PROVIDER_META[safe.provider] ? safe.provider : DEFAULT_AI_SETTINGS.provider;
        const hasLegacyFlatConfig = typeof safe.key === 'string'
          || typeof safe.model === 'string'
          || typeof safe.baseUrl === 'string';
        if (hasLegacyFlatConfig) {
          sourceProviders[legacyProvider] = {
            key: typeof safe.key === 'string' ? safe.key : '',
            model: typeof safe.model === 'string' ? safe.model : '',
            baseUrl: typeof safe.baseUrl === 'string' ? safe.baseUrl : '',
          };
        }
      }
      const providers = {};
      Object.keys(AI_PROVIDER_META).forEach(id => {
        const meta = AI_PROVIDER_META[id];
        const entry = sourceProviders[id];
        providers[id] = {
          key: typeof entry?.key === 'string' ? entry.key : '',
          model: typeof entry?.model === 'string' && entry.model ? entry.model : (meta.defaultModel || ''),
          baseUrl: typeof entry?.baseUrl === 'string' && entry.baseUrl ? entry.baseUrl : (meta.baseUrl || ''),
        };
      });
      return { provider, providers };
    }

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
      taskStats = taskStats && typeof taskStats === 'object' ? taskStats : {};
      timeblocks = timeblocks && typeof timeblocks === 'object' ? timeblocks : { ...EMPTY_TIMEBLOCKS };
      timeblockHistory = timeblockHistory && typeof timeblockHistory === 'object' ? timeblockHistory : {};
      dailyReset = dailyReset && typeof dailyReset === 'object' ? { lastDate: dailyReset.lastDate || '', totalResets: dailyReset.totalResets || 0 } : { lastDate: '', totalResets: 0 };
      notificationSettings = notificationSettings && typeof notificationSettings === 'object'
        ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...notificationSettings }
        : { ...DEFAULT_NOTIFICATION_SETTINGS };
      appSettings = appSettings && typeof appSettings === 'object'
        ? { showDashboardClock: appSettings.showDashboardClock !== false }
        : { ...DEFAULT_APP_SETTINGS };
      aiSettings = normalizeAiSettings(aiSettings);
      notificationLog = notificationLog && typeof notificationLog === 'object' ? notificationLog : {};
      progressPhotos = Array.isArray(progressPhotos) ? progressPhotos : [];
      const tasksById = new Map();
      tasks.forEach(task => {
        if (!tasksById.has(task.id)) tasksById.set(task.id, task);
      });
      Object.keys(EMPTY_TIMEBLOCKS).forEach(block => {
        const blockTasks = Array.isArray(timeblocks[block]) ? timeblocks[block] : [];
        timeblocks[block] = blockTasks.filter(taskId => isTaskPeriodAssignable(tasksById.get(taskId)));
      });
      tasks = tasks.map(task => {
        const normalized = {
          ...task,
          repeatDaily: Boolean(task.repeatDaily),
          createdByAI: Boolean(task.createdByAI),
          datetime: task.datetime || '',
        };
        delete normalized.priority;
        delete normalized.hasExercise;
        delete normalized.hasPenalty;
        return normalized;
      });
      progressPhotos = progressPhotos
        .filter(photo => photo && typeof photo === 'object' && photo.image)
        .map(photo => ({
          id: photo.id || uid(),
          date: photo.date || todayKey(),
          image: photo.image,
          note: photo.note || '',
          createdAt: photo.createdAt || new Date().toISOString(),
        }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

      const onlyDemoTasks = tasks.length > 0 && tasks.every(task => DEMO_TASK_TEXTS.includes(task.text));

      const hasNoActivity = !Object.keys(dailyTaskLogs).length && !Object.keys(taskStats).length &&
        Object.values(timeblocks).every(blockTasks => Array.isArray(blockTasks) && blockTasks.length === 0);

      if (hasNoActivity && onlyDemoTasks) {
        tasks = [];
        dailyTaskLogs = {};
        taskStats = {};
        timeblocks = { ...EMPTY_TIMEBLOCKS };
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
        save(STORAGE_KEYS.taskStats, taskStats);
        save(STORAGE_KEYS.timeblocks, timeblocks);
        if (load(STORAGE_KEYS.name, '') === 'Jota') localStorage.removeItem(STORAGE_KEYS.name);
      }

      save(STORAGE_KEYS.dailyReset, dailyReset);
      save(STORAGE_KEYS.notificationSettings, notificationSettings);
      save(STORAGE_KEYS.appSettings, appSettings);
      save(STORAGE_KEYS.aiSettings, aiSettings);
      save(STORAGE_KEYS.notificationLog, notificationLog);
      save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
      save(STORAGE_KEYS.progressPhotos, progressPhotos);
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

    function seedTaskDateTimeInputs() {
      const nowValue = getDefaultTaskDateTime();
      const addInput = document.getElementById('task-datetime');
      const editInput = document.getElementById('edit-task-datetime');
      if (addInput && !addInput.value) addInput.value = nowValue;
      if (editInput && !editInput.value) editInput.value = nowValue;
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

    function updateTodayTaskStats() {
      const today = todayKey();
      const todayTasks = getTodayTasks();
      taskStats[today] = {
        total: todayTasks.length,
        done: todayTasks.filter(t => t.done).length,
      };
      save(STORAGE_KEYS.taskStats, taskStats);
    }

    function isNotificationsSupported() {
      return typeof window !== 'undefined' && 'Notification' in window;
    }

    function isSecureNotificationContext() {
      return typeof window !== 'undefined' && window.isSecureContext;
    }

    function isMobileClient() {
      return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    }

    function isIosClient() {
      return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    }

    function isStandaloneMode() {
      return typeof window !== 'undefined'
        && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
    }

    function syncNotificationPermission(persist = true) {
      const permission = isNotificationsSupported() ? Notification.permission : 'unsupported';
      notificationSettings.permission = permission;
      if (permission !== 'granted') notificationSettings.enabled = false;
      if (persist) save(STORAGE_KEYS.notificationSettings, notificationSettings);
      return permission;
    }

    const ASSET_VERSION = '2026-04-03-v5';
    let serviceWorkerReadyPromise = null;

    function ensureServiceWorkerReady() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !isSecureNotificationContext()) {
        return Promise.resolve(null);
      }
      if (!serviceWorkerReadyPromise) {
        serviceWorkerReadyPromise = navigator.serviceWorker
          .register(`./sw.js?v=${ASSET_VERSION}`, { updateViaCache: 'none' })
          .then(() => navigator.serviceWorker.ready)
          .catch(() => null);
      }
      return serviceWorkerReadyPromise;
    }

    function getNotificationEnvironment() {
      const permission = syncNotificationPermission(false);
      const supported = isNotificationsSupported();
      const secure = isSecureNotificationContext();
      const mobile = isMobileClient();
      const ios = isIosClient();
      const standalone = isStandaloneMode();
      return {
        supported,
        secure,
        mobile,
        ios,
        standalone,
        permission,
        enabled: notificationSettings.enabled && permission === 'granted',
      };
    }

    function getNotificationSupportText(env = getNotificationEnvironment()) {
      if (!env.supported) return 'Este navegador não expõe notificações do sistema neste modo.';
      if (!env.secure) return 'Abra o app por HTTPS ou localhost para liberar alertas do sistema.';
      if (env.enabled) return `Ativas com lembrete ${notificationSettings.reminderMinutes} min antes das tarefas com horário.`;
      return 'Ative para receber lembretes do dia e alertas de tarefa.';
    }

    function getMobileNotificationHint(env = getNotificationEnvironment()) {
      if (!env.supported) return 'Se o navegador bloquear essa API, os avisos continuam aparecendo dentro do app.';
      if (!env.secure) return 'No celular, notificações dependem de HTTPS ou localhost.';
      if (env.ios && !env.standalone) return 'No iPhone e iPad, instale o app na Tela de Início para receber notificações.';
      if (env.mobile) return 'No celular, instalar o app na tela inicial deixa os alertas mais estáveis.';
      return 'No computador, os alertas aparecem direto pelo navegador.';
    }

    function showToast(title, body = '', tone = 'default') {
      const stack = document.getElementById('toast-stack');
      if (!stack) return;
      while (stack.children.length >= 3) {
        stack.firstElementChild?.remove();
      }
      const toast = document.createElement('div');
      toast.className = `toast ${tone}`;
      toast.innerHTML = `<div class="toast-title">${title}</div>${body ? `<div class="toast-body">${body}</div>` : ''}`;
      stack.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        setTimeout(() => toast.remove(), 220);
      }, 3200);
    }

    function formatTimeOnly(dt) {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function truncateText(text, max = 52) {
      return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
    }

    function escapeHtml(text = '') {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getMonthKey(date = new Date()) {
      const safe = new Date(date);
      return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}`;
    }

    function formatMonthLabel(monthKey) {
      const [year, month] = String(monthKey || '').split('-').map(Number);
      if (!year || !month) return 'Mês';
      return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    function renderAutomationPanel() {}

    function refreshUI() {
      renderDashboard();
      renderTasks();
      renderHeatmap();
      renderTimeBlocks();
      renderSettingsPage();
      if (document.getElementById('page-fitness')?.classList.contains('active')) renderFitnessPage();
      if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
    }
    function resetDayState({ manual = false, autoCycle = false } = {}) {
      const today = todayKey();
      
      tasks.forEach(task => {
        if (autoCycle) {
          if (task.repeatDaily) {
            task.done = false;
            if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
          }
        } else if (manual) {
          if (isTaskForDate(task, today)) {
            task.done = false;
          }
          if (task.repeatDaily) {
             task.done = false;
             if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
          }
        }
      });
      
      timeblocks = { ...EMPTY_TIMEBLOCKS };
      save(STORAGE_KEYS.timeblocks, timeblocks);
      
      if (manual) {
        dailyTaskLogs[today] = [];
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
      }
      
      updateTodayTaskStats();
      save(STORAGE_KEYS.tasks, tasks);
      
      if (autoCycle) {
         dailyReset.totalResets = (dailyReset.totalResets || 0) + 1;
      }

      dailyReset.lastDate = today;
      save(STORAGE_KEYS.dailyReset, dailyReset);
      
      renderAutomationPanel();
      refreshUI();
      
      if (manual) {
        showToast('Dia reiniciado', 'Tarefas, blocos e dados de hoje foram zerados.', 'warn');
      } else {
        showToast('Novo dia iniciado', 'As tarefas foram resetadas e a agenda ficou pronta.', 'success');
        sendBrowserNotification(`new-day-${today}`, 'Novo dia liberado', 'Suas tarefas voltaram ao início para um novo ciclo.');
      }
    }

    function checkNewDay() {
      const today = todayKey();
      if (!dailyReset.lastDate) {
        dailyReset.lastDate = today;
        save(STORAGE_KEYS.dailyReset, dailyReset);
        updateTodayTaskStats();
        return false;
      }
      if (dailyReset.lastDate === today) return false;
      resetDayState({ autoCycle: true });
      return true;
    }

    async function sendBrowserNotification(id, title, body) {
      const env = getNotificationEnvironment();
      if (!env.supported || env.permission !== 'granted') return false;
      if (!notificationSettings.enabled || notificationLog[id]) return false;
      try {
        const registration = await ensureServiceWorkerReady();
        const options = {
          body,
          tag: id,
          icon: './icons/app-icon.svg',
          badge: './icons/app-badge.svg',
          data: { url: './index.html' },
        };
        if (registration?.showNotification) {
          await registration.showNotification(title, options);
        } else {
          const notification = new Notification(title, options);
          notification.onclick = () => window.focus();
        }
        notificationLog[id] = new Date().toISOString();
        save(STORAGE_KEYS.notificationLog, notificationLog);
        return true;
      } catch {
        return false;
      }
    }

    async function toggleNotifications() {
      const env = getNotificationEnvironment();
      if (!env.supported) {
        showToast('Notificações indisponíveis', 'Seu navegador pode bloquear avisos externos neste modo.', 'warn');
        return;
      }

      if (!env.secure) {
        showToast('Use HTTPS ou localhost', 'No celular, notificações do sistema exigem um contexto seguro.', 'warn');
        return;
      }

      if (env.ios && !env.standalone) {
        showToast('Instale na Tela de Início', 'No iPhone e iPad, abra Compartilhar > Adicionar à Tela de Início para liberar notificações.', 'warn');
        renderSettingsPage();
        return;
      }

      syncNotificationPermission(false);
      if (notificationSettings.enabled && Notification.permission === 'granted') {
        notificationSettings.enabled = false;
        save(STORAGE_KEYS.notificationSettings, notificationSettings);
        renderAutomationPanel();
        renderSettingsPage();
        showToast('Notificações pausadas', 'Os avisos continuarão aparecendo dentro do app.', 'warn');
        return;
      }

      try {
        await ensureServiceWorkerReady();
        const permission = await Notification.requestPermission();
        notificationSettings.permission = permission;
        notificationSettings.enabled = permission === 'granted';
        save(STORAGE_KEYS.notificationSettings, notificationSettings);
        renderAutomationPanel();
        renderSettingsPage();
        if (permission === 'granted') {
          const mobileHint = getMobileNotificationHint(getNotificationEnvironment());
          showToast('Notificações ativadas', mobileHint, 'success');
          sendBrowserNotification(`enabled-${todayKey()}`, 'Notificações ativadas', 'Tudo pronto para te lembrar do que importa.');
        } else {
          showToast('Permissão não concedida', 'Os lembretes externos ficaram desativados por enquanto.', 'warn');
        }
      } catch {
        showToast('Não foi possível ativar', 'O navegador recusou a solicitação de notificações.', 'warn');
      }
    }

    function checkReminderNotifications() {
      const now = Date.now();
      const today = todayKey();
      const leadTime = (notificationSettings.reminderMinutes || 15) * 60 * 1000;
      tasks.filter(task => !task.done && task.datetime && (task.repeatDaily || isTaskForDate(task, today))).forEach(task => {
        const effectiveDateTime = getTaskEffectiveDateTime(task);
        const dueAt = new Date(effectiveDateTime).getTime();
        if (!Number.isFinite(dueAt)) return;
        const diff = dueAt - now;
        const baseId = `${task.id}-${effectiveDateTime}`;
        if (diff > 0 && diff <= leadTime) {
          sendBrowserNotification(`soon-${baseId}`, 'Tarefa chegando', `${truncateText(task.text, 44)} às ${formatTimeOnly(effectiveDateTime)}.`);
        }
        if (diff <= 0 && diff > -30 * 60 * 1000) {
          sendBrowserNotification(`due-${baseId}`, 'Hora da tarefa', `${truncateText(task.text, 44)} está no horário marcado.`);
        }
      });
    }

    function checkDailyBriefing() {
      const now = new Date();
      const today = todayKey();
      if (!notificationSettings.dailyBriefing || now.getHours() < 7) return;
      const pendingTasks = getTodayTasks().filter(task => !task.done).length;
      const habits = tasks.filter(task => task.repeatDaily);
      const doneHabits = habits.filter(task => (dailyTaskLogs[today] || []).includes(task.id)).length;
      const pendingHabits = Math.max(habits.length - doneHabits, 0);
      if (!pendingTasks && !pendingHabits) return;
      sendBrowserNotification(`briefing-${today}`, 'Plano do dia', `Você tem ${pendingTasks} tarefas e ${pendingHabits} hábitos para hoje.`);
    }

    function checkEveningNudge() {
      const now = new Date();
      const today = todayKey();
      if (!notificationSettings.eveningNudge || now.getHours() < 18) return;
      const pendingTasks = getTodayTasks().filter(task => !task.done).length;
      if (!pendingTasks) return;
      sendBrowserNotification(`evening-${today}`, 'Fechamento do dia', `Ainda faltam ${pendingTasks} tarefas para fechar o dia.`);
    }

    function checkNotificationEngine() {
      renderAutomationPanel();
      if (!notificationSettings.enabled) return;
      checkDailyBriefing();
      checkEveningNudge();
      checkReminderNotifications();
    }

    // =============================================
    // THEME
    // =============================================
    function isMobileLayout() {
      return window.matchMedia('(max-width: 900px)').matches;
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
        dashboard: 'Dashboard',
        tasks: 'Planejamento',
        ai: 'Assistente',
        fitness: 'Exercícios',
        stats: 'Estatísticas',
        settings: 'Configurações',
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
        case 'dashboard':
          renderDashboard();
          break;
        case 'tasks':
          renderTasks();
          renderTimeBlocks();
          break;
        case 'stats':
          renderStats();
          break;
        case 'fitness':
          renderFitnessPage();
          break;
        case 'settings':
          renderSettingsPage();
          break;
      }
    }

    // =============================================
    // CLOCK
    // =============================================
    function startClock() {
      function tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const el = document.getElementById('clock-display');
        if (el) el.textContent = `${h}:${m}:${s}`;
        const dateEl = document.getElementById('date-display');
        if (dateEl) {
          const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          dateEl.textContent = now.toLocaleDateString('pt-BR', opts);
        }
        // greeting
        const greetEl = document.getElementById('greeting');
        if (greetEl) {
          const hr = now.getHours();
          greetEl.textContent = hr < 12 ? 'Bom dia!' : hr < 18 ? 'Boa tarde!' : 'Boa noite!';
        }
      }
      tick();
      setInterval(tick, 1000);
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
    // TIPS
    // =============================================
    const TIPS = [
      'Comece pelo mais difícil enquanto sua energia está alta.',
      'Uma tarefa de cada vez. Foco também é produtividade.',
      'Hábitos consistentes vencem motivação passageira.',
      'Se não der para fazer perfeito, faça o possível.',
      'Pausas curtas ajudam a manter ritmo ao longo do dia.',
      'Seu eu de amanhã agradece o que você organiza hoje.',
      'Pequenos avanços diários acumulam muito resultado.',
      'Separe blocos de foco e blocos de descanso para render melhor.',
      'Revise o dia no fim da tarde e ajuste o que ficou pendente.',
      'Quando travar, comece pela menor próxima ação.',
    ];

    function snapshotHasMeaningfulData(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return false;
      if (Array.isArray(snapshot.tasks) && snapshot.tasks.length > 0) return true;
      if (Array.isArray(snapshot.progressPhotos) && snapshot.progressPhotos.length > 0) return true;
      if (Array.isArray(snapshot.aiChatHistory) && snapshot.aiChatHistory.length > 0) return true;
      if (Array.isArray(snapshot.fitnessWeightLog) && snapshot.fitnessWeightLog.length > 0) return true;
      if (snapshot.fitnessProfile && typeof snapshot.fitnessProfile === 'object') return true;
      if (snapshot.fitnessPlan && typeof snapshot.fitnessPlan === 'object') return true;
      if (typeof snapshot.name === 'string' && snapshot.name.trim()) return true;
      const objectKeys = [
        snapshot.dailyTaskLogs,
        snapshot.taskStats,
        snapshot.fitnessLogs,
      ];
      if (objectKeys.some(entry => entry && typeof entry === 'object' && Object.keys(entry).length > 0)) return true;
      if (snapshot.timeblocks && typeof snapshot.timeblocks === 'object') {
        const hasTaskInBlock = Object.values(snapshot.timeblocks).some(block => Array.isArray(block) && block.length > 0);
        if (hasTaskInBlock) return true;
      }
      return false;
    }

    function buildBackupSnapshot() {
      return {
        tasks,
        dailyTaskLogs,
        taskStats,
        timeblocks,
        timeblockHistory,
        dailyReset,
        notificationSettings,
        notificationLog,
        appSettings,
        progressPhotos,
        fitnessProfile,
        fitnessPlan,
        fitnessLogs,
        fitnessWeightLog,
        aiSettings,
        aiChatHistory: load(STORAGE_KEYS.aiChatHistory, []),
        name: load(STORAGE_KEYS.name, ''),
        theme: getCurrentThemeId(),
        dashboardCardOrder: typeof loadDashboardCardOrder === 'function' ? loadDashboardCardOrder() : null,
        dashboardCardVisibility: typeof loadDashboardCardVisibility === 'function' ? loadDashboardCardVisibility() : null,
      };
    }

    function buildBackupPayload() {
      return {
        app: 'Minha Rotina',
        version: 2,
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
      showToast('Backup exportado', 'Arquivo pronto para usar no celular ou no PC.', 'success');
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
      taskStats = source.taskStats && typeof source.taskStats === 'object' ? source.taskStats : {};
      timeblocks = source.timeblocks && typeof source.timeblocks === 'object' ? source.timeblocks : { ...EMPTY_TIMEBLOCKS };
      timeblockHistory = source.timeblockHistory && typeof source.timeblockHistory === 'object' ? source.timeblockHistory : {};
      dailyReset = source.dailyReset && typeof source.dailyReset === 'object'
        ? source.dailyReset
        : { lastDate: '', totalResets: 0 };
      notificationSettings = source.notificationSettings && typeof source.notificationSettings === 'object'
        ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...source.notificationSettings }
        : { ...DEFAULT_NOTIFICATION_SETTINGS };
      notificationLog = source.notificationLog && typeof source.notificationLog === 'object' ? source.notificationLog : {};
      appSettings = source.appSettings && typeof source.appSettings === 'object'
        ? { showDashboardClock: source.appSettings.showDashboardClock !== false }
        : { ...DEFAULT_APP_SETTINGS };
      progressPhotos = Array.isArray(source.progressPhotos) ? source.progressPhotos : [];
      fitnessProfile = source.fitnessProfile && typeof source.fitnessProfile === 'object' ? source.fitnessProfile : null;
      fitnessPlan = source.fitnessPlan && typeof source.fitnessPlan === 'object' ? source.fitnessPlan : null;
      fitnessLogs = source.fitnessLogs && typeof source.fitnessLogs === 'object' ? source.fitnessLogs : {};
      fitnessWeightLog = Array.isArray(source.fitnessWeightLog) ? source.fitnessWeightLog : [];
      aiSettings = source.aiSettings && typeof source.aiSettings === 'object' ? source.aiSettings : null;

      const importedChat = Array.isArray(source.aiChatHistory) ? source.aiChatHistory : [];
      save(STORAGE_KEYS.aiChatHistory, importedChat);
      if (typeof aiChatHistory !== 'undefined') aiChatHistory = importedChat;

      const importedName = typeof source.name === 'string' ? source.name.trim() : '';
      if (importedName) save(STORAGE_KEYS.name, importedName);
      else localStorage.removeItem(STORAGE_KEYS.name);

      const importedTheme = typeof source.theme === 'string' ? source.theme : DEFAULT_THEME_ID;
      applyTheme(importedTheme, { persist: true });

      if (Array.isArray(source.dashboardCardOrder) && typeof persistDashboardCardOrder === 'function') {
        persistDashboardCardOrder(source.dashboardCardOrder);
      }
      if (source.dashboardCardVisibility && typeof source.dashboardCardVisibility === 'object'
        && typeof persistDashboardCardVisibility === 'function') {
        persistDashboardCardVisibility(source.dashboardCardVisibility);
      }

      normalizeStorage();
      syncNotificationPermission();
      syncAiProviderLabels();
      syncDashboardClockVisibility();
      if (typeof updateTodayTaskStats === 'function') updateTodayTaskStats();
      if (typeof checkNewDay === 'function') checkNewDay();
      renderTip();
      refreshUI();
      if (typeof renderAIChatHistory === 'function') renderAIChatHistory();
      if (typeof renderFitnessPage === 'function') renderFitnessPage();
      if (typeof renderSettingsPage === 'function') renderSettingsPage();
      if (showSuccessToast) {
        showToast('Dados importados', 'Backup aplicado com sucesso neste dispositivo.', 'success');
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
          'Vincular progresso neste dispositivo?',
          'Isso vai substituir os dados atuais deste navegador pelos dados do arquivo selecionado.',
          () => applyImportedBackup(snapshot)
        );
      } catch {
        showToast('Importação falhou', 'Arquivo inválido ou corrompido. Verifique o backup e tente novamente.', 'danger');
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
      taskStats = {};
      timeblocks = { ...EMPTY_TIMEBLOCKS };
      timeblockHistory = {};
      dailyReset = { lastDate: '', totalResets: 0 };
      notificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
      notificationLog = {};
      appSettings = { ...DEFAULT_APP_SETTINGS };
      progressPhotos = [];
      fitnessProfile = null;
      fitnessPlan = null;
      fitnessLogs = {};
      fitnessWeightLog = [];
      aiSettings = normalizeAiSettings(null);
      save(STORAGE_KEYS.aiChatHistory, []);
      if (typeof aiChatHistory !== 'undefined') aiChatHistory = [];

      normalizeStorage();
      applyTheme(DEFAULT_THEME_ID, { persist: true });
      syncNotificationPermission();
      if (typeof persistDashboardCardOrder === 'function') {
        persistDashboardCardOrder(getDefaultDashboardCardOrder());
      }
      if (typeof persistDashboardCardVisibility === 'function') {
        persistDashboardCardVisibility(getDefaultDashboardCardVisibility());
      }
      syncAiProviderLabels();
      syncDashboardClockVisibility();
      initName();
      renderTip();
      refreshUI();
      if (typeof renderAIChatHistory === 'function') renderAIChatHistory();
      if (typeof renderFitnessPage === 'function') renderFitnessPage();
      if (typeof renderSettingsPage === 'function') renderSettingsPage();
      navigate('dashboard');
      showToast('Dados excluídos', 'Todos os dados locais deste navegador foram removidos.', 'success');
    }

    function clearAllData() {
      showConfirm(
        'Excluir todos os dados?',
        'Esta ação apaga tarefas, hábitos, progresso fitness, histórico do Assistente e configurações locais. Não pode ser desfeita.',
        () => {
          const confirmation = window.prompt('Digite EXCLUIR para confirmar:');
          if ((confirmation || '').trim().toUpperCase() !== 'EXCLUIR') {
            showToast('Ação cancelada', 'Nenhum dado foi apagado.', 'warn');
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

    // Close modals on overlay click
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

    // Add shake keyframe
    const style = document.createElement('style');
    style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`;
    document.head.appendChild(style);

    // Enter key to add task
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.activeElement.id === 'task-input') addTask();

      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        if (typeof toggleTaskComposer === 'function') toggleTaskComposer(false);
        closeSidebar();
      }
    });

    // =============================================
    // AI PROVIDERS
    // =============================================
    // CSS spin animation for loader
    (function() {
      const s = document.createElement('style');
      s.textContent = '@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }';
      document.head.appendChild(s);
    })();


    // =============================================
    // INIT
    // =============================================
    document.addEventListener('DOMContentLoaded', () => {
      initTheme();
      normalizeStorage();
      syncAiProviderLabels();
      syncNotificationPermission();
      ensureServiceWorkerReady();
      seedTaskDateTimeInputs();
      if (typeof initTaskComposer === 'function') initTaskComposer();
      else syncTaskFormState();
      if (typeof initTaskAssistantPanel === 'function') initTaskAssistantPanel();
      syncTaskFormState(true);
      initName();
      updateTodayTaskStats();
      checkNewDay();
      renderTip();
      startClock();
      refreshUI();
      updateMobileNavigation('dashboard');
      renderSettingsPage();
      renderAIChatHistory();
      lucide.createIcons();
      renderFitnessPage();
      window.addEventListener('appinstalled', renderSettingsPage);
      window.addEventListener('resize', () => {
        if (!isMobileLayout()) closeSidebar();
      });
      window.addEventListener('focus', () => {
        checkNewDay();
        checkNotificationEngine();
        refreshUI();
      });

      // Daily engine and reminders
      setInterval(() => {
        checkNewDay();
        checkNotificationEngine();

        if (document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard();
        if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
      }, 60000);
    });
  




