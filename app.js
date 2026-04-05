
    // =============================================
    // STATE & STORAGE
    // =============================================
    const STORAGE_KEYS = {
      tasks: 'mr_tasks',
      fitnessProfile: 'mr_fitnessProfile',
      fitnessPlan: 'mr_fitnessPlan',
      fitnessLogs: 'mr_fitnessLogs',
      fitnessWeightLog: 'mr_fitnessWeightLog',
      fitnessGameState: 'mr_fitnessGameState',
      progressPhotos: 'mr_progressPhotos',
      appSettings: 'mr_appSettings',

      habits: 'mr_habits',
      habitLogs: 'mr_habitLogs',
      dailyTaskLogs: 'mr_dailyTaskLogs',
      taskStats: 'mr_taskStats',
      name: 'mr_name',
      theme: 'mr_theme',
      timeblocks: 'mr_timeblocks',
      dailyReset: 'mr_dailyReset',
      notificationSettings: 'mr_notificationSettings',
      notificationLog: 'mr_notificationLog',
      gameState: 'mr_gameState',
      timeblockHistory: 'mr_timeblockHistory',
      rewardLedger: 'mr_rewardLedger',
      taskPenaltyLog: 'mr_taskPenaltyLog',
      taskExerciseLog: 'mr_taskExerciseLog',
      exerciseChallenges: 'mr_exerciseChallenges',
      aiChatHistory: 'mr_aiChatHistory',
      aiSettings: 'mr_aiSettings',
      syncConfig: 'mr_syncConfig',
      syncMeta: 'mr_syncMeta',
      syncDeviceId: 'mr_syncDeviceId',
    };

    function load(key, def) {
      try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
    }
    function isSyncInternalKey(key) {
      return key === STORAGE_KEYS.syncConfig
        || key === STORAGE_KEYS.syncMeta
        || key === STORAGE_KEYS.syncDeviceId;
    }

    function save(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
      if (!isSyncInternalKey(key)) markSyncDirty();
    }

    let tasks = load(STORAGE_KEYS.tasks, []);
    let habits = load(STORAGE_KEYS.habits, []);
    let habitLogs = load(STORAGE_KEYS.habitLogs, {});
    let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});
    let taskStats = load(STORAGE_KEYS.taskStats, {});
    let timeblocks = load(STORAGE_KEYS.timeblocks, { morning: [], afternoon: [], evening: [], night: [] });
    let timeblockHistory = load(STORAGE_KEYS.timeblockHistory, {});
    let dailyReset = load(STORAGE_KEYS.dailyReset, { lastDate: '', totalResets: 0 });
    let notificationSettings = load(STORAGE_KEYS.notificationSettings, { enabled: false, permission: 'default', reminderMinutes: 15, dailyBriefing: true, eveningNudge: true });
    let notificationLog = load(STORAGE_KEYS.notificationLog, {});
    let gameState = load(STORAGE_KEYS.gameState, {
      xp: 0,
      totalXpEarned: 0,
      badges: [],
      dayStreak: 0,
      lastPerfectDay: '',
      legendaryDayLog: {},
      missionsClaimed: {},
      crystals: 0,
      aiTasksCompleted: 0,
      punitiveExercisesCompleted: 0,
      aiActionLog: {},
      taskCompletionLog: {},
      punitiveLog: {},
      daySnapshots: {},
    });
    let rewardLedger = load(STORAGE_KEYS.rewardLedger, { tasks: {}, habits: {} });
    let taskExerciseLog = load(STORAGE_KEYS.taskExerciseLog, load(STORAGE_KEYS.taskPenaltyLog, {}));
    let exerciseChallenges = load(STORAGE_KEYS.exerciseChallenges, []);
    let fitnessProfile = load(STORAGE_KEYS.fitnessProfile, null);
    let fitnessPlan = load(STORAGE_KEYS.fitnessPlan, null);
    let fitnessLogs = load(STORAGE_KEYS.fitnessLogs, {});
    let fitnessWeightLog = load(STORAGE_KEYS.fitnessWeightLog, []);
    let fitnessGameState = load(STORAGE_KEYS.fitnessGameState, { xp: 0, streak: 0, lastTrainingDate: '', badges: [] });
    let progressPhotos = load(STORAGE_KEYS.progressPhotos, []);
    let appSettings = load(STORAGE_KEYS.appSettings, { gamificationEnabled: true });
    let aiSettings = load(STORAGE_KEYS.aiSettings, null);
    let syncConfig = load(STORAGE_KEYS.syncConfig, null);
    let syncMeta = load(STORAGE_KEYS.syncMeta, null);
    let syncDeviceId = load(STORAGE_KEYS.syncDeviceId, '');
    let editingTaskId = null;
    let currentFilter = 'all';
    let pendingProgressPhotoData = '';
    let syncLoopTimer = null;
    let syncSoonTimer = null;
    let syncInFlight = false;
    let suppressSyncDirty = false;

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
    const DEFAULT_APP_SETTINGS = { gamificationEnabled: true, showDashboardClock: true };
    const DEFAULT_GAME_STATE = {
      xp: 0,
      totalXpEarned: 0,
      badges: [],
      dayStreak: 0,
      lastPerfectDay: '',
      legendaryDayLog: {},
      missionsClaimed: { daily: {}, weekly: {}, monthly: {} },
      crystals: 0,
      aiTasksCompleted: 0,
      punitiveExercisesCompleted: 0,
      aiActionLog: {},
      taskCompletionLog: {},
      punitiveLog: {},
      daySnapshots: {},
    };
    const DEFAULT_REWARD_LEDGER = { tasks: {}, habits: {} };
    const DEFAULT_SYNC_CONFIG = {
      enabled: false,
      provider: 'supabase',
      projectUrl: '',
      apiKey: '',
      spaceId: '',
      intervalSeconds: 45,
    };
    const DEFAULT_SYNC_META = {
      localDirty: false,
      localUpdatedAt: '',
      lastSyncAt: '',
      lastPushAt: '',
      lastPullAt: '',
      lastRemoteUpdatedAt: '',
      lastLocalChecksum: '',
      lastRemoteChecksum: '',
      lastError: '',
    };
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
    const EXERCISE_LIBRARY = {
      daily: {
        high: { title: 'Circuito rápido', detail: '20 agachamentos + 20 polichinelos.', duration: '4 min' },
        med: { title: 'Ativação curta', detail: '15 agachamentos + 30 segundos de prancha.', duration: '3 min' },
        low: { title: 'Movimento leve', detail: '5 minutos de caminhada ou alongamento ativo.', duration: '5 min' },
      },
      once: {
        high: { title: 'Recuperação intensa', detail: '3 rodadas de 15 agachamentos e 20 polichinelos.', duration: '8 min' },
        med: { title: 'Cardio de retomada', detail: '6 minutos de caminhada acelerada ou 40 polichinelos.', duration: '6 min' },
        low: { title: 'Reinício corporal', detail: '10 minutos de caminhada leve ou mobilidade completa.', duration: '10 min' },
      },
    };

    function clampSyncInterval(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return DEFAULT_SYNC_CONFIG.intervalSeconds;
      return Math.max(15, Math.min(600, Math.round(parsed)));
    }

    function normalizeSyncProjectUrl(value) {
      let projectUrl = String(value || '').trim();
      if (!projectUrl) return '';
      if (!/^https?:\/\//i.test(projectUrl)) projectUrl = `https://${projectUrl}`;
      return projectUrl.replace(/\/+$/, '');
    }

    function sanitizeSyncSpaceId(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, 64);
    }

    function normalizeSyncConfig(raw) {
      const safe = raw && typeof raw === 'object' ? raw : {};
      return {
        ...DEFAULT_SYNC_CONFIG,
        ...safe,
        enabled: Boolean(safe.enabled),
        provider: 'supabase',
        projectUrl: normalizeSyncProjectUrl(safe.projectUrl),
        apiKey: typeof safe.apiKey === 'string' ? safe.apiKey.trim() : '',
        spaceId: sanitizeSyncSpaceId(safe.spaceId),
        intervalSeconds: clampSyncInterval(safe.intervalSeconds),
      };
    }

    function normalizeSyncMeta(raw) {
      const safe = raw && typeof raw === 'object' ? raw : {};
      return {
        ...DEFAULT_SYNC_META,
        ...safe,
        localDirty: Boolean(safe.localDirty),
      };
    }

    function markSyncDirty() {
      if (suppressSyncDirty) return;
      if (!syncMeta || typeof syncMeta !== 'object') return;
      syncMeta.localDirty = true;
      syncMeta.localUpdatedAt = new Date().toISOString();
      save(STORAGE_KEYS.syncMeta, syncMeta);
      scheduleAutoSync(2000);
    }

    function formatSyncTimestamp(iso) {
      if (!iso) return 'nunca';
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return 'nunca';
      return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function renderSyncSettings() {
      const statusEl = document.getElementById('settings-sync-status');
      const urlInput = document.getElementById('sync-project-url');
      const keyInput = document.getElementById('sync-api-key');
      const spaceInput = document.getElementById('sync-space-id');
      const intervalInput = document.getElementById('sync-interval-seconds');
      if (!statusEl && !urlInput && !keyInput && !spaceInput && !intervalInput) return;

      const ready = Boolean(syncConfig.projectUrl && syncConfig.apiKey && syncConfig.spaceId);
      if (urlInput) urlInput.value = syncConfig.projectUrl || '';
      if (keyInput) keyInput.value = syncConfig.apiKey || '';
      if (spaceInput) spaceInput.value = syncConfig.spaceId || '';
      if (intervalInput) intervalInput.value = String(syncConfig.intervalSeconds || DEFAULT_SYNC_CONFIG.intervalSeconds);

      if (!statusEl) return;
      if (!syncConfig.enabled) {
        statusEl.textContent = 'Desativada. Preencha os dados e clique em Ativar sync.';
        return;
      }
      if (!ready) {
        statusEl.textContent = 'Ative somente após preencher URL, chave e código de vínculo.';
        return;
      }
      if (syncMeta.lastError) {
        statusEl.textContent = `Ativa com erro: ${syncMeta.lastError}`;
        return;
      }
      statusEl.textContent = `Ativa. Última sincronização: ${formatSyncTimestamp(syncMeta.lastSyncAt)}.`;
    }

    function isAutoSyncReady() {
      return Boolean(syncConfig.enabled && syncConfig.projectUrl && syncConfig.apiKey && syncConfig.spaceId);
    }

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

    function migrateLegacyHabitsToTasks() {
      try {
        const oldHabits = JSON.parse(localStorage.getItem(STORAGE_KEYS.habits) || '[]');
        if (!oldHabits.length) return;

        const oldHabitLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.habitLogs) || '{}');
        tasks.push(...oldHabits.map(habit => ({
          id: habit.id,
          text: `${habit.emoji ? `${habit.emoji} ` : ''}${habit.name}`,
          priority: 'med',
          datetime: '',
          repeatDaily: true,
          hasExercise: false,
          done: (oldHabitLogs[todayKey()] || []).includes(habit.id),
          created: habit.created,
        })));

        localStorage.removeItem(STORAGE_KEYS.habits);
        localStorage.removeItem(STORAGE_KEYS.habitLogs);
        dailyTaskLogs = { ...(dailyTaskLogs || {}), ...oldHabitLogs };
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
      } catch {}
    }

    // =============================================
    // STORAGE NORMALIZATION
    // =============================================
    function normalizeStorage() {
      const previousSuppress = suppressSyncDirty;
      suppressSyncDirty = true;
      try {
        migrateLegacyHabitsToTasks();
        tasks = Array.isArray(tasks) ? tasks : [];

      habits = Array.isArray(habits) ? habits : [];
      habitLogs = habitLogs && typeof habitLogs === 'object' ? habitLogs : {};
      dailyTaskLogs = dailyTaskLogs && typeof dailyTaskLogs === 'object' ? dailyTaskLogs : {};
      taskStats = taskStats && typeof taskStats === 'object' ? taskStats : {};
      timeblocks = timeblocks && typeof timeblocks === 'object' ? timeblocks : { ...EMPTY_TIMEBLOCKS };
      timeblockHistory = timeblockHistory && typeof timeblockHistory === 'object' ? timeblockHistory : {};
      dailyReset = dailyReset && typeof dailyReset === 'object' ? { lastDate: dailyReset.lastDate || '', totalResets: dailyReset.totalResets || 0 } : { lastDate: '', totalResets: 0 };
      notificationSettings = notificationSettings && typeof notificationSettings === 'object'
        ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...notificationSettings }
        : { ...DEFAULT_NOTIFICATION_SETTINGS };
      appSettings = appSettings && typeof appSettings === 'object'
        ? { ...DEFAULT_APP_SETTINGS, ...appSettings }
        : { ...DEFAULT_APP_SETTINGS };
      aiSettings = normalizeAiSettings(aiSettings);
      syncConfig = normalizeSyncConfig(syncConfig);
      syncMeta = normalizeSyncMeta(syncMeta);
      if (!syncMeta.localUpdatedAt) syncMeta.localUpdatedAt = new Date().toISOString();
      if (!syncDeviceId || typeof syncDeviceId !== 'string') syncDeviceId = uid();
      const legacyGeminiKey = localStorage.getItem('mr_gemini_key');
      if (legacyGeminiKey && !aiSettings.providers.gemini.key) {
        aiSettings.providers.gemini.key = legacyGeminiKey;
      }
      notificationLog = notificationLog && typeof notificationLog === 'object' ? notificationLog : {};
      gameState = gameState && typeof gameState === 'object'
        ? { ...DEFAULT_GAME_STATE, ...gameState }
        : { ...DEFAULT_GAME_STATE };
      taskExerciseLog = taskExerciseLog && typeof taskExerciseLog === 'object' ? taskExerciseLog : {};
      exerciseChallenges = Array.isArray(exerciseChallenges) ? exerciseChallenges : [];
      progressPhotos = Array.isArray(progressPhotos) ? progressPhotos : [];
      rewardLedger = rewardLedger && typeof rewardLedger === 'object'
        ? {
          tasks: rewardLedger.tasks && typeof rewardLedger.tasks === 'object' ? rewardLedger.tasks : {},
          habits: {},
        }
        : { ...DEFAULT_REWARD_LEDGER };
      const tasksById = new Map();
      tasks.forEach(task => {
        if (!tasksById.has(task.id)) tasksById.set(task.id, task);
      });
      Object.keys(EMPTY_TIMEBLOCKS).forEach(block => {
        const blockTasks = Array.isArray(timeblocks[block]) ? timeblocks[block] : [];
        timeblocks[block] = blockTasks.filter(taskId => isTaskPeriodAssignable(tasksById.get(taskId)));
      });
      if (!Array.isArray(gameState.badges)) gameState.badges = [];
      if (!gameState.legendaryDayLog || typeof gameState.legendaryDayLog !== 'object') gameState.legendaryDayLog = {};
      const legacyMissionClaims = gameState.missionsClaimed && typeof gameState.missionsClaimed === 'object'
        ? Object.fromEntries(Object.entries(gameState.missionsClaimed).filter(([, value]) => Array.isArray(value)))
        : {};
      gameState.missionsClaimed = {
        daily: gameState.missionsClaimed?.daily && typeof gameState.missionsClaimed.daily === 'object'
          ? gameState.missionsClaimed.daily
          : legacyMissionClaims,
        weekly: gameState.missionsClaimed?.weekly && typeof gameState.missionsClaimed.weekly === 'object'
          ? gameState.missionsClaimed.weekly
          : {},
        monthly: gameState.missionsClaimed?.monthly && typeof gameState.missionsClaimed.monthly === 'object'
          ? gameState.missionsClaimed.monthly
          : {},
      };
      gameState.crystals = Number(gameState.crystals || 0);
      gameState.aiTasksCompleted = Number(gameState.aiTasksCompleted || 0);
      gameState.punitiveExercisesCompleted = Number(gameState.punitiveExercisesCompleted || 0);
      gameState.aiActionLog = gameState.aiActionLog && typeof gameState.aiActionLog === 'object' ? gameState.aiActionLog : {};
      gameState.taskCompletionLog = gameState.taskCompletionLog && typeof gameState.taskCompletionLog === 'object' ? gameState.taskCompletionLog : {};
      gameState.punitiveLog = gameState.punitiveLog && typeof gameState.punitiveLog === 'object' ? gameState.punitiveLog : {};
      gameState.daySnapshots = gameState.daySnapshots && typeof gameState.daySnapshots === 'object' ? gameState.daySnapshots : {};
      fitnessGameState = fitnessGameState && typeof fitnessGameState === 'object'
        ? {
          xp: Number(fitnessGameState.xp || 0),
          streak: Number(fitnessGameState.streak || 0),
          lastTrainingDate: fitnessGameState.lastTrainingDate || '',
          badges: Array.isArray(fitnessGameState.badges) ? fitnessGameState.badges : [],
        }
        : { xp: 0, streak: 0, lastTrainingDate: '', badges: [] };
      tasks = tasks.map(task => ({
        ...task,
        repeatDaily: Boolean(task.repeatDaily),
        hasExercise: Boolean(task.hasExercise ?? task.hasPenalty),
        createdByAI: Boolean(task.createdByAI),
        datetime: task.datetime || '',
      }));
      exerciseChallenges = exerciseChallenges
        .filter(challenge => challenge && typeof challenge === 'object')
        .map(challenge => ({
          ...challenge,
          completedAt: challenge.completedAt || '',
          cycleDate: challenge.cycleDate || todayKey(),
          taskId: challenge.taskId || '',
          taskText: challenge.taskText || 'Tarefa',
          planName: challenge.planName || challenge.title || 'Movimento rápido',
          detail: challenge.detail || '',
          duration: challenge.duration || '',
          cadenceLabel: challenge.cadenceLabel || 'Pontual',
        }));
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
      save(STORAGE_KEYS.gameState, gameState);
      save(STORAGE_KEYS.fitnessGameState, fitnessGameState);
      save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
      save(STORAGE_KEYS.rewardLedger, rewardLedger);
      save(STORAGE_KEYS.taskExerciseLog, taskExerciseLog);
      save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
      save(STORAGE_KEYS.progressPhotos, progressPhotos);
      save(STORAGE_KEYS.syncConfig, syncConfig);
      save(STORAGE_KEYS.syncMeta, syncMeta);
      save(STORAGE_KEYS.syncDeviceId, syncDeviceId);
      } finally {
        suppressSyncDirty = previousSuppress;
      }
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

    function getTaskExercisePlan(task) {
      const cadence = task.repeatDaily ? 'daily' : 'once';
      const priority = task.priority || 'med';
      return EXERCISE_LIBRARY[cadence]?.[priority] || EXERCISE_LIBRARY[cadence]?.med || EXERCISE_LIBRARY.daily.med;
    }

    function renderExercisePreview(isEdit = false) {
      const repeat = document.getElementById(isEdit ? 'edit-task-repeat-daily' : 'task-repeat-daily')?.checked;
      const hasExercise = document.getElementById(isEdit ? 'edit-task-has-exercise' : 'task-has-exercise')?.checked;
      const priority = document.getElementById(isEdit ? 'edit-task-priority' : 'task-priority')?.value || 'med';
      const preview = document.getElementById(isEdit ? 'edit-task-exercise-preview' : 'task-exercise-preview');
      const dtInput = document.getElementById(isEdit ? 'edit-task-datetime' : 'task-datetime');
      const noDateToggle = document.getElementById(isEdit ? 'edit-task-no-datetime' : 'task-no-datetime');
      if (!preview) return;
      if (dtInput && !dtInput.value && !noDateToggle?.checked) dtInput.value = getDefaultTaskDateTime();
      if (!hasExercise) {
        preview.innerHTML = '<strong>Punição desativada</strong><span>Ative para gerar um exercício quando a tarefa falhar.</span>';
        return;
      }
      const plan = getTaskExercisePlan({ repeatDaily: repeat, priority });
      preview.innerHTML = repeat
        ? `<strong>Recuperação da tarefa diária</strong><span>Se o dia virar e a tarefa continuar pendente, o app cria <strong>${plan.title}</strong> (${plan.duration}). ${plan.detail}</span>`
        : noDateToggle?.checked
          ? `<strong>Recuperação da tarefa sem data</strong><span>Se a tarefa seguir pendente no fim do dia, o app cria <strong>${plan.title}</strong> (${plan.duration}). ${plan.detail}</span>`
          : `<strong>Recuperação da tarefa pontual</strong><span>Se a data marcada passar sem conclusão, o app cria <strong>${plan.title}</strong> (${plan.duration}). ${plan.detail}</span>`;
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
      if (dtWrap) dtWrap.hidden = noDate;
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
      renderExercisePreview(isEdit);
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
      return 'Ative para receber lembretes do dia, alertas de tarefa e avisos de sequência.';
    }

    function getMobileNotificationHint(env = getNotificationEnvironment()) {
      if (!env.supported) return 'Se o navegador bloquear essa API, os avisos continuam aparecendo dentro do app.';
      if (!env.secure) return 'No celular, notificações dependem de HTTPS ou localhost.';
      if (env.ios && !env.standalone) return 'No iPhone e iPad, instale o app na Tela de Início para receber notificações.';
      if (env.mobile) return 'No celular, instalar o app na tela inicial deixa os alertas mais estáveis.';
      return 'No computador, os alertas aparecem direto pelo navegador.';
    }

    function saveGameState() {
      save(STORAGE_KEYS.gameState, gameState);
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

    function getTaskXp(task) {
      return 10;
    }

    function createTaskExerciseChallenge(task, cycleDate) {
      if (!task.hasExercise || task.done) return;
      const challengeKey = `${task.id}:${cycleDate}:${task.repeatDaily ? 'daily' : 'once'}`;
      if (taskExerciseLog[challengeKey]) return;
      const plan = getTaskExercisePlan(task);
      const challenge = {
        id: uid(),
        taskId: task.id,
        taskText: task.text,
        cycleDate,
        createdAt: new Date().toISOString(),
        completedAt: '',
        planName: plan.title,
        detail: plan.detail,
        duration: plan.duration,
        cadenceLabel: task.repeatDaily ? 'Diária' : 'Pontual',
      };
      exerciseChallenges.unshift(challenge);
      taskExerciseLog[challengeKey] = challenge.id;
      save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
      save(STORAGE_KEYS.taskExerciseLog, taskExerciseLog);
        showToast('Punição aplicada', `${truncateText(task.text, 40)} virou ${plan.title.toLowerCase()}.`, 'warn');
    }

    function buildLevelThresholds(maxLevel = 100) {
      const thresholds = [0];
      for (let level = 2; level <= maxLevel; level++) {
        const previous = thresholds[thresholds.length - 1];
        const requirement = 80 + Math.round((level - 1) * 28 + Math.pow(level - 1, 1.34) * 6);
        thresholds.push(previous + requirement);
      }
      return thresholds;
    }

    const LEVEL_THRESHOLDS = buildLevelThresholds(100);
    const LEVEL_TITLE_RANGES = [
      { min: 1, max: 4, title: 'Aprendiz do Ritmo' },
      { min: 5, max: 9, title: 'Escudeiro da Rotina' },
      { min: 10, max: 14, title: 'Cadete do Foco' },
      { min: 15, max: 19, title: 'Guardião da Constância' },
      { min: 20, max: 29, title: 'Arquiteto do Dia' },
      { min: 30, max: 39, title: 'Capitão do Progresso' },
      { min: 40, max: 49, title: 'Comandante do Amanhecer' },
      { min: 50, max: 59, title: 'Lenda da Rotina' },
      { min: 60, max: 74, title: 'Mestre do Tempo' },
      { min: 75, max: 89, title: 'Avatar da Disciplina' },
      { min: 90, max: 100, title: 'Deus da Produtividade' },
    ];
    const LEVEL_MILESTONES = [1, 5, 10, 15, 20, 30, 40, 50, 60, 75, 100];

    function getLevelFromXp(xp = 0) {
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
      }
      return 1;
    }

    function getLevelTitle(level) {
      return LEVEL_TITLE_RANGES.find(range => level >= range.min && level <= range.max)?.title || 'Ícone da Rotina';
    }

    function getLevelProgress() {
      const xp = gameState.xp || 0;
      const level = getLevelFromXp(xp);
      const currentLevelStart = LEVEL_THRESHOLDS[level - 1] || 0;
      const nextLevelStart = LEVEL_THRESHOLDS[level] || (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1200);
      const current = xp - currentLevelStart;
      const next = Math.max(nextLevelStart - currentLevelStart, 1);

      return {
        level,
        current,
        next,
        pct: Math.max(0, Math.min(100, Math.round((current / next) * 100))),
        remaining: Math.max(next - current, 0),
        title: getLevelTitle(level),
      };
    }

    function getLevelMilestones() {
      return LEVEL_MILESTONES.map(level => ({
        level,
        title: getLevelTitle(level),
        xp: LEVEL_THRESHOLDS[level - 1] || 0,
      }));
    }

    function grantXp(amount, reason = '', tone = 'success') {
      if (!amount || !isGamificationEnabled()) return;
      const previousLevel = getLevelFromXp(gameState.xp || 0);
      gameState.xp = Math.max(0, (gameState.xp || 0) + amount);
      if (amount > 0) gameState.totalXpEarned = (gameState.totalXpEarned || 0) + amount;
      saveGameState();
      if (amount > 0 && reason) showToast(`+${amount} XP`, reason, tone);

      const nextLevel = getLevelFromXp(gameState.xp || 0);
      if (nextLevel > previousLevel) {
        showToast(`Nível ${nextLevel}`, `Agora você é ${getLevelTitle(nextLevel)}.`, 'success');
        sendBrowserNotification(`level-${nextLevel}`, 'Você subiu de nível', `Agora você é ${getLevelTitle(nextLevel)}.`);
      }
    }

    function grantCrystals(amount, reason = '') {
      if (!amount || !isGamificationEnabled()) return;
      gameState.crystals = Math.max(0, Number(gameState.crystals || 0) + amount);
      saveGameState();
      if (amount > 0 && reason) showToast(`+${amount} Cristal${amount > 1 ? 's' : ''}`, reason, 'success');
    }

    function hasBadge(id) {
      return (gameState.badges || []).some(badge => badge.id === id);
    }

    function launchCelebration(icon, title, subtitle = '') {
      const layer = document.getElementById('celebration-layer');
      if (!layer) return;
      layer.innerHTML = '';
      layer.classList.add('active');

      const card = document.createElement('div');
      card.className = 'celebration-card';
      card.innerHTML = `
        <div class="celebration-icon">${icon}</div>
        <div class="celebration-title">${title}</div>
        <div class="celebration-subtitle">${subtitle}</div>
      `;
      layer.appendChild(card);

      for (let i = 0; i < 18; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${8 + Math.random() * 84}%`;
        piece.style.animationDelay = `${Math.random() * 0.25}s`;
        piece.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
        piece.style.background = ['var(--accent)', 'var(--accent2)'][i % 2];
        piece.style.transform = `rotate(${Math.random() * 240}deg)`;
        layer.appendChild(piece);
      }

      window.clearTimeout(window.__mrCelebrationTimer);
      window.__mrCelebrationTimer = window.setTimeout(() => {
        layer.classList.remove('active');
        layer.innerHTML = '';
      }, 2600);
    }

    function unlockBadge(id, title, description, icon = '*', meta = {}) {
      if (!isGamificationEnabled()) return false;
      if (hasBadge(id)) return false;
      gameState.badges.unshift({
        id,
        title,
        description,
        icon,
        category: meta.category || 'bonus',
        rarity: meta.rarity || 'bonus',
        isSecret: Boolean(meta.isSecret),
        isSeasonal: Boolean(meta.isSeasonal),
        unlockedAt: new Date().toISOString(),
      });
      saveGameState();
      showToast(`${icon} Conquista desbloqueada`, title, 'success');
      sendBrowserNotification(`badge-${id}`, 'Nova conquista', `${icon} ${title}`);
      launchCelebration(icon, title, description);
      return true;
    }

    function hasFitnessBadge(id) {
      return (fitnessGameState.badges || []).some(badge => badge.id === id);
    }

    function grantFitnessXp(amount, reason = '') {
      if (!amount || !isGamificationEnabled()) return;
      fitnessGameState.xp = Math.max(0, Number(fitnessGameState.xp || 0) + amount);
      save(STORAGE_KEYS.fitnessGameState, fitnessGameState);
      grantXp(amount, reason || 'Progresso fitness');
    }

    function unlockFitnessBadge(id, title, desc, icon = '🏅') {
      if (!isGamificationEnabled()) return false;
      if (hasFitnessBadge(id)) return false;
      fitnessGameState.badges = Array.isArray(fitnessGameState.badges) ? fitnessGameState.badges : [];
      fitnessGameState.badges.unshift({ id, title, desc, icon, unlockedAt: new Date().toISOString() });
      save(STORAGE_KEYS.fitnessGameState, fitnessGameState);
      showToast(`${icon} Marco fitness`, title, 'success');
      return true;
    }

    function recalcActivityStreak() {
      const today = todayKey();
      const hasTodayActivity = (taskStats[today]?.done || 0) > 0 || (dailyTaskLogs[today] || []).length > 0;
      let streak = 0;
      const cursor = new Date();
      if (!hasTodayActivity) cursor.setDate(cursor.getDate() - 1);
      while (true) {
        const key = localDateKey(cursor);
        const hadTasks = (taskStats[key]?.done || 0) > 0;
        const hadHabits = (dailyTaskLogs[key] || []).length > 0;
        if (hadTasks || hadHabits) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
      gameState.dayStreak = streak;
      saveGameState();
    }

    function getCurrentWeekKeys() {
      const start = new Date();
      const diff = start.getDay() === 0 ? -6 : 1 - start.getDay();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() + diff);
      const keys = [];
      const cursor = new Date(start);
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        keys.push(localDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return keys;
    }

    function getCurrentMonthKeys() {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const keys = [];
      const cursor = new Date(start);
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        keys.push(localDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return keys;
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

    function refreshUI() {
      updateGamificationVisibility();
      renderDashboard();
      renderGamePanel();
      renderTasks();
      renderExerciseChallenges();
      renderHeatmap();
      renderTimeBlocks();
      renderSettingsPage();
      if (document.getElementById('page-fitness')?.classList.contains('active')) renderFitnessPage();
      if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
    }

    function toggleExerciseChallenge(id) {
      const challenge = exerciseChallenges.find(item => item.id === id);
      if (!challenge) return;
      challenge.completedAt = challenge.completedAt ? '' : new Date().toISOString();
      save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
      refreshUI();
      showToast(
        challenge.completedAt ? 'Exercício concluído' : 'Exercício reaberto',
        challenge.completedAt ? 'Boa. A punição de movimento foi registrada.' : 'A punição voltou para a lista pendente.',
        challenge.completedAt ? 'success' : 'warn'
      );
    }

    function clearCompletedExerciseChallenges() {
      const before = exerciseChallenges.length;
      exerciseChallenges = exerciseChallenges.filter(challenge => !challenge.completedAt);
      if (exerciseChallenges.length === before) return;
      save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
      refreshUI();
    }

    function checkPendingExercises() {
      const pending = exerciseChallenges.filter(c => !c.completedAt);
      if (pending.length > 0) {
        const punicaoLabel = pending.length === 1 ? 'punição' : 'punições';
        const acumuladaLabel = pending.length === 1 ? 'acumulada' : 'acumuladas';
        document.getElementById('blocking-ex-desc').textContent = `Você tem ${pending.length} ${punicaoLabel} de movimento ${acumuladaLabel} por falhar tarefas anteriores.`;
        const listEl = document.getElementById('blocking-ex-list');
        listEl.innerHTML = pending.map(c => `
          <div style="padding:8px;border-bottom:1px solid var(--border)">
            <div style="font-weight:600;font-size:14px;color:var(--text)">${c.planName}</div>
            <div style="font-size:12px;color:var(--muted)">Gerado por: ${truncateText(c.taskText, 30)}</div>
          </div>
        `).join('');
        openModal('modal-blocking-exercise');
      }
    }
    
    function triggerPunitiveModal() {
      document.getElementById('blocking-ex-desc').innerHTML = `
        Atenção! Você não concluiu sua tarefa principal até as 23:59.<br><br>
        <strong>Faça 30 segundos de polichinelos AGORA</strong> para salvar sua sequência do dia e ganhar +5 XP.
      `;
      const listEl = document.getElementById('blocking-ex-list');
      listEl.innerHTML = `
        <button class="btn btn-primary w-full p-4 mb-2" onclick="completePunitiveExercise()">Eu fiz! (Salvar dia)</button>
        <button class="btn btn-ghost w-full p-2" onclick="failPunitiveExercise()">Aceitar a falha</button>
      `;
      openModal('modal-blocking-exercise');
    }
    
    function completePunitiveExercise() {
      closeModal('modal-blocking-exercise');
      grantXp(5, "Exercício de salvação");
      gameState.punitiveExercisesCompleted = Number(gameState.punitiveExercisesCompleted || 0) + 1;
      recordPunitiveExercise();
      saveGameState();
      const today = todayKey();
      if (!taskStats[today]) taskStats[today] = { total: 0, done: 0 };
      taskStats[today].done += 1;
      save(STORAGE_KEYS.taskStats, taskStats);
      persistDaySnapshot(today);
      checkMissionRewards();
      evaluateAchievements();
      refreshUI();
      showToast("Dia salvo", "Seu streak não será quebrado hoje.", "success");
    }

    function failPunitiveExercise() {
      closeModal('modal-blocking-exercise');
      showToast("Dia perdido", "Sua sequência será reiniciada se não houver atividade.", "warn");
    }

    function goToExercisesAndCloseModal() {
      closeModal('modal-blocking-exercise');
      navigate('tasks');
    }

    function renderExerciseChallenges() {
      const list = document.getElementById('exercise-list');
      const summary = document.getElementById('exercise-summary');
      if (!list) return;

      const ordered = [...exerciseChallenges].sort((a, b) => {
        const doneDelta = Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt));
        if (doneDelta !== 0) return doneDelta;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      const pendingCount = ordered.filter(challenge => !challenge.completedAt).length;
      const completedCount = ordered.length - pendingCount;

      if (summary) {
        summary.textContent = pendingCount
          ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
          : 'em dia';
      }

      if (!ordered.length) {
      list.innerHTML = '<div class="empty-state"><p>Nenhuma punição de movimento pendente por enquanto.</p></div>';
        return;
      }

      const clearButton = completedCount
        ? `<button class="btn btn-ghost" style="padding:8px 12px" onclick="clearCompletedExerciseChallenges()">Limpar concluídos</button>`
        : '';

      list.innerHTML = `
    ${clearButton}
    ${ordered.map(challenge => {
        const done = Boolean(challenge.completedAt);
        const createdLabel = challenge.cycleDate
          ? new Date(`${challenge.cycleDate}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '--/--';
        return `<div class="exercise-item ${done ? 'done' : ''}">
        <div class="exercise-topline">
          <div class="exercise-title">${challenge.planName}</div>
          <div class="task-meta" style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="tag">${challenge.cadenceLabel}</span>
            ${challenge.duration ? `<span class="tag">${challenge.duration}</span>` : ''}
            <span class="tag">${done ? 'Concluído' : 'Pendente'}</span>
          </div>
        </div>
        <div class="exercise-detail">${challenge.detail}</div>
        <div class="exercise-source">Gerado por "${truncateText(challenge.taskText, 56)}" em ${createdLabel}.</div>
        <div class="exercise-actions">
          <button class="btn ${done ? 'btn-ghost' : 'btn-success'}" style="padding:8px 14px" onclick="toggleExerciseChallenge('${challenge.id}')">
            ${done ? 'Marcar como pendente' : 'Marcar exercício como feito'}
          </button>
        </div>
      </div>`;
      }).join('')}
  `;
    }

    function resetDayState({ manual = false, autoCycle = false } = {}) {
      const today = todayKey();
      const lastCycleDate = dailyReset.lastDate || today;
      persistDaySnapshot(autoCycle ? lastCycleDate : today);
      
      tasks.forEach(task => {
        if (autoCycle) {
          if (task.repeatDaily) {
            createTaskExerciseChallenge(task, lastCycleDate);
            task.done = false;
            clearTaskCompletion(task.id, lastCycleDate);
            if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
          } else if (isTaskForDate(task, lastCycleDate)) {
            createTaskExerciseChallenge(task, lastCycleDate);
            clearTaskCompletion(task.id, lastCycleDate);
          }
        } else if (manual) {
          if (isTaskForDate(task, today)) {
            task.done = false;
            clearTaskCompletion(task.id, today);
          }
          if (task.repeatDaily) {
             task.done = false;
             clearTaskCompletion(task.id, today);
             if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
          }
        }
      });
      
      timeblocks = { ...EMPTY_TIMEBLOCKS };
      save(STORAGE_KEYS.timeblocks, timeblocks);
      
      if (manual) {
        dailyTaskLogs[today] = [];
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
        if (rewardLedger.tasks[today]) delete rewardLedger.tasks[today];
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
      }
      
      updateTodayTaskStats();
      save(STORAGE_KEYS.tasks, tasks);
      
      if (autoCycle) {
         dailyReset.totalResets = (dailyReset.totalResets || 0) + 1;
      }

      habits.forEach(habit => {
        if (habit.lastCompletedDate !== lastCycleDate) {
          habit.streak = 0;
        }
      });
      save(STORAGE_KEYS.habits, habits);

      dailyReset.lastDate = today;
      save(STORAGE_KEYS.dailyReset, dailyReset);
      
      recalcActivityStreak();
      persistDaySnapshot(today);
      checkMissionRewards();
      evaluateAchievements();
      renderAutomationPanel();
      refreshUI();
      
      if (manual) {
        showToast('Dia reiniciado', 'Tarefas, blocos e dados de hoje foram zerados.', 'warn');
      } else {
        showToast('Novo dia iniciado', 'As tarefas foram resetadas e a agenda ficou pronta.', 'success');
        sendBrowserNotification(`new-day-${today}`, 'Novo dia liberado', 'Suas tarefas voltaram ao início para um novo ciclo.');
        setTimeout(checkPendingExercises, 1500);
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
      const pendingHabits = Math.max(habits.length - (habitLogs[today] || []).length, 0);
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
        missions: 'Missões',
        ai: 'Rotina A.I.',
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
      if (page === 'missions' && !isGamificationEnabled()) {
        page = 'settings';
      }
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
          renderExerciseChallenges();
          renderTimeBlocks();
          break;
        case 'missions':
          renderGamePanel();
          break;
        case 'habits':
          renderHeatmap();
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
      document.getElementById('user-name').textContent = safeName;
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

    function getSyncHeaders(includeJson = false) {
      const headers = {
        apikey: syncConfig.apiKey,
        Authorization: `Bearer ${syncConfig.apiKey}`,
      };
      if (includeJson) headers['Content-Type'] = 'application/json';
      return headers;
    }

    function checksumFromString(input) {
      let hash = 2166136261;
      for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return (hash >>> 0).toString(16).padStart(8, '0');
    }

    function snapshotHasMeaningfulData(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return false;
      if (Array.isArray(snapshot.tasks) && snapshot.tasks.length > 0) return true;
      if (Array.isArray(snapshot.habits) && snapshot.habits.length > 0) return true;
      if (Array.isArray(snapshot.progressPhotos) && snapshot.progressPhotos.length > 0) return true;
      if (Array.isArray(snapshot.aiChatHistory) && snapshot.aiChatHistory.length > 0) return true;
      if (Array.isArray(snapshot.fitnessWeightLog) && snapshot.fitnessWeightLog.length > 0) return true;
      if (snapshot.fitnessProfile && typeof snapshot.fitnessProfile === 'object') return true;
      if (snapshot.fitnessPlan && typeof snapshot.fitnessPlan === 'object') return true;
      if (typeof snapshot.name === 'string' && snapshot.name.trim()) return true;
      const objectKeys = [
        snapshot.habitLogs,
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

    function buildSyncEnvelope() {
      const snapshot = buildBackupSnapshot();
      const raw = JSON.stringify(snapshot);
      return {
        app: 'Minha Rotina',
        version: 2,
        updatedAt: syncMeta.localUpdatedAt || new Date().toISOString(),
        updatedBy: syncDeviceId || 'device',
        checksum: checksumFromString(raw),
        data: snapshot,
      };
    }

    async function readSyncErrorMessage(response, actionLabel) {
      let detail = '';
      try {
        detail = (await response.text()).replace(/\s+/g, ' ').trim();
      } catch {}
      const shortDetail = detail ? ` ${detail.slice(0, 180)}` : '';
      return `Falha na ${actionLabel} (${response.status}).${shortDetail}`;
    }

    async function fetchRemoteSyncEnvelope() {
      const endpoint = `${syncConfig.projectUrl}/rest/v1/mr_sync_states?id=eq.${encodeURIComponent(syncConfig.spaceId)}&select=id,payload,updated_at&limit=1`;
      const response = await fetch(endpoint, { headers: getSyncHeaders(false) });
      if (!response.ok) throw new Error(await readSyncErrorMessage(response, 'leitura'));
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return null;
      return {
        envelope: row.payload && typeof row.payload === 'object' ? row.payload : null,
        updatedAt: row.updated_at || '',
      };
    }

    async function pushRemoteSyncEnvelope(envelope) {
      const endpoint = `${syncConfig.projectUrl}/rest/v1/mr_sync_states?on_conflict=id`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...getSyncHeaders(true),
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([{ id: syncConfig.spaceId, payload: envelope }]),
      });
      if (!response.ok) throw new Error(await readSyncErrorMessage(response, 'gravação'));
      const rows = await response.json().catch(() => []);
      return Array.isArray(rows) ? rows[0] : null;
    }

    function scheduleAutoSync(delayMs = 0) {
      if (!isAutoSyncReady()) return;
      if (syncSoonTimer) clearTimeout(syncSoonTimer);
      syncSoonTimer = setTimeout(() => {
        runCloudSync({ reason: 'change' });
      }, Math.max(0, delayMs));
    }

    function restartAutoSyncLoop() {
      if (syncLoopTimer) clearInterval(syncLoopTimer);
      syncLoopTimer = null;
      if (!isAutoSyncReady()) return;
      const intervalMs = clampSyncInterval(syncConfig.intervalSeconds) * 1000;
      syncLoopTimer = setInterval(() => {
        runCloudSync({ reason: 'interval' });
      }, intervalMs);
      scheduleAutoSync(1200);
    }

    async function runCloudSync({ manual = false, reason = 'manual' } = {}) {
      if (!isAutoSyncReady()) {
        if (manual) showToast('Sync indisponível', 'Preencha URL, chave e código de vínculo para sincronizar.', 'warn');
        return false;
      }
      if (syncInFlight) return false;
      syncInFlight = true;
      try {
        const now = new Date().toISOString();
        const localEnvelope = buildSyncEnvelope();
        const localChecksum = localEnvelope.checksum;
        const localUpdatedAtMs = new Date(syncMeta.localUpdatedAt || localEnvelope.updatedAt || now).getTime();
        const remote = await fetchRemoteSyncEnvelope();

        if (!remote || !remote.envelope) {
          const pushed = await pushRemoteSyncEnvelope(localEnvelope);
          const remoteTime = pushed?.updated_at || now;
          syncMeta.localDirty = false;
          syncMeta.lastPushAt = remoteTime;
          syncMeta.lastSyncAt = remoteTime;
          syncMeta.lastRemoteUpdatedAt = remoteTime;
          syncMeta.lastLocalChecksum = localChecksum;
          syncMeta.lastRemoteChecksum = localChecksum;
          syncMeta.lastError = '';
          save(STORAGE_KEYS.syncMeta, syncMeta);
          if (manual) showToast('Sincronizado', 'Progresso enviado para a nuvem.', 'success');
          return true;
        }

        const remoteEnvelope = remote.envelope || {};
        const remoteRaw = JSON.stringify(remoteEnvelope.data || {});
        const remoteChecksum = remoteEnvelope.checksum || checksumFromString(remoteRaw);
        const remoteUpdatedAt = remoteEnvelope.updatedAt || remote.updatedAt || '';
        const remoteUpdatedAtMs = new Date(remoteUpdatedAt || now).getTime();
        const localHasData = snapshotHasMeaningfulData(localEnvelope.data);
        const remoteHasData = snapshotHasMeaningfulData(remoteEnvelope.data || {});

        if (remoteChecksum === localChecksum) {
          syncMeta.localDirty = false;
          syncMeta.lastSyncAt = now;
          syncMeta.lastRemoteUpdatedAt = remoteUpdatedAt || syncMeta.lastRemoteUpdatedAt;
          syncMeta.lastLocalChecksum = localChecksum;
          syncMeta.lastRemoteChecksum = remoteChecksum;
          syncMeta.lastError = '';
          save(STORAGE_KEYS.syncMeta, syncMeta);
          if (manual) showToast('Sincronizado', 'Tudo em dia entre seus dispositivos.', 'success');
          return true;
        }

        const neverSyncedOnDevice = !syncMeta.lastSyncAt;
        const preferRemoteBootstrap = neverSyncedOnDevice
          && !syncMeta.localDirty
          && !localHasData
          && remoteHasData;
        const shouldPullRemote = preferRemoteBootstrap
          || (Number.isFinite(remoteUpdatedAtMs) && (!Number.isFinite(localUpdatedAtMs) || remoteUpdatedAtMs > localUpdatedAtMs));
        if (shouldPullRemote) {
          applyImportedBackup(remoteEnvelope.data || {}, { showSuccessToast: false });
          syncMeta.localDirty = false;
          syncMeta.localUpdatedAt = remoteUpdatedAt || now;
          syncMeta.lastPullAt = now;
          syncMeta.lastSyncAt = now;
          syncMeta.lastRemoteUpdatedAt = remoteUpdatedAt || now;
          syncMeta.lastLocalChecksum = remoteChecksum;
          syncMeta.lastRemoteChecksum = remoteChecksum;
          syncMeta.lastError = '';
          save(STORAGE_KEYS.syncMeta, syncMeta);
          if (manual) showToast('Sincronizado', 'Atualizações remotas aplicadas neste dispositivo.', 'success');
          return true;
        }

        const pushed = await pushRemoteSyncEnvelope(localEnvelope);
        const pushedAt = pushed?.updated_at || now;
        syncMeta.localDirty = false;
        syncMeta.lastPushAt = pushedAt;
        syncMeta.lastSyncAt = pushedAt;
        syncMeta.lastRemoteUpdatedAt = pushedAt;
        syncMeta.lastLocalChecksum = localChecksum;
        syncMeta.lastRemoteChecksum = localChecksum;
        syncMeta.lastError = '';
        save(STORAGE_KEYS.syncMeta, syncMeta);
        if (manual) showToast('Sincronizado', 'Progresso atualizado na nuvem.', 'success');
        return true;
      } catch (error) {
        syncMeta.lastError = error?.message || 'Erro na sincronização automática.';
        save(STORAGE_KEYS.syncMeta, syncMeta);
        if (manual) showToast('Erro na sync', syncMeta.lastError, 'warn');
        return false;
      } finally {
        syncInFlight = false;
        if (reason !== 'change' || manual) renderSyncSettings();
      }
    }

    function saveSyncSettings(enableNow = false) {
      const urlInput = document.getElementById('sync-project-url');
      const keyInput = document.getElementById('sync-api-key');
      const spaceInput = document.getElementById('sync-space-id');
      const intervalInput = document.getElementById('sync-interval-seconds');
      const nextConfig = normalizeSyncConfig({
        ...syncConfig,
        projectUrl: urlInput?.value || '',
        apiKey: keyInput?.value || '',
        spaceId: spaceInput?.value || '',
        intervalSeconds: intervalInput?.value || syncConfig.intervalSeconds,
        enabled: enableNow ? true : syncConfig.enabled,
      });

      if (enableNow && (!nextConfig.projectUrl || !nextConfig.apiKey || !nextConfig.spaceId)) {
        showToast('Campos obrigatórios', 'Preencha URL, chave e código de vínculo para ativar a sync.', 'warn');
        return;
      }

      syncConfig = nextConfig;
      syncMeta.lastError = '';
      if (!syncMeta.localUpdatedAt) syncMeta.localUpdatedAt = new Date().toISOString();
      save(STORAGE_KEYS.syncConfig, syncConfig);
      save(STORAGE_KEYS.syncMeta, syncMeta);
      restartAutoSyncLoop();
      renderSyncSettings();
      showToast(
        enableNow ? 'Sync automática ativada' : 'Configuração salva',
        enableNow ? 'Seu progresso será sincronizado entre celular e PC.' : 'As informações de sincronização foram atualizadas.',
        'success'
      );
      if (enableNow) runCloudSync({ manual: true, reason: 'activate' });
    }

    function disableAutoSync() {
      syncConfig.enabled = false;
      save(STORAGE_KEYS.syncConfig, syncConfig);
      restartAutoSyncLoop();
      renderSyncSettings();
      showToast('Sync automática desativada', 'Este dispositivo voltou a funcionar apenas localmente.', 'warn');
    }

    function syncNow() {
      runCloudSync({ manual: true, reason: 'manual' });
    }

    function buildBackupSnapshot() {
      return {
        tasks,
        habits,
        habitLogs,
        dailyTaskLogs,
        taskStats,
        timeblocks,
        timeblockHistory,
        dailyReset,
        notificationSettings,
        notificationLog,
        gameState,
        appSettings,
        rewardLedger,
        taskExerciseLog,
        exerciseChallenges,
        progressPhotos,
        fitnessProfile,
        fitnessPlan,
        fitnessLogs,
        fitnessWeightLog,
        fitnessGameState,
        aiSettings,
        aiChatHistory: load(STORAGE_KEYS.aiChatHistory, []),
        name: load(STORAGE_KEYS.name, ''),
        theme: getCurrentThemeId(),
        dashboardCardOrder: typeof loadDashboardCardOrder === 'function' ? loadDashboardCardOrder() : null,
        dashboardCardVisibility: typeof loadDashboardCardVisibility === 'function' ? loadDashboardCardVisibility() : null,
        legacyGeminiKey: localStorage.getItem('mr_gemini_key') || '',
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
      const previousSuppress = suppressSyncDirty;
      suppressSyncDirty = true;
      try {
        tasks = Array.isArray(source.tasks) ? source.tasks : [];
        habits = Array.isArray(source.habits) ? source.habits : [];
        habitLogs = source.habitLogs && typeof source.habitLogs === 'object' ? source.habitLogs : {};
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
        gameState = source.gameState && typeof source.gameState === 'object'
          ? { ...DEFAULT_GAME_STATE, ...source.gameState }
          : { ...DEFAULT_GAME_STATE };
        appSettings = source.appSettings && typeof source.appSettings === 'object'
          ? { ...DEFAULT_APP_SETTINGS, ...source.appSettings }
          : { ...DEFAULT_APP_SETTINGS };
        rewardLedger = source.rewardLedger && typeof source.rewardLedger === 'object'
          ? source.rewardLedger
          : { ...DEFAULT_REWARD_LEDGER };
        taskExerciseLog = source.taskExerciseLog && typeof source.taskExerciseLog === 'object' ? source.taskExerciseLog : {};
        exerciseChallenges = Array.isArray(source.exerciseChallenges) ? source.exerciseChallenges : [];
        progressPhotos = Array.isArray(source.progressPhotos) ? source.progressPhotos : [];
        fitnessProfile = source.fitnessProfile && typeof source.fitnessProfile === 'object' ? source.fitnessProfile : null;
        fitnessPlan = source.fitnessPlan && typeof source.fitnessPlan === 'object' ? source.fitnessPlan : null;
        fitnessLogs = source.fitnessLogs && typeof source.fitnessLogs === 'object' ? source.fitnessLogs : {};
        fitnessWeightLog = Array.isArray(source.fitnessWeightLog) ? source.fitnessWeightLog : [];
        fitnessGameState = source.fitnessGameState && typeof source.fitnessGameState === 'object'
          ? source.fitnessGameState
          : { xp: 0, streak: 0, lastTrainingDate: '', badges: [] };
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
        if (typeof source.legacyGeminiKey === 'string' && source.legacyGeminiKey) {
          localStorage.setItem('mr_gemini_key', source.legacyGeminiKey);
        } else {
          localStorage.removeItem('mr_gemini_key');
        }

        normalizeStorage();
      } finally {
        suppressSyncDirty = previousSuppress;
      }
      syncMeta.localDirty = false;
      syncMeta.localUpdatedAt = new Date().toISOString();
      save(STORAGE_KEYS.syncMeta, syncMeta);
      syncNotificationPermission();
      syncAiProviderLabels();
      updateGamificationVisibility();
      syncDashboardClockVisibility();
      if (typeof updateTodayTaskStats === 'function') updateTodayTaskStats();
      if (typeof checkNewDay === 'function') checkNewDay();
      if (typeof recalcActivityStreak === 'function') recalcActivityStreak();
      if (typeof checkMissionRewards === 'function') checkMissionRewards();
      if (typeof evaluateAchievements === 'function') evaluateAchievements();
      renderTip();
      refreshUI();
      if (typeof renderAIChatHistory === 'function') renderAIChatHistory();
      if (typeof renderFitnessPage === 'function') renderFitnessPage();
      if (typeof renderSettingsPage === 'function') renderSettingsPage();
      if (showSuccessToast) {
        showToast('Progresso vinculado', 'Dados sincronizados com sucesso neste dispositivo.', 'success');
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
      habits = [];
      habitLogs = {};
      dailyTaskLogs = {};
      taskStats = {};
      timeblocks = { ...EMPTY_TIMEBLOCKS };
      timeblockHistory = {};
      dailyReset = { lastDate: '', totalResets: 0 };
      notificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
      notificationLog = {};
      gameState = { ...DEFAULT_GAME_STATE };
      appSettings = { ...DEFAULT_APP_SETTINGS };
      rewardLedger = { ...DEFAULT_REWARD_LEDGER };
      taskExerciseLog = {};
      exerciseChallenges = [];
      progressPhotos = [];
      fitnessProfile = null;
      fitnessPlan = null;
      fitnessLogs = {};
      fitnessWeightLog = [];
      fitnessGameState = { xp: 0, streak: 0, lastTrainingDate: '', badges: [] };
      aiSettings = normalizeAiSettings(null);
      syncConfig = { ...DEFAULT_SYNC_CONFIG };
      syncMeta = {
        ...DEFAULT_SYNC_META,
        localDirty: false,
        localUpdatedAt: new Date().toISOString(),
      };
      syncDeviceId = uid();
      save(STORAGE_KEYS.aiChatHistory, []);
      if (typeof aiChatHistory !== 'undefined') aiChatHistory = [];

      normalizeStorage();
      restartAutoSyncLoop();
      applyTheme(DEFAULT_THEME_ID, { persist: true });
      syncNotificationPermission();
      if (typeof persistDashboardCardOrder === 'function') {
        persistDashboardCardOrder(getDefaultDashboardCardOrder());
      }
      if (typeof persistDashboardCardVisibility === 'function') {
        persistDashboardCardVisibility(getDefaultDashboardCardVisibility());
      }
      syncAiProviderLabels();
      updateGamificationVisibility();
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
        'Esta ação apaga tarefas, hábitos, progresso fitness, histórico da IA e configurações locais. Não pode ser desfeita.',
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
      restartAutoSyncLoop();
      syncAiProviderLabels();
      updateGamificationVisibility();
      syncNotificationPermission();
      ensureServiceWorkerReady();
      seedTaskDateTimeInputs();
      if (typeof initTaskComposer === 'function') initTaskComposer();
      else syncTaskFormState();
      syncTaskFormState(true);
      initName();
      updateTodayTaskStats();
      checkNewDay();
      recalcActivityStreak();
      checkMissionRewards();
      evaluateAchievements();
      renderTip();
      startClock();
      refreshUI();
      updateMobileNavigation('dashboard');
      renderSettingsPage();
      renderAIChatHistory();
      lucide.createIcons();
      renderFitnessPage();
      setTimeout(checkPendingExercises, 1500);
      window.addEventListener('appinstalled', renderSettingsPage);
      window.addEventListener('resize', () => {
        if (!isMobileLayout()) closeSidebar();
      });
      window.addEventListener('focus', () => {
        checkNewDay();
        checkNotificationEngine();
        refreshUI();
        if (isAutoSyncReady()) runCloudSync({ reason: 'focus' });
      });

      // Daily engine and reminders
      let punitiveTriggeredToday = false;
      setInterval(() => {
        checkNewDay();
        checkNotificationEngine();
        
        const now = new Date();
        if (now.getHours() === 23 && now.getMinutes() === 59 && !punitiveTriggeredToday) {
           const mainTaskIncomplete = tasks.some(t => t.priority === 'high' && !t.done);
           if (mainTaskIncomplete) {
              punitiveTriggeredToday = true;
              triggerPunitiveModal();
           }
        }
        if (now.getHours() === 0 && now.getMinutes() === 0) punitiveTriggeredToday = false;

        if (document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard();
        if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
      }, 60000);
    });
  




