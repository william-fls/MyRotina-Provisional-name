
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
    };

    function load(key, def) {
      try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
    }
    function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

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
    const DEMO_HABIT_NAMES = [
      'Beber 2L de água',
      'Exercitar-se',
      'Ler',
      'Meditar',
      'Sono às 23h',
    ];
    const DEFAULT_NOTIFICATION_SETTINGS = { enabled: false, permission: 'default', reminderMinutes: 15, dailyBriefing: true, eveningNudge: true };
    const DEFAULT_APP_SETTINGS = { gamificationEnabled: true };
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

    // =============================================
    // STORAGE NORMALIZATION
    // =============================================
    function normalizeStorage() {
      // MIGRATION: habits -> daily tasks
      try {
        const oldHabits = JSON.parse(localStorage.getItem('mr_habits') || '[]');
        const oldHabitLogs = JSON.parse(localStorage.getItem('mr_habitLogs') || '{}');
        if (oldHabits.length > 0) {
          oldHabits.forEach(h => {
            tasks.push({
              id: h.id, text: (h.emoji ? h.emoji + ' ' : '') + h.name, priority: 'med', datetime: '', repeatDaily: true, hasExercise: false, done: (oldHabitLogs[todayKey()] || []).includes(h.id), created: h.created
            });
          });
          localStorage.removeItem('mr_habits');
          localStorage.removeItem('mr_habitLogs');
          dailyTaskLogs = Object.assign(dailyTaskLogs || {}, oldHabitLogs);
          save(STORAGE_KEYS.tasks, tasks);
          save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
        }
      } catch (e) { }
      // MIGRATION: habits -> daily tasks
      try {
        const oldHabits = JSON.parse(localStorage.getItem('mr_habits') || '[]');
        const oldHabitLogs = JSON.parse(localStorage.getItem('mr_habitLogs') || '{}');
        if (oldHabits.length > 0) {
          oldHabits.forEach(h => {
            tasks.push({
              id: h.id, text: (h.emoji ? h.emoji + ' ' : '') + h.name, priority: 'med', datetime: '', repeatDaily: true, hasExercise: false, done: (oldHabitLogs[todayKey()] || []).includes(h.id), created: h.created
            });
          });
          localStorage.removeItem('mr_habits');
          localStorage.removeItem('mr_habitLogs');
          dailyTaskLogs = Object.assign(dailyTaskLogs || {}, oldHabitLogs);
          save(STORAGE_KEYS.tasks, tasks);
          save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
        }
      } catch (e) { }
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
      Object.keys(EMPTY_TIMEBLOCKS).forEach(block => {
        if (!Array.isArray(timeblocks[block])) timeblocks[block] = [];
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
      save(STORAGE_KEYS.notificationLog, notificationLog);
      save(STORAGE_KEYS.gameState, gameState);
      save(STORAGE_KEYS.fitnessGameState, fitnessGameState);
      save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
      save(STORAGE_KEYS.rewardLedger, rewardLedger);
      save(STORAGE_KEYS.taskExerciseLog, taskExerciseLog);
      save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
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

    function isTaskForDate(task, dateKey = todayKey()) {
      return task.repeatDaily ? true : getTaskDateKey(task) === dateKey;
    }

    function getTaskStateLabel(task) {
      return task.repeatDaily ? 'Diária' : 'Pontual';
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
      if (!preview) return;
      if (dtInput && !dtInput.value) dtInput.value = getDefaultTaskDateTime();
      if (!hasExercise) {
        preview.innerHTML = '<strong>Desafio desativado</strong><span>Ative para gerar um exercício quando a tarefa falhar.</span>';
        return;
      }
      const plan = getTaskExercisePlan({ repeatDaily: repeat, priority });
      preview.innerHTML = repeat
        ? `<strong>Recuperação da tarefa diária</strong><span>Se o dia virar e a tarefa continuar pendente, o app cria <strong>${plan.title}</strong> (${plan.duration}). ${plan.detail}</span>`
        : `<strong>Recuperação da tarefa pontual</strong><span>Se a data marcada passar sem conclusão, o app cria <strong>${plan.title}</strong> (${plan.duration}). ${plan.detail}</span>`;
    }

    function syncTaskFormState(isEdit = false) {
      const repeatCheckbox = document.getElementById(isEdit ? 'edit-task-repeat-daily' : 'task-repeat-daily');
      const dtInput = document.getElementById(isEdit ? 'edit-task-datetime' : 'task-datetime');
      if (repeatCheckbox?.checked && dtInput?.value) {
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

    function syncNotificationPermission(persist = true) {
      const permission = isNotificationsSupported() ? Notification.permission : 'unsupported';
      notificationSettings.permission = permission;
      if (permission !== 'granted') notificationSettings.enabled = false;
      if (persist) save(STORAGE_KEYS.notificationSettings, notificationSettings);
      return permission;
    }

    function saveGameState() {
      save(STORAGE_KEYS.gameState, gameState);
    }

    function showToast(title, body = '', tone = 'default') {
      const stack = document.getElementById('toast-stack');
      if (!stack) return;
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

    function getHabitXp() {
      return 15;
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
      showToast('Desafio criado', `${truncateText(task.text, 40)} virou ${plan.title.toLowerCase()}.`, 'warn');
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
        piece.style.background = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', 'var(--warn)'][i % 4];
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

    function isGamificationEnabled() {
      return Boolean(appSettings.gamificationEnabled);
    }

    function saveAppSettings() {
      save(STORAGE_KEYS.appSettings, appSettings);
    }

    function updateGamificationVisibility() {
      const enabled = isGamificationEnabled();
      document.querySelectorAll('[data-gamification-only="true"]').forEach(el => {
        if (!el) return;
        el.hidden = !enabled;
      });
      if (!enabled && document.getElementById('page-missions')?.classList.contains('active')) {
        navigate('settings');
      }
    }

    function toggleGamificationSetting(enabled) {
      appSettings.gamificationEnabled = Boolean(enabled);
      saveAppSettings();
      updateGamificationVisibility();
      if (appSettings.gamificationEnabled) {
        checkMissionRewards();
        evaluateAchievements();
      }
      renderSettingsPage();
      refreshUI();
      renderFitnessPage();
      if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
      showToast(
        appSettings.gamificationEnabled ? 'Gamificação ativada' : 'Gamificação desativada',
        appSettings.gamificationEnabled
          ? 'Missões, conquistas e níveis voltaram a aparecer.'
          : 'Missões e conquistas ficaram ocultas, mas seus dados foram preservados.',
        appSettings.gamificationEnabled ? 'success' : 'warn'
      );
    }

    function renderSettingsPage() {
      const toggle = document.getElementById('settings-gamification-toggle');
      if (toggle) toggle.checked = isGamificationEnabled();
      const status = document.getElementById('settings-gamification-status');
      if (status) {
        status.textContent = isGamificationEnabled()
          ? 'Status atual: gamificação ligada.'
          : 'Status atual: gamificação desligada.';
      }
      const currentName = document.getElementById('settings-current-name');
      if (currentName) {
        currentName.textContent = (load(STORAGE_KEYS.name, '') || 'Você').trim() || 'Você';
      }
    }

    function getDailyTaskStreak(taskId, endKey = todayKey()) {
      let streak = 0;
      const cursor = new Date(`${endKey}T00:00:00`);
      while ((dailyTaskLogs[localDateKey(cursor)] || []).includes(taskId)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    }

    function getWeightWeekStreak() {
      if (!Array.isArray(fitnessWeightLog) || fitnessWeightLog.length === 0) return 0;
      const getWeekKey = (dateKey) => {
        const safe = new Date(`${dateKey}T00:00:00`);
        const diff = safe.getDay() === 0 ? -6 : 1 - safe.getDay();
        safe.setDate(safe.getDate() + diff);
        safe.setHours(0, 0, 0, 0);
        return localDateKey(safe);
      };
      const weeks = [...new Set(fitnessWeightLog.map(entry => getWeekKey(entry.date)))].sort();
      let streak = 0;
      const cursor = new Date();
      const diff = cursor.getDay() === 0 ? -6 : 1 - cursor.getDay();
      cursor.setDate(cursor.getDate() + diff);
      cursor.setHours(0, 0, 0, 0);
      while (weeks.includes(localDateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 7);
      }
      return streak;
    }

    function getWeekKey(date = new Date()) {
      const safe = new Date(date);
      const diff = safe.getDay() === 0 ? -6 : 1 - safe.getDay();
      safe.setHours(0, 0, 0, 0);
      safe.setDate(safe.getDate() + diff);
      return localDateKey(safe);
    }

    function ensureDailyCounterBucket(bucket, dateKey) {
      if (!bucket[dateKey] || typeof bucket[dateKey] !== 'object') bucket[dateKey] = {};
      return bucket[dateKey];
    }

    function recordAiAction(count = 1, dateKey = todayKey()) {
      if (!count) return;
      gameState.aiActionLog[dateKey] = Number(gameState.aiActionLog[dateKey] || 0) + count;
      saveGameState();
    }

    function recordPunitiveExercise(dateKey = todayKey()) {
      gameState.punitiveLog[dateKey] = Number(gameState.punitiveLog[dateKey] || 0) + 1;
      saveGameState();
    }

    function recordTaskCompletion(taskId, dateKey = todayKey(), completedAt = new Date().toISOString()) {
      const bucket = ensureDailyCounterBucket(gameState.taskCompletionLog, dateKey);
      bucket[taskId] = completedAt;
      saveGameState();
    }

    function clearTaskCompletion(taskId, dateKey = todayKey()) {
      const bucket = gameState.taskCompletionLog[dateKey];
      if (!bucket || typeof bucket !== 'object') return;
      delete bucket[taskId];
      if (!Object.keys(bucket).length) delete gameState.taskCompletionLog[dateKey];
      saveGameState();
    }

    function getTaskCompletionTimes(dateKey = todayKey()) {
      const bucket = gameState.taskCompletionLog[dateKey];
      if (!bucket || typeof bucket !== 'object') return [];
      return Object.values(bucket)
        .map(value => new Date(value))
        .filter(value => !Number.isNaN(value.getTime()))
        .sort((a, b) => a - b);
    }

    function getBlockTasks(block, dateKey = todayKey()) {
      return (timeblocks[block] || [])
        .map(id => tasks.find(task => task.id === id))
        .filter(task => task && isTaskForDate(task, dateKey));
    }

    function buildDaySnapshot(dateKey = todayKey()) {
      const snapshot = {
        date: dateKey,
        doneTasks: Number(taskStats[dateKey]?.done || 0),
        totalTasks: Number(taskStats[dateKey]?.total || 0),
        doneHabits: Number((dailyTaskLogs[dateKey] || []).length),
        totalHabits: Number(tasks.filter(task => task.repeatDaily).length),
        workoutDone: Array.isArray(fitnessLogs[dateKey]) && fitnessLogs[dateKey].length > 0,
        weightLogged: fitnessWeightLog.some(entry => entry.date === dateKey),
        usedTimeblocks: Boolean(timeblockHistory[dateKey]),
        aiActions: Number(gameState.aiActionLog[dateKey] || 0),
        punitiveDone: Number(gameState.punitiveLog[dateKey] || 0),
        morningAssigned: 0,
        morningDone: 0,
        eveningAssigned: 0,
        eveningDone: 0,
        nightAssigned: 0,
        nightDone: 0,
        completionSpanMinutes: null,
        hadAnyActivity: false,
        morningRoutineComplete: false,
        eveningRoutineComplete: false,
        nightRoutineComplete: false,
        eveningNightComplete: false,
        legendary: false,
      };

      const dayTasks = tasks.filter(task => isTaskForDate(task, dateKey));
      const dailyTasks = tasks.filter(task => task.repeatDaily);
      const allTasksDone = dayTasks.length > 0 && dayTasks.every(task => task.done);
      const allHabitsDone = dailyTasks.length > 0
        ? dailyTasks.every(task => (dailyTaskLogs[dateKey] || []).includes(task.id))
        : true;
      const hasWorkoutToday = Boolean(fitnessPlan);

      const morningTasks = getBlockTasks('morning', dateKey);
      const eveningTasks = getBlockTasks('evening', dateKey);
      const nightTasks = getBlockTasks('night', dateKey);

      snapshot.morningAssigned = morningTasks.length;
      snapshot.morningDone = morningTasks.filter(task => task.done).length;
      snapshot.eveningAssigned = eveningTasks.length;
      snapshot.eveningDone = eveningTasks.filter(task => task.done).length;
      snapshot.nightAssigned = nightTasks.length;
      snapshot.nightDone = nightTasks.filter(task => task.done).length;

      const completionTimes = getTaskCompletionTimes(dateKey);
      if (completionTimes.length >= 2) {
        snapshot.completionSpanMinutes = Math.round((completionTimes[completionTimes.length - 1] - completionTimes[0]) / 60000);
      }

      snapshot.hadAnyActivity = snapshot.doneTasks > 0 || snapshot.doneHabits > 0 || snapshot.workoutDone || snapshot.punitiveDone > 0;
      snapshot.morningRoutineComplete = snapshot.morningAssigned >= 3 && snapshot.morningDone >= snapshot.morningAssigned;
      snapshot.eveningRoutineComplete = snapshot.eveningAssigned > 0 && snapshot.eveningDone >= snapshot.eveningAssigned;
      snapshot.nightRoutineComplete = snapshot.nightAssigned > 0 && snapshot.nightDone >= snapshot.nightAssigned;
      snapshot.eveningNightComplete = snapshot.eveningRoutineComplete && snapshot.nightRoutineComplete;
      snapshot.legendary = (dayTasks.length > 0 || dailyTasks.length > 0 || hasWorkoutToday)
        && allTasksDone
        && allHabitsDone
        && (!hasWorkoutToday || snapshot.workoutDone);

      return snapshot;
    }

    function persistDaySnapshot(dateKey = todayKey()) {
      gameState.daySnapshots[dateKey] = buildDaySnapshot(dateKey);
      saveGameState();
      return gameState.daySnapshots[dateKey];
    }

    function getDaySnapshot(dateKey = todayKey()) {
      if (dateKey === todayKey()) return buildDaySnapshot(dateKey);
      return gameState.daySnapshots[dateKey] || null;
    }

    function getAllDaySnapshots() {
      return {
        ...(gameState.daySnapshots || {}),
        [todayKey()]: buildDaySnapshot(todayKey()),
      };
    }

    function hasActivityOnDate(dateKey) {
      const snapshot = getDaySnapshot(dateKey) || gameState.daySnapshots?.[dateKey];
      if (snapshot) return Boolean(snapshot.hadAnyActivity || snapshot.doneTasks || snapshot.doneHabits || snapshot.workoutDone || snapshot.punitiveDone);
      return Boolean((taskStats[dateKey]?.done || 0) > 0 || (dailyTaskLogs[dateKey] || []).length > 0);
    }

    function getActivityYears() {
      const keys = new Set([
        ...Object.keys(taskStats || {}),
        ...Object.keys(dailyTaskLogs || {}),
        ...Object.keys(gameState.daySnapshots || {}),
        ...Object.keys(gameState.legendaryDayLog || {}),
      ]);
      return [...keys]
        .map(key => Number(String(key).slice(0, 4)))
        .filter(year => Number.isFinite(year))
        .sort((a, b) => a - b);
    }

    function getEasterSunday(year) {
      const century = Math.floor(year / 100);
      const golden = year % 19;
      const skippedLeap = Math.floor(century / 4);
      const solarCorrection = Math.floor((century - Math.floor((century + 8) / 25) + 1) / 3);
      const epact = (19 * golden + century - skippedLeap - solarCorrection + 15) % 30;
      const weekdayOffset = (32 + 2 * (century % 4) + 2 * Math.floor(year / 4) - epact - (year % 4)) % 7;
      const monthFactor = Math.floor((golden + 11 * epact + 22 * weekdayOffset) / 451);
      const month = Math.floor((epact + weekdayOffset - 7 * monthFactor + 114) / 31);
      const day = ((epact + weekdayOffset - 7 * monthFactor + 114) % 31) + 1;
      return new Date(year, month - 1, day);
    }

    function getCarnivalDateKeys(year) {
      const easter = getEasterSunday(year);
      const carnivalTuesday = new Date(easter);
      carnivalTuesday.setDate(carnivalTuesday.getDate() - 47);
      carnivalTuesday.setHours(0, 0, 0, 0);
      const start = new Date(carnivalTuesday);
      start.setDate(start.getDate() - 3);
      return Array.from({ length: 4 }, (_, index) => {
        const cursor = new Date(start);
        cursor.setDate(start.getDate() + index);
        return localDateKey(cursor);
      });
    }

    function hasCarnivalStreakAchievement() {
      return getActivityYears().some(year => getCarnivalDateKeys(year).every(dateKey => hasActivityOnDate(dateKey)));
    }

    function getAchievementStats() {
      const today = todayKey();
      const snapshots = getAllDaySnapshots();
      const snapshotList = Object.values(snapshots).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const level = getLevelFromXp(gameState.xp || 0);
      const dailyTasks = tasks.filter(task => task.repeatDaily);
      const totalCompletedTasks = Object.values(taskStats).reduce((sum, day) => sum + Number(day?.done || 0), 0);
      const habitMaxStreak = dailyTasks.reduce((best, task) => Math.max(best, getDailyTaskStreak(task.id)), 0);
      const habitStreak14Count = dailyTasks.filter(task => getDailyTaskStreak(task.id) >= 14).length;
      const highestTasksDay = Object.values(taskStats).reduce((best, day) => Math.max(best, Number(day?.done || 0)), 0);
      const workoutDays = Object.keys(fitnessLogs || {}).filter(key => Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0).length;
      const timeblockDays = Object.keys(timeblockHistory || {}).filter(key => Boolean(timeblockHistory[key])).length;
      const legendaryDays = Object.keys(gameState.legendaryDayLog || {}).length;
      const weightWeeks = getWeightWeekStreak();
      const unlockedWithoutCollector = (gameState.badges || []).filter(badge => badge.id !== 'collector').length;
      const newYearLegendary = Object.keys(gameState.legendaryDayLog || {}).some(key => key.slice(5) === '01-01');
      const mondayLegendary = Object.keys(gameState.legendaryDayLog || {}).some(key => new Date(`${key}T00:00:00`).getDay() === 1);

      return {
        today,
        level,
        dayStreak: Number(gameState.dayStreak || 0),
        totalCompletedTasks,
        habitMaxStreak,
        habitStreak14Count,
        highestTasksDay,
        workoutDays,
        timeblockDays,
        legendaryDays,
        weightWeeks,
        aiTasksCompleted: Number(gameState.aiTasksCompleted || 0),
        punitiveExercisesCompleted: Number(gameState.punitiveExercisesCompleted || 0),
        unlockedWithoutCollector,
        currentSnapshot: snapshots[today] || buildDaySnapshot(today),
        fullMorningDays: snapshotList.filter(item => item.morningRoutineComplete).length,
        fullEveningDays: snapshotList.filter(item => item.eveningRoutineComplete).length,
        fullEveningNightDays: snapshotList.filter(item => item.eveningNightComplete).length,
        madrugadaTasksCompleted: snapshotList.reduce((sum, item) => sum + Number(item.nightDone || 0), 0),
        speedrunnerDays: snapshotList.filter(item => item.doneTasks >= 20 && Number.isFinite(item.completionSpanMinutes) && item.completionSpanMinutes <= 240).length,
        perfectionDays: legendaryDays,
        carnivalFocus: hasCarnivalStreakAchievement(),
        newYearLegendary,
        mondayLegendary,
      };
    }

    const ACHIEVEMENT_DEFINITIONS = [
      { id: 'first_step', title: 'Primeiro Passo', description: 'Complete sua primeira tarefa do dia.', icon: '1', category: 'beginner', rarity: 'common', target: 1, getValue: stats => stats.totalCompletedTasks },
      { id: 'awake_alive', title: 'Acordou Vivo', description: 'Marque presença por 3 dias seguidos.', icon: '3D', category: 'beginner', rarity: 'common', target: 3, getValue: stats => stats.dayStreak },
      { id: 'morning_routine', title: 'Rotina Matinal', description: 'Complete uma rotina matinal com pelo menos 3 tarefas.', icon: 'AM', category: 'beginner', rarity: 'common', target: 1, getValue: stats => stats.fullMorningDays },
      { id: 'night_champions', title: 'Noite dos Campeões', description: 'Complete todas as tarefas da noite por 1 dia.', icon: 'PM', category: 'beginner', rarity: 'common', target: 1, getValue: stats => stats.fullEveningDays },
      { id: 'first_level', title: 'Primeiro Nível', description: 'Chegue ao nível 5.', icon: 'L5', category: 'beginner', rarity: 'common', target: 5, getValue: stats => stats.level },
      { id: 'habit_born', title: 'Hábito Nasceu', description: 'Crie e complete o mesmo hábito por 7 dias seguidos.', icon: '7D', category: 'beginner', rarity: 'rare', target: 7, getValue: stats => stats.habitMaxStreak },
      { id: 'sacred_week', title: 'Semana Sagrada', description: 'Mantenha 7 dias de streak sem quebrar.', icon: '7', category: 'streak', rarity: 'rare', target: 7, getValue: stats => stats.dayStreak },
      { id: 'iron_fortnight', title: 'Quinzena de Ferro', description: 'Mantenha 15 dias de streak.', icon: '15', category: 'streak', rarity: 'epic', target: 15, getValue: stats => stats.dayStreak },
      { id: 'unstoppable_month', title: 'Mês Imparável', description: 'Mantenha 30 dias de streak.', icon: '30', category: 'streak', rarity: 'legendary', target: 30, getValue: stats => stats.dayStreak },
      { id: 'focus_combo', title: 'Combo de Foco', description: 'Complete 10 tarefas no mesmo dia.', icon: '10', category: 'streak', rarity: 'rare', target: 10, getValue: stats => stats.highestTasksDay },
      { id: 'habit_machine', title: 'Máquina de Hábitos', description: 'Mantenha 5 hábitos diferentes em streak simultâneo por 14 dias.', icon: '5H', category: 'streak', rarity: 'epic', target: 5, getValue: stats => stats.habitStreak14Count },
      { id: 'legend_day', title: 'Dia Lendário', description: 'Complete todas as tarefas, hábitos e treino do dia em 100%.', icon: '100%', category: 'epic', rarity: 'epic', target: 1, getValue: stats => stats.legendaryDays },
      { id: 'routine_legend', title: 'Lenda da Rotina', description: 'Chegue ao nível 50.', icon: 'L50', category: 'epic', rarity: 'legendary', target: 50, getValue: stats => stats.level },
      { id: 'time_master', title: 'Mestre do Tempo', description: 'Use blocos de tempo em 30 dias diferentes.', icon: 'TB', category: 'epic', rarity: 'epic', target: 30, getValue: stats => stats.timeblockDays },
      { id: 'gemini_student', title: 'Aluno do Gemini', description: 'Complete 50 tarefas criadas pela IA.', icon: 'AI', category: 'epic', rarity: 'epic', target: 50, getValue: stats => stats.aiTasksCompleted },
      { id: 'body_mind', title: 'Corpo e Mente', description: 'Complete 20 treinos gerados pela IA.', icon: 'FIT', category: 'epic', rarity: 'epic', target: 20, getValue: stats => stats.workoutDays },
      { id: 'total_transformation', title: 'Transformação Total', description: 'Registre perda ou ganho de peso por 8 semanas consecutivas.', icon: '8W', category: 'epic', rarity: 'legendary', target: 8, getValue: stats => stats.weightWeeks },
      { id: 'productivity_god', title: 'Deus da Produtividade', description: 'Complete 1000 tarefas no total.', icon: '1K', category: 'epic', rarity: 'legendary', target: 1000, getValue: stats => stats.totalCompletedTasks },
      { id: 'early_bird', title: 'Madrugador', description: 'Complete 5 tarefas da Madrugada.', icon: '5AM', category: 'secret', rarity: 'rare', isSecret: true, target: 5, getValue: stats => stats.madrugadaTasksCompleted },
      { id: 'night_owl', title: 'Coruja Noturna', description: 'Complete todas as tarefas da Noite e Madrugada por 7 dias.', icon: 'OWL', category: 'secret', rarity: 'epic', isSecret: true, target: 7, getValue: stats => stats.fullEveningNightDays },
      { id: 'punished_redeemed', title: 'Punido e Redimido', description: 'Complete 10 exercícios punitivos.', icon: 'PX', category: 'secret', rarity: 'epic', isSecret: true, target: 10, getValue: stats => stats.punitiveExercisesCompleted },
      { id: 'perfectionist', title: 'Perfeccionista', description: 'Tenha 10 Dias Lendários no total.', icon: '10X', category: 'secret', rarity: 'legendary', isSecret: true, target: 10, getValue: stats => stats.perfectionDays },
      { id: 'collector', title: 'Colecionador', description: 'Desbloqueie 20 conquistas diferentes.', icon: '20', category: 'secret', rarity: 'epic', isSecret: true, target: 20, getValue: stats => stats.unlockedWithoutCollector + (hasBadge('collector') ? 1 : 0) },
      { id: 'speedrunner', title: 'Speedrunner', description: 'Complete 20 tarefas no mesmo dia em menos de 4 horas.', icon: '4H', category: 'secret', rarity: 'legendary', isSecret: true, target: 1, getValue: stats => stats.speedrunnerDays },
      { id: 'new_year_new_me', title: 'Ano Novo, Eu Novo', description: 'Complete 100% do dia em um 01/01.', icon: 'NY', category: 'seasonal', rarity: 'legendary', isSeasonal: true, target: 1, getValue: stats => (stats.newYearLegendary ? 1 : 0) },
      { id: 'carnival_focus', title: 'Carnaval de Foco', description: 'Mantenha streak durante o Carnaval.', icon: 'CAR', category: 'seasonal', rarity: 'rare', isSeasonal: true, target: 1, getValue: stats => (stats.carnivalFocus ? 1 : 0) },
      { id: 'survivor_monday', title: 'Sobrevivente de Segunda', description: 'Complete a segunda-feira com 100%.', icon: '2F', category: 'seasonal', rarity: 'rare', isSeasonal: true, target: 1, getValue: stats => (stats.mondayLegendary ? 1 : 0) },
    ];

    const ACHIEVEMENT_CATEGORY_LABELS = {
      beginner: 'Iniciante',
      streak: 'Sequência',
      epic: 'Épica',
      secret: 'Secreta',
      seasonal: 'Sazonal',
      bonus: 'Bônus',
    };

    const ACHIEVEMENT_RARITY_LABELS = {
      common: 'Comum',
      rare: 'Rara',
      epic: 'Épica',
      legendary: 'Lendária',
      bonus: 'Bônus',
    };

    function getAchievementCategoryLabel(category) {
      return ACHIEVEMENT_CATEGORY_LABELS[category] || 'Especial';
    }

    function getAchievementRarityLabel(rarity) {
      return ACHIEVEMENT_RARITY_LABELS[rarity] || 'Bônus';
    }

    function getAchievementCatalog(stats = getAchievementStats()) {
      return ACHIEVEMENT_DEFINITIONS.map(definition => {
        const rawValue = Math.max(0, Number(definition.getValue(stats) || 0));
        const target = Math.max(1, Number(definition.target || 1));
        const unlocked = hasBadge(definition.id);
        return {
          ...definition,
          unlocked,
          rawValue,
          value: Math.min(rawValue, target),
          target,
          pct: Math.min(100, Math.round((Math.min(rawValue, target) / target) * 100)),
          displayTitle: unlocked || !definition.isSecret ? definition.title : 'Conquista secreta',
          displayDescription: unlocked || !definition.isSecret
            ? definition.description
            : 'Continue avançando para revelar este segredo do baú.',
        };
      });
    }

    function getDailyMissions(dateKey = todayKey()) {
      const snapshot = getDaySnapshot(dateKey) || buildDaySnapshot(dateKey);
      return [
        { id: 'daily-five-tasks', label: 'Complete pelo menos 5 tarefas hoje', progress: Math.min(snapshot.doneTasks, 5), total: 5, reward: 60, crystals: 1 },
        { id: 'daily-streak', label: 'Mantenha seu streak vivo hoje', progress: snapshot.hadAnyActivity ? 1 : 0, total: 1, reward: 40, crystals: 1 },
        { id: 'daily-morning', label: 'Complete todas as tarefas do turno da Manhã', progress: snapshot.morningAssigned ? snapshot.morningDone : 0, total: snapshot.morningAssigned || 1, reward: 45, crystals: 1, optional: snapshot.morningAssigned === 0 },
        { id: 'daily-habit', label: 'Faça pelo menos 1 hábito recorrente', progress: Math.min(snapshot.doneHabits, 1), total: 1, reward: 35, crystals: 1, optional: snapshot.totalHabits === 0 },
        { id: 'daily-workout', label: 'Complete o treino de hoje', progress: snapshot.workoutDone ? 1 : 0, total: 1, reward: 70, crystals: 2, optional: !fitnessPlan },
        { id: 'daily-legendary', label: 'Alcance Dia Lendário', progress: snapshot.legendary ? 1 : 0, total: 1, reward: 120, crystals: 3 },
        { id: 'daily-ten-tasks', label: 'Complete 10 tarefas ou mais', progress: Math.min(snapshot.doneTasks, 10), total: 10, reward: 85, crystals: 2 },
        { id: 'daily-ai-two', label: 'Use a IA para criar ou editar 2 tarefas', progress: Math.min(snapshot.aiActions, 2), total: 2, reward: 80, crystals: 2 },
        { id: 'daily-weight', label: 'Registre seu peso hoje', progress: snapshot.weightLogged ? 1 : 0, total: 1, reward: 55, crystals: 1 },
        { id: 'daily-punitive', label: 'Faça um exercício punitivo', progress: Math.min(snapshot.punitiveDone, 1), total: 1, reward: 45, crystals: 1 },
      ];
    }

    function getWeeklyMissions() {
      const weekKeys = getCurrentWeekKeys();
      const weekSnapshots = weekKeys.map(key => getDaySnapshot(key)).filter(Boolean);
      const weekTasks = weekKeys.reduce((sum, key) => sum + Number(taskStats[key]?.done || 0), 0);
      const weekWorkouts = weekSnapshots.filter(item => item.workoutDone).length;
      const weekLegendary = weekSnapshots.filter(item => item.legendary || Boolean(gameState.legendaryDayLog?.[item.date])).length;
      const weekTimeblocks = weekSnapshots.filter(item => item.usedTimeblocks).length;
      const weekActivity = weekKeys.filter(key => hasActivityOnDate(key)).length;
      return [
        { id: 'weekly-legendary-five', label: 'Complete 5 Dias Lendários na semana', progress: Math.min(weekLegendary, 5), total: 5, reward: 220, crystals: 4 },
        { id: 'weekly-streak-seven', label: 'Mantenha streak de 7 dias', progress: Math.min(weekActivity, 7), total: 7, reward: 180, crystals: 3 },
        { id: 'weekly-fifty-tasks', label: 'Complete 50 tarefas na semana', progress: Math.min(weekTasks, 50), total: 50, reward: 190, crystals: 3 },
        { id: 'weekly-workout-four', label: 'Faça 4 treinos gerados pela IA', progress: Math.min(weekWorkouts, 4), total: 4, reward: 160, crystals: 3, optional: !fitnessPlan },
        { id: 'weekly-timeblocks', label: 'Use blocos de tempo em pelo menos 5 dias', progress: Math.min(weekTimeblocks, 5), total: 5, reward: 150, crystals: 2 },
      ];
    }

    function getMonthlyMissions(date = new Date()) {
      const monthKey = getMonthKey(date);
      const monthKeys = getCurrentMonthKeys();
      const monthSnapshots = monthKeys.map(key => getDaySnapshot(key)).filter(Boolean);
      const monthTasks = monthKeys.reduce((sum, key) => sum + Number(taskStats[key]?.done || 0), 0);
      const monthLegendary = monthSnapshots.filter(item => item.legendary || Boolean(gameState.legendaryDayLog?.[item.date])).length;
      const monthWorkouts = monthSnapshots.filter(item => item.workoutDone).length;
      const monthUnlocks = (gameState.badges || []).filter(badge => (badge.unlockedAt || '').startsWith(monthKey)).length;
      return [
        { id: 'monthly-legendary-fifteen', label: 'Alcance Dia Lendário por 15 dias no mês', progress: Math.min(monthLegendary, 15), total: 15, reward: 420, crystals: 6 },
        { id: 'monthly-three-hundred', label: 'Complete 300 tarefas no mês', progress: Math.min(monthTasks, 300), total: 300, reward: 340, crystals: 5 },
        { id: 'monthly-streak-twenty', label: 'Mantenha streak de 20 dias ou mais', progress: Math.min(Number(gameState.dayStreak || 0), 20), total: 20, reward: 300, crystals: 5 },
        { id: 'monthly-three-badges', label: 'Desbloqueie 3 novas conquistas', progress: Math.min(monthUnlocks, 3), total: 3, reward: 250, crystals: 4 },
        { id: 'monthly-ten-workouts', label: 'Complete 10 treinos da IA', progress: Math.min(monthWorkouts, 10), total: 10, reward: 280, crystals: 4, optional: !fitnessPlan },
      ];
    }

    function ensureMissionClaimBucket(period, key) {
      if (!gameState.missionsClaimed[period] || typeof gameState.missionsClaimed[period] !== 'object') {
        gameState.missionsClaimed[period] = {};
      }
      if (!Array.isArray(gameState.missionsClaimed[period][key])) gameState.missionsClaimed[period][key] = [];
      return gameState.missionsClaimed[period][key];
    }

    function claimMissionSet(period, key, missions) {
      const claimed = ensureMissionClaimBucket(period, key);
      let changed = false;
      missions.forEach(mission => {
        if (mission.optional) return;
        if (mission.progress < mission.total) return;
        if (claimed.includes(mission.id)) return;
        claimed.push(mission.id);
        changed = true;
        grantXp(mission.reward, `Missão concluída: ${mission.label}`);
        grantCrystals(mission.crystals || 0, `Recompensa por ${mission.label}`);
      });
      if (changed) saveGameState();
    }

    function checkMissionRewards() {
      if (!isGamificationEnabled()) return;
      persistDaySnapshot(todayKey());
      claimMissionSet('daily', todayKey(), getDailyMissions());
      claimMissionSet('weekly', getWeekKey(), getWeeklyMissions());
      claimMissionSet('monthly', getMonthKey(), getMonthlyMissions());
    }

    function evaluateAchievements() {
      if (!isGamificationEnabled()) return;
      const today = todayKey();
      const todaySnapshot = persistDaySnapshot(today);

      if (todaySnapshot.legendary && !gameState.legendaryDayLog?.[today]) {
        gameState.legendaryDayLog[today] = new Date().toISOString();
        gameState.lastPerfectDay = today;
        saveGameState();
        grantXp(90, 'Dia Lendário: você fechou 100% do dia');
        grantCrystals(3, 'Bônus por fechar o dia completo');
      }

      const stats = getAchievementStats();
      ACHIEVEMENT_DEFINITIONS.filter(item => item.id !== 'collector').forEach(definition => {
        if (definition.getValue(stats) < definition.target) return;
        unlockBadge(definition.id, definition.title, definition.description, definition.icon, {
          category: definition.category,
          rarity: definition.rarity,
          isSecret: definition.isSecret,
          isSeasonal: definition.isSeasonal,
        });
      });

      const collectorDefinition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === 'collector');
      const collectorStats = getAchievementStats();
      if (collectorDefinition && collectorStats.unlockedWithoutCollector >= 19) {
        unlockBadge(collectorDefinition.id, collectorDefinition.title, collectorDefinition.description, collectorDefinition.icon, {
          category: collectorDefinition.category,
          rarity: collectorDefinition.rarity,
          isSecret: collectorDefinition.isSecret,
          isSeasonal: collectorDefinition.isSeasonal,
        });
      }
    }

    function renderGamePanel() {
      if (!isGamificationEnabled()) return;
      const progress = getLevelProgress();
      setEl('game-level', progress.level);
      setEl('game-streak', `${gameState.dayStreak || 0}d`);
      setEl('game-badges-count', `${(gameState.badges || []).length}`);
      setEl('game-rank-tag', `Lv ${progress.level}`);
      setEl('game-rank-title', progress.title);
      setEl('game-xp', `${progress.current}/${progress.next} XP`);
      setStyle('game-level-bar', 'width', `${progress.pct}%`);
      setEl('game-next-level', `Faltam ${progress.remaining} XP para o nível ${progress.level + 1}.`);

      const missionsEl = document.getElementById('game-missions');
      if (missionsEl) {
        const claimed = gameState.missionsClaimed.daily[todayKey()] || [];
        missionsEl.innerHTML = getDailyMissions().map(mission => {
          const done = claimed.includes(mission.id);
          const fullyCompleted = mission.progress >= mission.total;
          const canClaim = fullyCompleted && !done;
          const pct = Math.round((mission.progress / mission.total) * 100);
          
          let btnHtml = '';
          if (done) {
             btnHtml = `<span class="badge badge-low" style="background:rgba(92,230,184,0.1);color:var(--success)"><i data-lucide="check" style="width:12px;height:12px;display:inline-block"></i> Concluída</span>`;
          } else if (canClaim) {
             btnHtml = `<button class="btn btn-primary" style="padding:4px 10px;font-size:11px" onclick="checkMissionRewards()">Resgatar +${mission.reward} XP</button>`;
          } else {
             btnHtml = `<span class="text-sm text-muted">${mission.progress}/${mission.total}</span>`;
          }

          return `<div class="mission-row ${done ? 'done' : ''}">
        <div class="flex items-center justify-between mb-2">
          <span class="mission-label" style="${done ? 'text-decoration:line-through;opacity:0.6' : ''}">${mission.label}</span>
          <span class="mono text-accent" style="font-weight:700">+${mission.reward} XP</span>
        </div>
        <div class="flex justify-between mt-3" style="align-items:center; flex-wrap:wrap; gap:10px">
          <div class="progress-bar" style="flex: 1 1 120px; max-width:180px;"><div class="progress-fill" style="background:${done ? 'var(--success)' : 'var(--accent)'};width:${pct}%"></div></div>
          ${btnHtml}
        </div>
      </div>`;
        }).join('');
      }

      const achievementsEl = document.getElementById('game-achievements');
      if (achievementsEl) {
        const recentBadges = (gameState.badges || []).slice(0, 4);
        achievementsEl.innerHTML = recentBadges.length
          ? recentBadges.map(badge => `<div class="achievement-chip">
          <div class="achievement-icon">${badge.icon}</div>
          <div>
            <div style="font-size:13px;font-weight:700">${badge.title}</div>
            <div class="inline-note">${badge.description}</div>
          </div>
        </div>`).join('')
          : '<div class="inline-note">Conclua tarefas, hábitos e missões para liberar suas primeiras conquistas.</div>';
      }
      renderGameExpansion(progress);
    }

    function renderGameExpansion(progress) {
      const today = todayKey();
      const achievementStats = getAchievementStats();
      const achievementCatalog = getAchievementCatalog(achievementStats);
      const unlockedCount = achievementCatalog.filter(item => item.unlocked).length;
      const dailyMissions = getDailyMissions().filter(mission => !mission.optional);
      const weeklyMissions = getWeeklyMissions().filter(mission => !mission.optional);
      const monthlyMissions = getMonthlyMissions().filter(mission => !mission.optional);
      const dailyClaimed = ensureMissionClaimBucket('daily', today);
      const weeklyClaimed = ensureMissionClaimBucket('weekly', getWeekKey());
      const monthlyClaimed = ensureMissionClaimBucket('monthly', getMonthKey());
      const workoutKeys = Object.keys(fitnessLogs || {}).filter(key => Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0);
      const legendaryKeys = Object.keys(gameState.legendaryDayLog || {});

      const renderMissionDeck = (targetId, label, missions, claimed, gradient) => {
        const el = document.getElementById(targetId);
        if (!el) return;
        el.innerHTML = missions.map(mission => {
          const done = claimed.includes(mission.id);
          const pct = Math.round((mission.progress / Math.max(mission.total, 1)) * 100);
          return `<div class="mission-card ${done ? 'done' : ''}">
            <div class="mission-card-top">
              <div>
                <div class="mission-type">${label}</div>
                <div class="mission-label">${mission.label}</div>
                <div class="mission-copy">${mission.progress}/${mission.total}${done ? ' · resgatada' : ''}</div>
              </div>
              <div class="mission-reward-box">
                <strong>+${mission.reward} XP</strong>
                <span>+${mission.crystals || 0} cristal</span>
              </div>
            </div>
            <div class="progress-bar mt-3">
              <div class="progress-fill" style="width:${done ? 100 : pct}%;background:${done ? 'var(--success)' : gradient}"></div>
            </div>
          </div>`;
        }).join('');
      };

      setEl('game-crystals', String(gameState.crystals || 0));
      setEl('game-current-title', progress.title);
      setEl('game-legendary-days', String(achievementStats.legendaryDays));
      setEl('game-collection-rate', `${unlockedCount}/${achievementCatalog.length}`);
      const seasonalStatus = document.getElementById('game-seasonal-status');
      if (seasonalStatus) seasonalStatus.textContent = today.slice(5) === '01-01'
        ? 'Evento: Ano Novo'
        : achievementStats.carnivalFocus
          ? 'Evento: Carnaval'
          : new Date().getDay() === 1
            ? 'Evento: Segunda lendária'
            : 'Baú ativo';
      renderMissionDeck('game-missions-daily', 'Diária', dailyMissions, dailyClaimed, 'linear-gradient(90deg,var(--accent),var(--accent2))');
      renderMissionDeck('game-missions-weekly', 'Semanal', weeklyMissions, weeklyClaimed, 'linear-gradient(90deg,var(--accent3),var(--accent2))');
      renderMissionDeck('game-missions-monthly', 'Mensal', monthlyMissions, monthlyClaimed, 'linear-gradient(90deg,var(--accent),var(--accent3))');
      const roadmapEl = document.getElementById('game-level-roadmap');
      if (roadmapEl) roadmapEl.innerHTML = getLevelMilestones().map(item => `<div class="level-roadmap-item ${progress.level >= item.level ? 'done' : progress.level + 5 >= item.level ? 'near' : ''}"><div class="level-roadmap-level">Lv ${item.level}</div><div><div class="level-roadmap-title">${item.title}</div><div class="inline-note">${item.xp.toLocaleString('pt-BR')} XP</div></div></div>`).join('');
      const highlightEl = document.getElementById('game-achievement-highlight');
      if (highlightEl) {
        const recent = (gameState.badges || [])[0];
        const nextTarget = achievementCatalog.find(item => !item.unlocked && !item.isSecret) || achievementCatalog.find(item => !item.unlocked);
        highlightEl.innerHTML = recent
          ? `<div class="highlight-card"><div class="achievement-icon large">${recent.icon || 'T'}</div><div><div class="section-title" style="margin-bottom:6px">Última conquista</div><div style="font-size:18px;font-weight:700;margin-bottom:6px">${recent.title}</div><div class="inline-note">${recent.description}</div></div></div>`
          : nextTarget
            ? `<div class="highlight-card"><div class="achievement-icon large">${nextTarget.icon || 'T'}</div><div><div class="section-title" style="margin-bottom:6px">Próxima conquista</div><div style="font-size:18px;font-weight:700;margin-bottom:6px">${nextTarget.displayTitle}</div><div class="inline-note">${nextTarget.displayDescription}</div><div class="inline-note" style="margin-top:8px">${nextTarget.value}/${nextTarget.target}</div></div></div>`
            : '<div class="reward-pill"><strong>Baú completo.</strong><span>Todas as conquistas do catálogo foram destravadas.</span></div>';
      }
      const rewardsEl = document.getElementById('game-rewards-panel');
      if (rewardsEl) rewardsEl.innerHTML = `<div class="reward-pill"><strong>Título atual</strong><span>${progress.title}</span></div><div class="reward-pill"><strong>Cristais de foco</strong><span>${gameState.crystals || 0}</span></div><div class="reward-pill"><strong>Dias lendários</strong><span>${achievementStats.legendaryDays}</span></div><div class="reward-pill"><strong>Treinos concluídos</strong><span>${workoutKeys.length}</span></div>`;
      const achievementsEl = document.getElementById('game-achievements');
      if (achievementsEl) achievementsEl.innerHTML = achievementCatalog.map(item => `
        <div class="achievement-card ${item.unlocked ? 'unlocked' : 'locked'} rarity-${item.rarity || 'bonus'}">
          <div class="achievement-card-top">
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div class="achievement-icon">${item.icon || 'T'}</div>
              <div>
                <div style="font-size:15px;font-weight:700">${item.displayTitle}</div>
                <div class="achievement-tags">
                  <span class="tag">${getAchievementCategoryLabel(item.category)}</span>
                  <span class="tag">${getAchievementRarityLabel(item.rarity)}</span>
                </div>
              </div>
            </div>
            <div class="achievement-status ${item.unlocked ? 'done' : 'locked'}">${item.unlocked ? 'Desbloqueada' : `${item.value}/${item.target}`}</div>
          </div>
          <p class="achievement-copy">${item.displayDescription}</p>
          <div class="achievement-progress">
            <div class="achievement-progress-fill" style="width:${item.unlocked ? 100 : item.pct}%"></div>
          </div>
        </div>`).join('');
    }

    function renderAutomationPanel() {
      const permission = syncNotificationPermission(false);
      const notifyEnabled = notificationSettings.enabled && permission === 'granted';
      const dailyResetEl = document.getElementById('daily-reset-status');
      const notificationEl = document.getElementById('notification-status');
      const nextResetText = 'As tarefas diárias voltam automaticamente. Quando uma tarefa marcada falha, ela pode gerar um desafio de movimento em vez de perder XP.';
      const lastResetText = dailyReset.lastDate
        ? new Date(`${dailyReset.lastDate}T00:00:00`).toLocaleDateString('pt-BR')
        : 'Ainda não registrado';

      if (dailyResetEl) {
        dailyResetEl.innerHTML = `<strong>Reset diário</strong>
      <span class="inline-note">${nextResetText}<br>Último ciclo registrado: ${lastResetText}.</span>`;
      }

      if (notificationEl) {
        const supportText = permission === 'unsupported'
          ? 'Seu navegador pode bloquear notificações neste modo. Os avisos seguem dentro do app.'
          : notifyEnabled
            ? `Ativas com lembrete ${notificationSettings.reminderMinutes} min antes das tarefas com horário.`
            : 'Ative para receber lembretes do dia, alertas de tarefa e avisos de sequência.';
        notificationEl.innerHTML = `<strong>Notificações</strong>
      <span class="inline-note">${supportText}</span>`;
      }

      const label = document.getElementById('notifications-btn-label');
      if (label) label.textContent = notifyEnabled ? 'Pausar notificações' : 'Ativar notificações';

      const upcoming = document.getElementById('upcoming-reminders');
      if (upcoming) {
        const pendingWithTime = tasks
          .filter(task => !task.done && task.datetime && (task.repeatDaily || isTaskForDate(task, todayKey())))
          .sort((a, b) => new Date(getTaskEffectiveDateTime(a)) - new Date(getTaskEffectiveDateTime(b)))
          .slice(0, 3);
        upcoming.innerHTML = pendingWithTime.length
          ? pendingWithTime.map(task => `<div style="margin-bottom:8px"><strong>${formatTimeOnly(getTaskEffectiveDateTime(task))}</strong> · ${truncateText(task.text, 46)} <span class="tag">${getTaskStateLabel(task)}</span></div>`).join('')
          : 'Nenhuma tarefa com horário marcada por enquanto.';
      }
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
        challenge.completedAt ? 'Boa. O desafio de movimento foi registrado.' : 'O desafio voltou para a lista pendente.',
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
        document.getElementById('blocking-ex-desc').textContent = `Você tem ${pending.length} desafio(s) de movimento acumulado(s) por falhar tarefas anteriores.`;
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
      // Create a modal logic or reuse modal-blocking-exercise
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
      // Force setting today as active to avoid streak penalty tomorrow
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
        list.innerHTML = '<div class="empty-state"><p>Nenhum desafio de movimento pendente por enquanto.</p></div>';
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

    function sendBrowserNotification(id, title, body) {
      if (!isNotificationsSupported()) return false;
      if (syncNotificationPermission(false) !== 'granted') return false;
      if (!notificationSettings.enabled || notificationLog[id]) return false;
      try {
        const notification = new Notification(title, { body, tag: id });
        notification.onclick = () => window.focus();
        notificationLog[id] = new Date().toISOString();
        save(STORAGE_KEYS.notificationLog, notificationLog);
        return true;
      } catch {
        return false;
      }
    }

    async function toggleNotifications() {
      if (!isNotificationsSupported()) {
        showToast('Notificações indisponíveis', 'Seu navegador pode bloquear avisos externos neste modo.', 'warn');
        return;
      }

      syncNotificationPermission(false);
      if (notificationSettings.enabled && Notification.permission === 'granted') {
        notificationSettings.enabled = false;
        save(STORAGE_KEYS.notificationSettings, notificationSettings);
        renderAutomationPanel();
        showToast('Notificações pausadas', 'Os avisos continuarão aparecendo dentro do app.', 'warn');
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        notificationSettings.permission = permission;
        notificationSettings.enabled = permission === 'granted';
        save(STORAGE_KEYS.notificationSettings, notificationSettings);
        renderAutomationPanel();
        if (permission === 'granted') {
          showToast('Notificações ativadas', 'Vou avisar sobre tarefas com horário e momentos-chave do dia.', 'success');
          sendBrowserNotification(`enabled-${todayKey()}`, 'Notificações ativadas', 'Tudo pronto para te lembrar do que importa.');
        } else {
          showToast('Permissão não concedida', 'Os lembretes externos ficaram desativados por enquanto.', 'warn');
        }
      } catch {
        showToast('Não foi possível ativar', 'O navegador recusou a solicitação de notificações.', 'warn');
      }
    }

    function sendTestNotification() {
      const id = `test-${Date.now()}`;
      const sent = sendBrowserNotification(id, 'Teste de lembrete', 'Se você viu isso, as notificações estão funcionando.');
      if (sent) showToast('Teste enviado', 'A notificação saiu no navegador.', 'success');
      else showToast('Aviso interno', 'As notificações externas não estão ativas; use o botão para permitir no navegador.', 'warn');
    }

    function checkReminderNotifications() {
      const now = Date.now();
      const leadTime = (notificationSettings.reminderMinutes || 15) * 60 * 1000;
      tasks.filter(task => !task.done && task.datetime && (task.repeatDaily || isTaskForDate(task, todayKey()))).forEach(task => {
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
    function initTheme() {
      const t = load(STORAGE_KEYS.theme, 'dark');
      document.documentElement.setAttribute('data-theme', t);
      updateThemeIcon(t);
    }
    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      save(STORAGE_KEYS.theme, next);
      updateThemeIcon(next);
    }
    function updateThemeIcon(t) {
      ['theme-icon', 'theme-icon-mobile'].forEach(id => {
        const icon = document.getElementById(id);
        if (icon) icon.setAttribute('data-lucide', t === 'dark' ? 'sun' : 'moon');
      });
      lucide.createIcons();
    }

    // =============================================
    // NAVIGATION
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
    function navigate(page) {
      if (page === 'missions' && !isGamificationEnabled()) {
        page = 'settings';
      }
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById(`page-${page}`)?.classList.add('active');
      document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
      if (isMobileLayout()) closeSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (page === 'dashboard') renderDashboard();
      if (page === 'tasks') {
        renderTasks();
        renderExerciseChallenges();
        renderTimeBlocks();
      }
      if (page === 'missions') renderGamePanel();
      if (page === 'habits') renderHeatmap();
      if (page === 'stats') renderStats();
      if (page === 'fitness') renderFitnessPage();
      if (page === 'settings') renderSettingsPage();
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
          greetEl.textContent = hr < 12 ? 'Bom dia ☀️' : hr < 18 ? 'Boa tarde 🌤️' : 'Boa noite 🌙';
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
    function renderTip() {
      const day = new Date().getDate();
      document.getElementById('tip-text').textContent = TIPS[day % TIPS.length];
    }

    // =============================================
    // DASHBOARD
    // =============================================
    function renderDashboard() {
      const today = todayKey();
      const todayTasks = getTodayTasks();
      
      const punctualTasks = todayTasks.filter(t => !t.repeatDaily);
      const doneTasks = punctualTasks.filter(t => t.done).length;
      const totalT = punctualTasks.length;
      const pctT = totalT ? Math.round((doneTasks / totalT) * 100) : 0;
      setEl('ov-tasks-done', `${doneTasks}/${totalT}`);
      setStyle('ov-tasks-bar', 'width', `${pctT}%`);

      const dailyTasks = tasks.filter(t => t.repeatDaily);
      const doneHabits = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;
      const totalH = dailyTasks.length;
      const pctH = totalH ? Math.round((doneHabits / totalH) * 100) : 0;
      setEl('ov-habits-done', `${doneHabits}/${totalH}`);
      setStyle('ov-habits-bar', 'width', `${pctH}%`);

      const overall = Math.round(((doneTasks + doneHabits) / Math.max(totalT + totalH, 1)) * 100);
      setEl('ov-progress', `${overall}%`);
      setStyle('ov-progress-bar', 'width', `${overall}%`);

      setEl('dash-stat-tasks', doneTasks + doneHabits);
      setEl('dash-stat-streak', `${gameState.dayStreak || 0}d`);

      // dash tasks list
      const dtl = document.getElementById('dash-tasks-list');
      const cardT = document.getElementById('dash-card-tasks');
      const showT = punctualTasks.filter(t => !t.done).slice(0, 5);
      if (dtl && cardT) {
        if (showT.length === 0) {
          cardT.style.display = 'none';
        } else {
          cardT.style.display = 'flex';
          cardT.style.flexDirection = 'column';
          dtl.innerHTML = showT.map(t => `
        <div class="task-item" style="margin-bottom:8px">
          <div class="task-check" onclick="toggleTask('${t.id}')">
          </div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">${t.text}</div>
              <span class="task-state-tag">Pontual</span>
            </div>
            <div class="task-meta">${badgeHTML(t.priority)} ${t.datetime ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : ''}</div>
          </div>
        </div>`).join('');
        }
      }

      // dash habits list
      const dhl = document.getElementById('dash-daily-list');
      const cardD = document.getElementById('dash-card-daily');
      let showD = [];
      if (dhl && cardD) {
        showD = dailyTasks.filter(t => !(dailyTaskLogs[today] || []).includes(t.id)).slice(0, 5);
        if (showD.length === 0) {
          cardD.style.display = 'none';
        } else {
          cardD.style.display = 'flex';
          cardD.style.flexDirection = 'column';
          dhl.innerHTML = showD.map(t => `
            <div class="task-item" style="margin-bottom:8px" onclick="toggleTask('${t.id}')">
              <div class="task-check" style="pointer-events:none">
              </div>
              <div class="task-content">
                <div class="task-title-row">
                  <div class="task-text">${t.text}</div>
                  <span class="task-state-tag">Recorrente</span>
                </div>
                <div class="task-meta">${badgeHTML(t.priority)}</div>
              </div>
            </div>`).join('');
        }
      }
      
      // dash exercises list
      const del = document.getElementById('dash-exercises-list');
      const cardE = document.getElementById('dash-card-exercises');
      let showE = [];
      if (del && cardE && typeof fitnessPlan !== 'undefined' && fitnessPlan) {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const todayDayName = dayNames[new Date().getDay()];
        const todayPlan = fitnessPlan.weeklyPlan?.find(d => d.day.startsWith(todayDayName.slice(0,3))) || fitnessPlan.todayWorkout;
        const doneTodayLog = fitnessLogs[today] || [];
        
        if (todayPlan && !todayPlan.rest && todayPlan.exercises) {
          showE = todayPlan.exercises.filter(ex => !doneTodayLog.includes(ex.name)).slice(0, 5);
        }
        
        if (showE.length === 0) {
          cardE.style.display = 'none';
        } else {
          cardE.style.display = 'flex';
          cardE.style.flexDirection = 'column';
          del.innerHTML = showE.map(ex => `
            <div class="task-item" style="margin-bottom:8px">
              <div class="task-check" onclick="completeExercise('${ex.name.replace(/'/g,"\\\\'")}', 25)">
              </div>
              <div class="task-content">
                <div class="task-title-row">
                  <div class="task-text">${ex.name}</div>
                  <span class="task-state-tag" style="background:rgba(92,230,184,0.12);color:var(--success)">Exercício</span>
                </div>
                <div class="task-meta">${ex.sets} séries × ${ex.reps} reps</div>
              </div>
            </div>`).join('');
        }
      } else if (cardE) {
        cardE.style.display = 'none';
      }

      const listsContainer = document.getElementById('dash-lists-container');
      if (listsContainer) {
         if (showT.length === 0 && showD.length === 0 && showE.length === 0) {
            listsContainer.style.display = 'none';
         } else {
            listsContainer.style.display = 'grid';
         }
      }
      renderWeeklyCalendar();
      renderGamePanel();
      renderAutomationPanel();
      lucide.createIcons();
    }

    function renderWeeklyCalendar() {
      const grid = document.getElementById('weekly-calendar-grid');
      const dateLabel = document.getElementById('weekly-calendar-date');
      if (!grid) return;

      const today = new Date();
      dateLabel.textContent = today.toLocaleDateString('pt-BR', { month: 'long' });

      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date();
      monday.setDate(today.getDate() - distanceToMonday);

      const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let html = '';
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const dateKey = localDateKey(d);
        const isToday = dateKey === todayKey();
        const isFuture = d > todayStart;

        let statusColor = 'var(--bg-lighter)';
        let opacity = '0.3';
        let textColor = 'var(--text)';
        let totalActivity = 0;

        if (!isFuture) {
           const doneOverall = taskStats[dateKey]?.done || 0;
           const totalReq = taskStats[dateKey]?.total || 0;

           const doneH = (dailyTaskLogs[dateKey] || []).length;
           totalActivity = Math.max(doneOverall, doneH);
           
           if (totalReq > 0 && doneOverall >= totalReq) {
              statusColor = 'var(--success)';
              opacity = '1';
              textColor = '#000';
           } else if (totalActivity > 0) {
              if (totalActivity >= 4) {
                 statusColor = 'var(--accent)';
                 opacity = '1';
                 textColor = '#fff';
              } else if (totalActivity >= 2) {
                 statusColor = 'var(--accent2)';
                 opacity = '0.8';
                 textColor = '#fff';
              } else {
                 statusColor = 'var(--accent3)';
                 opacity = '0.7';
                 textColor = '#fff';
              }
           } else if (isToday) {
               opacity = '0.1';
           }
        }

        const borderStyle = isToday ? '2px solid var(--accent)' : '2px solid transparent';
        const dayNum = d.getDate();
        
        let titleStr = '';
        if (isFuture) titleStr = 'Ainda não chegou';
        else if (totalActivity > 0) titleStr = `${totalActivity} atividades feitas`;
        else titleStr = 'Nenhuma atividade registrada';

        html += `
          <div style="display:flex;flex-direction:column;align-items:center;opacity:${isFuture ? '0.4' : '1'}; flex: 1;">
            <span style="font-size:11px;font-weight:600;color:${isToday ? 'var(--accent)' : 'var(--text-muted)'};margin-bottom:8px">${daysOfWeek[i]}</span>
            <div title="${titleStr}" style="width:34px;height:34px;border-radius:50%;background:${statusColor};opacity:${opacity};border:${borderStyle};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${textColor};transition:transform 0.2s;cursor:pointer" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
              ${dayNum}
            </div>
          </div>
        `;
      }
      grid.innerHTML = html;
    }

    // =============================================
    // TASKS
    // =============================================
    function addTask() {
      const text = document.getElementById('task-input').value.trim();
      if (!text) { shake('task-input'); return; }
      const task = {
        id: uid(), text,
        priority: document.getElementById('task-priority').value,
        datetime: document.getElementById('task-datetime').value || getDefaultTaskDateTime(),
        repeatDaily: document.getElementById('task-repeat-daily').checked,
        hasExercise: document.getElementById('task-has-exercise').checked,
        createdByAI: false,
        done: false, created: new Date().toISOString()
      };
      if (task.repeatDaily) task.datetime = getTaskEffectiveDateTime(task);
      tasks.unshift(task);
      save(STORAGE_KEYS.tasks, tasks);
      document.getElementById('task-input').value = '';
      document.getElementById('task-repeat-daily').checked = false;
      document.getElementById('task-has-exercise').checked = false;
      document.getElementById('task-datetime').value = getDefaultTaskDateTime();
      syncTaskFormState();
      updateTodayTaskStats();
      persistDaySnapshot(todayKey());
      refreshUI();
      checkNotificationEngine();
    }

    function toggleTask(id) {
      const t = tasks.find(t => t.id === id);
      if (!t) return;
      const wasDone = t.done;
      const today = todayKey();
      if (!Array.isArray(rewardLedger.tasks[today])) rewardLedger.tasks[today] = [];
      const hadReward = rewardLedger.tasks[today].includes(id);

      if (t.repeatDaily) {
        if (!dailyTaskLogs[today]) dailyTaskLogs[today] = [];
        if (!wasDone) {
          if (!dailyTaskLogs[today].includes(id)) dailyTaskLogs[today].push(id);
        } else {
          dailyTaskLogs[today] = dailyTaskLogs[today].filter(x => x !== id);
        }
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
      }

      t.done = !t.done;
      if (t.done) {
        t.completedAt = new Date().toISOString();
        recordTaskCompletion(id, today, t.completedAt);
      } else {
        t.completedAt = '';
        clearTaskCompletion(id, today);
      }
      save(STORAGE_KEYS.tasks, tasks);
      if (!wasDone && t.done && !rewardLedger.tasks[today].includes(id)) {
        rewardLedger.tasks[today].push(id);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        if (t.createdByAI) {
          gameState.aiTasksCompleted = Number(gameState.aiTasksCompleted || 0) + 1;
          saveGameState();
        }
        grantXp(getTaskXp(t), `Tarefa concluída: ${truncateText(t.text, 40)}`);
      }
      if (wasDone && !t.done && hadReward) {
        rewardLedger.tasks[today] = rewardLedger.tasks[today].filter(taskId => taskId !== id);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        grantXp(-getTaskXp(t));
      }
      updateTodayTaskStats();
      recalcActivityStreak();
      persistDaySnapshot(today);
      checkMissionRewards();
      evaluateAchievements();
      refreshUI();
      checkNotificationEngine();
    }

    function deleteTask(id) {
      showConfirm('Excluir tarefa?', 'Esta a??o n?o pode ser desfeita.', () => {
        clearTaskCompletion(id);
        tasks = tasks.filter(t => t.id !== id);
        Object.keys(timeblocks).forEach(block => {
          timeblocks[block] = timeblocks[block].filter(taskId => taskId !== id);
        });
        Object.keys(rewardLedger.tasks || {}).forEach(day => {
          rewardLedger.tasks[day] = (rewardLedger.tasks[day] || []).filter(taskId => taskId !== id);
          if (!rewardLedger.tasks[day].length) delete rewardLedger.tasks[day];
        });
        Object.keys(taskExerciseLog || {}).forEach(key => {
          if (key.startsWith(`${id}:`)) delete taskExerciseLog[key];
        });
        exerciseChallenges = exerciseChallenges.filter(challenge => challenge.taskId !== id);
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.timeblocks, timeblocks);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        save(STORAGE_KEYS.taskExerciseLog, taskExerciseLog);
        save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
        updateTodayTaskStats();
        persistDaySnapshot(todayKey());
        checkMissionRewards();
        evaluateAchievements();
        refreshUI();
      });
    }

    function editTask(id) {
      const t = tasks.find(t => t.id === id);
      if (!t) return;
      editingTaskId = id;
      document.getElementById('edit-task-text').value = t.text;
      document.getElementById('edit-task-priority').value = t.priority;
      document.getElementById('edit-task-datetime').value = t.repeatDaily ? getTaskEffectiveDateTime(t) : (t.datetime || getDefaultTaskDateTime());
      document.getElementById('edit-task-repeat-daily').checked = Boolean(t.repeatDaily);
      document.getElementById('edit-task-has-exercise').checked = Boolean(t.hasExercise);
      syncTaskFormState(true);
      openModal('modal-edit-task');
    }

    function saveEditTask() {
      const t = tasks.find(t => t.id === editingTaskId);
      if (!t) return;
      t.text = document.getElementById('edit-task-text').value.trim() || t.text;
      t.priority = document.getElementById('edit-task-priority').value;
      t.datetime = document.getElementById('edit-task-datetime').value || getDefaultTaskDateTime();
      t.repeatDaily = document.getElementById('edit-task-repeat-daily').checked;
      t.hasExercise = document.getElementById('edit-task-has-exercise').checked;
      if (t.repeatDaily) t.datetime = getTaskEffectiveDateTime(t);
      save(STORAGE_KEYS.tasks, tasks);
      closeModal('modal-edit-task');
      updateTodayTaskStats();
      persistDaySnapshot(todayKey());
      checkMissionRewards();
      evaluateAchievements();
      refreshUI();
      checkNotificationEngine();
    }

    function filterTasks(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasks();
    }

    function getFilteredTasks() {
      const today = todayKey();
      switch (currentFilter) {
        case 'pending': return tasks.filter(t => !t.done);
        case 'done': return tasks.filter(t => t.done);
        case 'today': return tasks.filter(t => isTaskForDate(t, today));
        case 'high': return tasks.filter(t => t.priority === 'high');
        default: return tasks;
      }
    }

    function renderTasks() {
      const list = document.getElementById('tasks-list');
      if (!list) return;
      const filtered = getFilteredTasks();
      if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
      <p>Nenhuma tarefa encontrada.</p>
    </div>`;
        return;
      }
      list.innerHTML = filtered.map(t => {
        const schedule = t.datetime ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : '';
        const cadence = `<span class="tag">${getTaskStateLabel(t)}</span>`;
        const exercise = t.hasExercise ? `<span class="tag">Se falhar: ${getTaskExercisePlan(t).title}</span>` : '';
        return `<div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
        ${t.done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </div>
      <div class="task-content">
        <div class="task-title-row">
          <div class="task-text">${t.text}</div>
          <span class="task-state-tag">${getTaskStateLabel(t)}</span>
        </div>
        <div class="task-meta" style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">${badgeHTML(t.priority)} ${cadence} ${schedule} ${exercise}</div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="editTask('${t.id}')"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
        <button class="icon-btn del" onclick="deleteTask('${t.id}')"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
      </div>
    </div>`;
      }).join('');
      lucide.createIcons();
    }

    function badgeHTML(p) {
      const map = { high: ['badge-high', '↑ Alta'], med: ['badge-med', '→ Média'], low: ['badge-low', '↓ Baixa'] };
      const [cls, label] = map[p] || map.med;
      return `<span class="badge ${cls}">${label}</span>`;
    }
    function formatDT(dt) {
      if (!dt) return '';
      const d = new Date(dt);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // =============================================
    // HABITS
    // =============================================




    function recalcStreaks() {
      habits.forEach(h => {
        let streak = 0;
        const d = new Date();
        while (true) {
          const key = localDateKey(d);
          if ((habitLogs[key] || []).includes(h.id)) { streak++; d.setDate(d.getDate() - 1); }
          else break;
        }
        h.streak = streak;
      });
      save(STORAGE_KEYS.habits, habits);
    }



    function renderHabits() {
      const list = document.getElementById('habits-list');
      const today = todayKey();
      if (!list) return;
      if (habits.length === 0) {
        list.innerHTML = `<div class="empty-state"><p>Nenhum hábito cadastrado ainda.</p></div>`;
      } else {
        list.innerHTML = habits.map(h => {
          const done = (habitLogs[today] || []).includes(h.id);
          const hot = h.streak >= 3;
          return `<div class="habit-item ${done ? 'done-today' : ''}" onclick="toggleHabit('${h.id}')">
        <span class="habit-icon">${h.emoji}</span>
        <span class="habit-name">${h.name}</span>
        <span class="streak-badge ${hot ? 'hot' : ''}">🔥 ${h.streak}d</span>
        <div class="habit-check">${done ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}</div>
        <button class="icon-btn del" style="opacity:0.4" onclick="event.stopPropagation();deleteHabit('${h.id}')"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
      </div>`;
        }).join('');
      }

      // Weekly heatmap
      renderHeatmap();
      lucide.createIcons();
    }

    function renderHeatmap() {
      const hm = document.getElementById('weekly-heatmap');
      if (!hm) return;
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
      });
      const dailyTasks = tasks.filter(t => t.repeatDaily);
      if (dailyTasks.length === 0) { hm.innerHTML = '<p class="text-muted text-sm">Adicione tarefas diárias para ver o progresso contínuo.</p>'; return; }
      hm.innerHTML = dailyTasks.map(t => {
        const cells = dates.map(d => {
          const key = localDateKey(d);
          const isDone = (dailyTaskLogs[key] || []).includes(t.id);
          const isToday = key === todayKey();
          return `<div class="hm-day">
        <div class="hm-label">${days[d.getDay()]}</div>
        <div class="hm-cell ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}" title="${key}"></div>
      </div>`;
        }).join('');
        return `<div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">${t.text}</div>
      <div class="heatmap-scroll"><div class="heatmap">${cells}</div></div>
    </div>`;
      }).join('');
    }

    // =============================================
    // TIME BLOCKS
    // =============================================
    function renderTimeBlocks() {
      const tbDate = document.getElementById('tb-date');
      if (tbDate) tbDate.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

      const headerConfig = {
        morning: { slot: '06h-12h', label: 'Manhã', time: '06:00 - 12:00', color: 'var(--warn)' },
        afternoon: { slot: '12h-18h', label: 'Tarde', time: '12:00 - 18:00', color: 'var(--accent3)' },
        evening: { slot: '18h-22h', label: 'Noite', time: '18:00 - 22:00', color: 'var(--accent)' },
        night: { slot: '22h-06h', label: 'Madrugada', time: '22:00 - 06:00', color: 'var(--muted)' },
      };
      Object.entries(headerConfig).forEach(([block, config]) => {
        const header = document.querySelector(`#page-tasks .time-block.${block} .time-block-header`);
        if (!header) return;
        header.innerHTML = `<span class="tag">${config.slot}</span><span class="block-label" style="color:${config.color}">${config.label}</span><span class="block-time">${config.time}</span>`;
      });
      const suggestedRoutineTitle = document.querySelector('#page-tasks #suggested-routine')?.previousElementSibling;
      if (suggestedRoutineTitle) suggestedRoutineTitle.textContent = 'Sugestão de rotina';

      // Render dropped tasks in each block
      ['morning', 'afternoon', 'evening', 'night'].forEach(block => {
        const container = document.getElementById(`block-${block}-tasks`);
        if (!container) return;
        const blockTasks = (timeblocks[block] || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
        if (blockTasks.length === 0) { container.innerHTML = ''; return; }
        container.innerHTML = blockTasks.map(t =>
          `<span class="block-task" draggable="true" style="cursor:grab; display:flex; justify-content:space-between; align-items:center" ondragstart="dragTask(event,'${t.id}')" ondragover="allowDropTask(event)" ondragleave="dragLeaveTask(event)" ondrop="dropOnTask(event,'${t.id}', '${block}')"><span>${t.text}</span> <span style="cursor:pointer;opacity:0.5;padding:0 4px" onclick="removeFromBlock('${t.id}','${block}')">✕</span></span>`
        ).join('');
      });

      // Draggable pending tasks
      const dgl = document.getElementById('drag-tasks-list');
      if (dgl) {
        const pending = getTodayTasks().filter(t => !t.done && !isInAnyBlock(t.id));
        if (pending.length === 0) {
          dgl.innerHTML = '<p class="text-muted text-sm">Nenhuma tarefa pendente. 🎉</p>';
        } else {
          dgl.innerHTML = pending.map(t =>
            `<div class="block-task pending-task" draggable="true" ondragstart="dragTask(event,'${t.id}')" style="cursor:grab">
          <div>${badgeHTML(t.priority)} ${t.text}</div>
          <div class="block-assign">
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${t.id}','morning')">Manhã</button>
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${t.id}','afternoon')">Tarde</button>
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${t.id}','evening')">Noite</button>
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${t.id}','night')">Madrugada</button>
          </div>
        </div>`
          ).join('');
        }
      }

      // Suggested routine
      const sr = document.getElementById('suggested-routine');
      if (sr) {
        sr.innerHTML = `
      <div class="text-sm text-muted" style="line-height:1.8">
        <div>🌅 <strong>07:00</strong> Acordar e café da manhã</div>
        <div>📧 <strong>08:00</strong> E-mails e tarefas urgentes</div>
        <div>💻 <strong>10:00</strong> Foco profundo</div>
        <div>☀️ <strong>12:30</strong> Almoço e pausa</div>
        <div>💻 <strong>14:00</strong> Continuação do trabalho</div>
        <div>🏃 <strong>17:00</strong> Exercício físico</div>
        <div>📚 <strong>19:00</strong> Leitura ou estudo</div>
        <div>🧘 <strong>21:00</strong> Meditação e encerramento</div>
        <div>😴 <strong>23:00</strong> Dormir</div>
      </div>`;
      }
      lucide.createIcons();
    }

    function isInAnyBlock(id) {
      return Object.values(timeblocks).some(arr => arr.includes(id));
    }

    let draggedTaskId = null;
    function dragTask(event, id) { draggedTaskId = id; event.dataTransfer.effectAllowed = 'move'; }

    function allowDropTask(event) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.style.boxShadow = '0 -3px 0 var(--accent)';
    }

    function dragLeaveTask(event) {
      event.currentTarget.style.boxShadow = '';
    }

    function dropOnTask(event, targetId, block) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.style.boxShadow = '';
      if (!draggedTaskId || draggedTaskId === targetId) return;
      
      Object.keys(timeblocks).forEach(b => {
        timeblocks[b] = timeblocks[b].filter(id => id !== draggedTaskId);
      });
      
      let blockArr = timeblocks[block] || [];
      const targetIdx = blockArr.indexOf(targetId);
      if (targetIdx !== -1) {
        blockArr.splice(targetIdx, 0, draggedTaskId);
      } else {
        blockArr.push(draggedTaskId);
      }
      timeblocks[block] = blockArr;
      save(STORAGE_KEYS.timeblocks, timeblocks);
      timeblockHistory[todayKey()] = true;
      save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
      draggedTaskId = null;
      checkMissionRewards();
      refreshUI();
    }

    function allowDrop(event) {
      event.preventDefault();
      event.currentTarget.classList.add('drag-over');
    }
    function dropTask(event, block) {
      event.preventDefault();
      event.currentTarget.classList.remove('drag-over');
      moveTaskToBlock(draggedTaskId, block);
    }
    function moveTaskToBlock(taskId, block) {
      if (!taskId) return;
      Object.keys(timeblocks).forEach(b => {
        timeblocks[b] = timeblocks[b].filter(id => id !== taskId);
      });
      timeblocks[block] = [...(timeblocks[block] || []), taskId];
      save(STORAGE_KEYS.timeblocks, timeblocks);
      timeblockHistory[todayKey()] = true;
      save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
      draggedTaskId = null;
      persistDaySnapshot(todayKey());
      checkMissionRewards();
      evaluateAchievements();
      refreshUI();
    }
    function removeFromBlock(taskId, block) {
      timeblocks[block] = timeblocks[block].filter(id => id !== taskId);
      save(STORAGE_KEYS.timeblocks, timeblocks);
      persistDaySnapshot(todayKey());
      checkMissionRewards();
      evaluateAchievements();
      refreshUI();
    }

    // Remove drag-over on dragleave
    document.addEventListener('dragleave', e => {
      if (e.target.classList?.contains('drop-zone')) e.target.classList.remove('drag-over');
    });

    // =============================================
    // STATS
    // =============================================
    let chartTasks = null, chartHabits = null;

    function renderStats() {
      const today = todayKey();
      const todayTasks = getTodayTasks();
      const doneTodayTasks = todayTasks.filter(t => t.done).length;
      const dailyTasks = tasks.filter(t => t.repeatDaily);
      const totalHabits = dailyTasks.length;
      const doneHabitsToday = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;
      const maxStreak = 0; // Streaks removed for simplicity

      const summary = document.getElementById('stats-summary');
      const level = getLevelFromXp(gameState.xp || 0);
      const gamificationOn = isGamificationEnabled();

      const totalCompletedTasks = Object.values(taskStats).reduce((sum, day) => sum + (day.done || 0), 0);
      const allDays = Object.keys(taskStats).length || 1;
      const completionAvg = Math.round((totalCompletedTasks / (allDays * Math.max(tasks.filter(t => !t.repeatDaily).length, 1))) * 100);
      const workoutDaysTotal = Object.keys(fitnessLogs || {}).filter(key => Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0).length;
      const activeDays = Object.keys(taskStats || {}).filter(key => Number(taskStats[key]?.done || 0) > 0).length;
      const timeblockDays = Object.keys(timeblockHistory || {}).length;

      if (summary) {
        const cards = gamificationOn
          ? [
              { n: `${doneTodayTasks}/${todayTasks.length}`, l: 'Tarefas Hoje' },
              { n: `${doneHabitsToday}/${totalHabits}`, l: 'Hábitos Hoje' },
              { n: `${gameState.dayStreak || 0}d`, l: 'Sequência' },
              { n: `Lv ${level}`, l: 'Nível Atual' },
              { n: `${totalCompletedTasks}`, l: 'Total Concluídas' },
              { n: `${(gameState.badges || []).length}`, l: 'Conquistas' },
            ]
          : [
              { n: `${doneTodayTasks}/${todayTasks.length}`, l: 'Tarefas Hoje' },
              { n: `${doneHabitsToday}/${totalHabits}`, l: 'Hábitos Hoje' },
              { n: `${activeDays}`, l: 'Dias Ativos' },
              { n: `${timeblockDays}`, l: 'Dias com Blocos' },
              { n: `${totalCompletedTasks}`, l: 'Total Concluídas' },
              { n: `${workoutDaysTotal}`, l: 'Dias de Treino' },
            ];
        summary.innerHTML = cards.map(s => `<div class="stat-box" style="padding:16px"><div class="stat-number">${s.n}</div><div class="stat-label">${s.l}</div></div>`).join('');
      }

      // Build last 7 days
      const labels = [];
      const taskData = [];
      const habitData = [];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const bestDayScore = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = localDateKey(d);
        const dayLabel = dayNames[d.getDay()];
        labels.push(dayLabel);
        const totalDayTasks = taskStats[key]?.total || tasks.filter(t => t.repeatDaily ? localDateKey(new Date(t.created || new Date())) <= key : getTaskDateKey(t) === key).length;
        const doneTasks = taskStats[key]?.done || 0;
        const pctTask = totalDayTasks ? Math.round((doneTasks / totalDayTasks) * 100) : 0;
        const doneH = dailyTasks.filter(t => (dailyTaskLogs[key] || []).includes(t.id)).length;
        const pctHabit = dailyTasks.length ? Math.round((doneH / dailyTasks.length) * 100) : 0;
        taskData.push(pctTask);
        habitData.push(pctHabit);
        bestDayScore[dayLabel] = (bestDayScore[dayLabel] || 0) + pctTask + pctHabit;
      }

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c6df7';
      const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#5ce6b8';
      const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#111118';
      const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#6b6b88';
      const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8e8f0';

      const chartDefaults = {
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: muted } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: muted }, min: 0, max: 100 }
        },
        plugins: { legend: { labels: { color: textColor } } },
        responsive: true, maintainAspectRatio: true,
      };

      if (chartTasks) chartTasks.destroy();
      chartTasks = new Chart(document.getElementById('chart-tasks'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: '% Concluído', data: taskData, backgroundColor: accent + '88', borderColor: accent, borderWidth: 2, borderRadius: 6 }]
        },
        options: chartDefaults
      });

      if (chartHabits) chartHabits.destroy();
      chartHabits = new Chart(document.getElementById('chart-habits'), {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: '% Hábitos Feitos', data: habitData, borderColor: accent2, backgroundColor: accent2 + '22', tension: 0.4, fill: true, pointBackgroundColor: accent2 }]
        },
        options: chartDefaults
      });

      // Best days
      const bestDays = document.getElementById('best-days');
      if (bestDays) {
        const sorted = Object.entries(bestDayScore).sort((a, b) => b[1] - a[1]);
        bestDays.innerHTML = sorted.map(([day, score], i) => `
      <div class="flex items-center gap-3 mb-3">
        <span style="width:24px;height:24px;border-radius:50%;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--muted)">${i + 1}</span>
        <span style="font-weight:600;width:48px">${day}</span>
        <div class="progress-bar" style="flex:1"><div class="progress-fill" style="background:var(--accent);width:${Math.min(score, 200) / 2}%"></div></div>
        <span class="mono text-muted text-sm">${score}pts</span>
      </div>`).join('');
      }
      renderMonthlyProgress();
      lucide.createIcons();
    }

    // =============================================
    // RESET DAY
    // =============================================
    function confirmResetDay() {
      showConfirm('Resetar o dia?', 'Isso vai limpar tarefas concluídas, hábitos marcados e blocos da agenda de hoje.', () => {
        resetDayState({ manual: true });
      });
    }

    // =============================================
    // EXPORT
    // =============================================
    function exportData() {
      const data = {
        tasks,
        habits,
        habitLogs,
        taskStats,
        timeblocks,
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
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `minha-rotina-${todayKey()}.json`;
      a.click(); URL.revokeObjectURL(url);
    }

    // =============================================
    // MODAL HELPERS
    // =============================================
    function openModal(id) { document.getElementById(id)?.classList.add('open'); }
    function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

    let confirmCallback = null;
    function showConfirm(title, msg, cb) {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent = msg;
      confirmCallback = cb;
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
        closeSidebar();
      }
    });

    // =============================================
    // ROTINA AI LOGIC
    // =============================================
    function sendAIMessage(text, sender = 'user') {
      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      const wrapper = document.createElement('div');
      
      if (sender === 'user') {
         wrapper.style.cssText = "display:flex; gap:12px; align-items:flex-end; max-width:90%; align-self:flex-end; flex-direction:row-reverse;";
         wrapper.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;background:var(--surface3);display:flex;align-items:center;justify-content:center;color:var(--text);font-size:14px;flex-shrink:0">👤</div>
            <div class="ai-msg user-msg">${text}</div>
         `;
      } else {
         wrapper.style.cssText = "display:flex; gap:12px; align-items:flex-end; max-width:90%; align-self:flex-start;";
         wrapper.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;box-shadow:0 4px 10px rgba(124,109,247,0.3)">✨</div>
            <div class="ai-msg bot-msg">${text}</div>
         `;
      }
      
      chat.appendChild(wrapper);
      chat.scrollTop = chat.scrollHeight;
    }

    // Histórico de conversa da IA
    let aiChatHistory = load(STORAGE_KEYS.aiChatHistory, []);

    function renderAIChatHistory() {
      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      
      const firstChild = chat.firstElementChild;
      chat.innerHTML = '';
      if (firstChild) chat.appendChild(firstChild);
      
      aiChatHistory.forEach(msg => {
        const text = msg.parts[0].text;
        if (msg.role === 'user') {
          sendAIMessage(text, 'user');
        } else {
          let aiResp;
          try {
            aiResp = JSON.parse(text.replace(/```json|```/g, '').trim());
          } catch(e) {
            aiResp = { message: text, actions: [] };
          }
          sendAIMessage(aiResp.message || 'Pronto!', 'bot');
        }
      });
    }

    function clearAIChatHistory() {
       showConfirm('Limpar conversa?', 'Isso apagará o histórico da IA e resetará o contexto da conversa. As suas tarefas não serão afetadas.', () => {
          aiChatHistory = [];
          save(STORAGE_KEYS.aiChatHistory, aiChatHistory);
          renderAIChatHistory();
       });
    }

    function addTaskRaw(title, isDaily = false, priority = 'med') {
      tasks.unshift({
        id: uid(), text: title,
        priority: priority,
        datetime: getDefaultTaskDateTime(),
        repeatDaily: isDaily,
        hasExercise: false,
        done: false, created: new Date().toISOString()
      });
      save(STORAGE_KEYS.tasks, tasks);
    }

    // Executa ações retornadas pela IA
    function executeAIActions(actions) {
      if (!actions || !Array.isArray(actions)) return [];
      const log = [];
      const today = todayKey();
      let aiMutationCount = 0;

      actions.forEach(action => {
        switch (action.type) {

          case 'create': {
            const t = {
              id: uid(),
              text: action.text,
              priority: action.priority || 'med',
              datetime: getDefaultTaskDateTime(),
              repeatDaily: action.repeatDaily || false,
              hasExercise: false,
              createdByAI: true,
              done: false,
              created: new Date().toISOString()
            };
            tasks.unshift(t);
            aiMutationCount += 1;
            log.push(`➕ Criada: <b>${action.text}</b>`);
            break;
          }

          case 'delete': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match) clearTaskCompletion(t.id, today);
              return !match;
            });
            const removed = before - tasks.length;
            if (removed > 0) log.push(`🗑️ Removida: <b>${action.text || action.id}</b>`);
            break;
          }

          case 'complete': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match && !t.done) {
                t.done = true;
                t.completedAt = new Date().toISOString();
                recordTaskCompletion(t.id, today, t.completedAt);
                if (!Array.isArray(rewardLedger.tasks[today])) rewardLedger.tasks[today] = [];
                if (!rewardLedger.tasks[today].includes(t.id)) {
                  rewardLedger.tasks[today].push(t.id);
                  grantXp(getTaskXp(t), `Tarefa concluída: ${t.text}`);
                }
                log.push(`✅ Concluída: <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'uncomplete': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match && t.done) {
                t.done = false;
                t.completedAt = '';
                clearTaskCompletion(t.id, today);
                log.push(`↩️ Desmarcada: <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'edit': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match) {
                const old = t.text;
                if (action.newText)     t.text        = action.newText;
                if (action.priority)    t.priority    = action.priority;
                if (action.repeatDaily !== undefined) t.repeatDaily = action.repeatDaily;
                aiMutationCount += 1;
                log.push(`✏️ Editada: <b>${old}</b> → <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'clear_done': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              if (t.done) clearTaskCompletion(t.id, today);
              return !t.done;
            });
            const removed = before - tasks.length;
            if (removed > 0) log.push(`🧹 ${removed} tarefa(s) concluída(s) removida(s)`);
            break;
          }
        }
      });

      if (log.length > 0) {
        if (aiMutationCount > 0) recordAiAction(aiMutationCount, today);
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        updateTodayTaskStats();
        recalcActivityStreak();
        persistDaySnapshot(today);
        checkMissionRewards();
        evaluateAchievements();
        refreshUI();
      }
      return log;
    }

    async function processAIInput() {
      const input = document.getElementById('ai-input');
      const text = input.value.trim();
      if (!text) return;

      const apiKey = localStorage.getItem('mr_gemini_key');
      if (!apiKey) {
        sendAIMessage('Para usar a IA, configure sua <b>Chave do Google Gemini</b>.<br><br>👉 Clique em ⚙️ no topo direito desta tela. É grátis!', 'bot');
        return;
      }

      sendAIMessage(text, 'user');
      input.value = '';

      // Histórico multi-turno
      aiChatHistory.push({ role: 'user', parts: [{ text }] });
      if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
      save(STORAGE_KEYS.aiChatHistory, aiChatHistory);

      const chat = document.getElementById('ai-chat-history');
      const typingId = 'typing-' + Date.now();
      const typingEl = document.createElement('div');
      typingEl.id = typingId;
      typingEl.style.cssText = 'display:flex;gap:12px;align-items:flex-end;max-width:90%;align-self:flex-start;';
      typingEl.innerHTML = `
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;box-shadow:0 4px 10px rgba(124,109,247,0.3)">✨</div>
        <div class="ai-msg bot-msg" style="opacity:0.6;font-style:italic">Pensando...</div>
      `;
      chat.appendChild(typingEl);
      chat.scrollTop = chat.scrollHeight;

      try {
        // Snapshot das tarefas atuais para contexto
        const userName = (load(STORAGE_KEYS.name, '') || 'usuário').trim();
        const today = todayKey();
        const taskList = tasks.map(t =>
          `[id:${t.id}] "${t.text}" | prioridade:${t.priority} | diária:${t.repeatDaily} | concluída:${t.done}`
        ).join('\n') || 'Nenhuma tarefa cadastrada.';

        const sysPrompt = `Você é a Rotina A.I., assistente de produtividade integrado ao app "Minha Rotina" do usuário ${userName}.
Você pode LER e MODIFICAR as tarefas do app diretamente. Responda em português, de forma amigável (use HTML básico: <b>, <br>, <em>).

TAREFAS ATUAIS DO USUÁRIO (data: ${today}):
${taskList}

AÇÕES DISPONÍVEIS — retorne um array "actions" com objetos:
- Criar tarefa:    {"type":"create",    "text":"nome",  "priority":"high|med|low", "repeatDaily":false}
- Deletar tarefa:  {"type":"delete",    "text":"trecho do nome ou id exato"}
- Concluir:        {"type":"complete",  "text":"trecho do nome"}
- Desmarcar:       {"type":"uncomplete","text":"trecho do nome"}
- Editar:          {"type":"edit",      "text":"trecho atual", "newText":"novo nome", "priority":"med", "repeatDaily":false}
- Limpar feitas:   {"type":"clear_done"}

REGRAS:
- Use "text" para identificar tarefas pelo nome (busca parcial, case-insensitive)
- Só execute ações que o usuário pediu explicitamente ou que fazem sentido no contexto
- Se o usuário só conversa, retorne actions:[]
- NÃO invente IDs — use sempre "text" para identificar

MANDATÓRIO: retorne JSON puro sem crases:
{"message":"sua resposta em html","actions":[...]}`;

        const payload = {
          system_instruction: { parts: [{ text: sysPrompt }] },
          contents: aiChatHistory,
          generationConfig: { responseMimeType: 'application/json' }
        };

        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );

        if (!response.ok) throw new Error('API recusou o acesso. Verifique sua chave.');
        const data = await response.json();
        const rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawResult) throw new Error('Resposta em branco da IA.');

        document.getElementById(typingId)?.remove();

        let aiResp;
        try {
          aiResp = JSON.parse(rawResult.replace(/```json|```/g, '').trim());
        } catch(e) {
          aiResp = { message: rawResult, actions: [] };
        }

        // Adiciona resposta ao histórico
        aiChatHistory.push({ role: 'model', parts: [{ text: rawResult }] });
        save(STORAGE_KEYS.aiChatHistory, aiChatHistory);

        let msg = aiResp.message || 'Aqui está sua resposta.';
        if (aiResp.actions && aiResp.actions.length > 0) {
           const actionsStr = JSON.stringify(aiResp.actions).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
           msg += `<br><br><div style="margin-top:12px">
             <button class="btn btn-primary w-full p-2 text-sm" onclick="applyAIActions('${actionsStr}', this)">✨ Aplicar no app</button>
           </div>`;
        }

        sendAIMessage(msg, 'bot');

      } catch (err) {
        document.getElementById(typingId)?.remove();
        sendAIMessage(`<b>Erro:</b> ${err.message}`, 'bot');
      }
    }

    window.applyAIActions = function(actionsStr, btn) {
      try {
        const actions = JSON.parse(actionsStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        const actionLog = executeAIActions(actions);
        btn.disabled = true;
        btn.textContent = 'Ações aplicadas ✅';
        btn.classList.replace('btn-primary', 'btn-success');
        if (actionLog.length > 0) {
          const logDiv = document.createElement('div');
          logDiv.style.cssText = "font-size:12px;opacity:0.8;margin-top:8px;line-height:1.6";
          logDiv.innerHTML = actionLog.join('<br>');
          btn.parentNode.appendChild(logDiv);
        }
      } catch(e) {
        showToast("Erro ao aplicar", "Não foi possível aplicar as alterações.", "danger");
      }
    };

    function openAiSettings() {
      document.getElementById('ai-api-key').value = localStorage.getItem('mr_gemini_key') || '';
      openModal('modal-ai-settings');
    }

    function saveAiSettings() {
      const k = document.getElementById('ai-api-key').value.trim();
      if (k) {
        localStorage.setItem('mr_gemini_key', k);
        closeModal('modal-ai-settings');
        showConfirm('Cérebros conectados! 🧠', 'Sua chave foi salva localmente. A IA agora tem acesso total à sua rotina!', () => {});
      } else {
        localStorage.removeItem('mr_gemini_key');
        closeModal('modal-ai-settings');
      }
    }


    // Exercise Detail Modal
    let _detailEx = null; // current exercise shown in detail modal

    function openExerciseDetail(dayIdx, exIdx) {
      const plan = fitnessPlan?.weeklyPlan;
      let ex = null;
      if (plan && dayIdx !== undefined) {
        ex = plan[dayIdx]?.exercises?.[exIdx];
      }
      if (!ex) return;
      _detailEx = ex;

      const today = todayKey();
      const done = (fitnessLogs[today] || []).includes(ex.name);

      document.getElementById('exd-name').textContent = ex.name;
      document.getElementById('exd-focus-label').textContent =
        (fitnessPlan?.weeklyPlan?.[dayIdx]?.focus || 'TREINO').toUpperCase();

      // Chips
      const chips = document.getElementById('exd-chips');
      chips.innerHTML = [
        { icon: '🔁', label: `${ex.sets} séries` },
        { icon: '💪', label: `${ex.reps} reps` },
        { icon: '⏱️', label: `${ex.rest} de descanso` },
      ].map(c => `<span style="background:var(--surface3);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--text)">${c.icon} ${c.label}</span>`).join('');

      // Muscles
      const muscles = document.getElementById('exd-muscles');
      muscles.innerHTML = (ex.muscles || []).map(m =>
        `<span style="background:rgba(124,109,247,0.12);color:var(--accent);border-radius:20px;padding:3px 9px;font-size:11px;font-weight:600">${m}</span>`
      ).join('');

      // How to
      const howto = document.getElementById('exd-howto');
      const steps = ex.howTo || [];
      if (steps.length > 0) {
        howto.innerHTML = steps.map(s =>
          `<li style="font-size:13px;color:var(--text);line-height:1.6;padding-left:4px">${s}</li>`
        ).join('');
        document.getElementById('exd-howto-section').style.display = 'block';
      } else {
        document.getElementById('exd-howto-section').style.display = 'none';
      }

      // Tip
      const tipEl = document.getElementById('exd-tip');
      if (ex.tip) {
        tipEl.textContent = ex.tip;
        document.getElementById('exd-tip-section').style.display = 'block';
      } else {
        document.getElementById('exd-tip-section').style.display = 'none';
      }

      // Mistakes
      const mistakes = document.getElementById('exd-mistakes');
      if (ex.mistakes?.length) {
        mistakes.innerHTML = ex.mistakes.map(m =>
          `<div style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--text);line-height:1.5">
            <span style="color:var(--danger);flex-shrink:0;font-size:16px;line-height:1.2">✕</span>${m}
          </div>`
        ).join('');
        document.getElementById('exd-mistakes-section').style.display = 'block';
      } else {
        document.getElementById('exd-mistakes-section').style.display = 'none';
      }

      // Variation
      if (ex.variation) {
        document.getElementById('exd-variation').textContent = ex.variation;
        document.getElementById('exd-variation-section').style.display = 'block';
      } else {
        document.getElementById('exd-variation-section').style.display = 'none';
      }

      // Complete button state
      const btn = document.getElementById('exd-complete-btn');
      if (done) {
        btn.textContent = '✓ Já concluído!';
        btn.disabled = true;
        btn.style.opacity = '0.5';
      } else {
        btn.innerHTML = '✓ Marcar como feito · <b>+25 XP</b>';
        btn.disabled = false;
        btn.style.opacity = '1';
      }

      openModal('modal-exercise-detail');
      lucide.createIcons();
    }

    function completeFromDetail() {
      if (!_detailEx) return;
      completeExercise(_detailEx.name, 25);
      // Update button state
      const btn = document.getElementById('exd-complete-btn');
      btn.textContent = '✓ Já concluído!';
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }

    // Day picker helpers
    function toggleDayPick(btn) {
      btn.classList.toggle('selected');
      updateDaysCount();
    }

    function updateDaysCount() {
      const selected = document.querySelectorAll('#fp-days-picker .day-pick-btn.selected');
      const label = document.getElementById('fp-days-count');
      if (!label) return;
      if (selected.length === 0) {
        label.textContent = 'Nenhum dia selecionado';
      } else {
        const names = Array.from(selected).map(b => b.dataset.day);
        label.textContent = `${selected.length} dia${selected.length > 1 ? 's' : ''}: ${names.join(', ')}`;
        label.style.color = 'var(--accent2)';
      }
    }

    //  FITNESS MODULE



    function openFitnessProfile() {
      if (fitnessProfile) {
        document.getElementById('fp-age').value       = fitnessProfile.age || '';
        document.getElementById('fp-sex').value       = fitnessProfile.sex || 'male';
        document.getElementById('fp-height').value    = fitnessProfile.height || '';
        document.getElementById('fp-weight').value    = fitnessProfile.weight || '';
        document.getElementById('fp-goal').value      = fitnessProfile.goal || 'general';
        document.getElementById('fp-level').value     = fitnessProfile.level || 'beginner';
        // Restore selected days
        document.querySelectorAll('#fp-days-picker .day-pick-btn').forEach(b => {
          const days = Array.isArray(fitnessProfile.days) ? fitnessProfile.days : [];
          b.classList.toggle('selected', days.includes(b.dataset.day));
        });
        updateDaysCount();
        document.getElementById('fp-equipment').value = fitnessProfile.equipment || 'none';
        document.getElementById('fp-notes').value     = fitnessProfile.notes || '';
      }
      openModal('modal-fitness-profile');
    }

    function saveFitnessProfile() {
      const age    = parseInt(document.getElementById('fp-age').value);
      const height = parseFloat(document.getElementById('fp-height').value);
      const weight = parseFloat(document.getElementById('fp-weight').value);

      const selectedDays = Array.from(document.querySelectorAll('#fp-days-picker .day-pick-btn.selected')).map(b => b.dataset.day);
      if (!age || !height || !weight) { showToast('Preencha idade, altura e peso', '', 'warn'); return; }
      if (selectedDays.length === 0) { showToast('Selecione ao menos 1 dia de treino', '', 'warn'); return; }

      const isNew = !fitnessProfile;
      fitnessProfile = {
        age, height, weight,
        sex:       document.getElementById('fp-sex').value,
        goal:      document.getElementById('fp-goal').value,
        level:     document.getElementById('fp-level').value,
        days:      Array.from(document.querySelectorAll('#fp-days-picker .day-pick-btn.selected')).map(b => b.dataset.day),
        equipment: document.getElementById('fp-equipment').value,
        notes:     document.getElementById('fp-notes').value.trim(),
        updatedAt: new Date().toISOString(),
      };

      // Log weight entry automatically
      const today = todayKey();
      fitnessWeightLog = fitnessWeightLog.filter(e => e.date !== today);
      fitnessWeightLog.push({ date: today, weight });
      fitnessWeightLog.sort((a, b) => a.date.localeCompare(b.date));

      save(STORAGE_KEYS.fitnessProfile, fitnessProfile);
      save(STORAGE_KEYS.fitnessWeightLog, fitnessWeightLog);

      if (isNew) {
        grantFitnessXp(50, 'Perfil fitness criado!');
        unlockFitnessBadge('profile_set', '📋 Perfil Configurado', 'Configurou seu perfil físico', '📋');
        if (!isGamificationEnabled()) showToast('Perfil criado!', '', 'success');
      } else {
        showToast('Perfil atualizado!', '', 'success');
      }
      closeModal('modal-fitness-profile');
      renderFitnessPage();
    }

    function openWeightLog() {
      document.getElementById('wl-date').value = todayKey();
      document.getElementById('wl-weight').value = fitnessProfile?.weight || '';
      openModal('modal-weight-log');
    }

    function saveWeightEntry() {
      const weight = parseFloat(document.getElementById('wl-weight').value);
      const date   = document.getElementById('wl-date').value;
      if (!weight || !date) { showToast('Preencha peso e data', '', 'warn'); return; }
      fitnessWeightLog = fitnessWeightLog.filter(e => e.date !== date);
      fitnessWeightLog.push({ date, weight });
      fitnessWeightLog.sort((a, b) => a.date.localeCompare(b.date));
      save(STORAGE_KEYS.fitnessWeightLog, fitnessWeightLog);
      if (fitnessProfile) { fitnessProfile.weight = weight; save(STORAGE_KEYS.fitnessProfile, fitnessProfile); }
      grantFitnessXp(10, 'Peso registrado!');
      if (!isGamificationEnabled()) showToast('Peso registrado!', '', 'success');
      persistDaySnapshot(date);
      checkMissionRewards();
      evaluateAchievements();
      closeModal('modal-weight-log');
      refreshUI();
      renderFitnessPage();
    }

    function getSortedProgressPhotos() {
      return [...progressPhotos].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    function getMonthlyProgressData(limit = 12) {
      const monthKeys = new Set([
        ...Object.keys(taskStats || {}).map(key => key.slice(0, 7)),
        ...Object.keys(fitnessLogs || {}).map(key => key.slice(0, 7)),
        ...fitnessWeightLog.map(entry => String(entry.date || '').slice(0, 7)),
        ...progressPhotos.map(photo => String(photo.date || '').slice(0, 7)),
      ]);

      return [...monthKeys]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limit)
        .map(monthKey => {
          const weights = fitnessWeightLog
            .filter(entry => String(entry.date || '').startsWith(monthKey))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
          const photos = getSortedProgressPhotos().filter(photo => String(photo.date || '').startsWith(monthKey));
          const taskKeys = Object.keys(taskStats || {}).filter(key => key.startsWith(monthKey));
          const fitnessKeys = Object.keys(fitnessLogs || {}).filter(key => key.startsWith(monthKey));
          const tasksDone = taskKeys.reduce((sum, key) => sum + Number(taskStats[key]?.done || 0), 0);
          const workoutDays = fitnessKeys.filter(key => Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0).length;
          const activeDays = taskKeys.filter(key => Number(taskStats[key]?.done || 0) > 0).length;
          const weightStart = weights[0]?.weight ?? null;
          const weightEnd = weights[weights.length - 1]?.weight ?? null;
          const weightDelta = Number.isFinite(weightStart) && Number.isFinite(weightEnd)
            ? Number((weightEnd - weightStart).toFixed(1))
            : null;
          return {
            monthKey,
            label: formatMonthLabel(monthKey),
            photo: photos[0] || null,
            photoCount: photos.length,
            tasksDone,
            workoutDays,
            activeDays,
            weightStart,
            weightEnd,
            weightDelta,
          };
        });
    }

    function renderProgressPhotoPreview(imageData = '') {
      const wrap = document.getElementById('progress-photo-preview-wrap');
      if (!wrap) return;
      if (!imageData) {
        wrap.innerHTML = `<div class="progress-photo-empty">Escolha uma foto para visualizar antes de salvar.</div>`;
        return;
      }
      wrap.innerHTML = `<img src="${imageData}" alt="Prévia da foto de progresso" class="progress-photo-preview" />`;
    }

    function openProgressPhotoModal() {
      pendingProgressPhotoData = '';
      const dateInput = document.getElementById('progress-photo-date');
      const noteInput = document.getElementById('progress-photo-note');
      const fileInput = document.getElementById('progress-photo-file');
      if (dateInput) dateInput.value = todayKey();
      if (noteInput) noteInput.value = '';
      if (fileInput) fileInput.value = '';
      renderProgressPhotoPreview('');
      openModal('modal-progress-photo');
    }

    function compressProgressPhoto(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxSide = 1080;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Não foi possível preparar a imagem.'));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.84));
          };
          img.onerror = () => reject(new Error('A imagem selecionada não pôde ser lida.'));
          img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
        reader.readAsDataURL(file);
      });
    }

    async function handleProgressPhotoSelection(event) {
      const file = event?.target?.files?.[0];
      if (!file) {
        pendingProgressPhotoData = '';
        renderProgressPhotoPreview('');
        return;
      }
      try {
        pendingProgressPhotoData = await compressProgressPhoto(file);
        renderProgressPhotoPreview(pendingProgressPhotoData);
      } catch (error) {
        pendingProgressPhotoData = '';
        renderProgressPhotoPreview('');
        showToast('Erro ao carregar foto', error.message, 'warn');
      }
    }

    function saveProgressPhoto() {
      const date = document.getElementById('progress-photo-date')?.value || todayKey();
      const note = document.getElementById('progress-photo-note')?.value.trim() || '';
      if (!pendingProgressPhotoData) {
        showToast('Selecione uma foto', 'Escolha uma imagem antes de salvar.', 'warn');
        return;
      }
      const newPhoto = {
        id: uid(),
        date,
        note,
        image: pendingProgressPhotoData,
        createdAt: new Date().toISOString(),
      };
      progressPhotos.unshift(newPhoto);
      progressPhotos = getSortedProgressPhotos();
      try {
        save(STORAGE_KEYS.progressPhotos, progressPhotos);
      } catch (error) {
        progressPhotos = progressPhotos.filter(photo => photo.id !== newPhoto.id);
        showToast('Não foi possível salvar', 'O armazenamento local ficou sem espaço para essa foto.', 'warn');
        return;
      }
      closeModal('modal-progress-photo');
      pendingProgressPhotoData = '';
      showToast('Foto salva', 'Seu progresso do mês foi registrado.', 'success');
      refreshUI();
      renderFitnessPage();
      if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
    }

    function deleteProgressPhoto(id) {
      const photo = progressPhotos.find(item => item.id === id);
      if (!photo) return;
      showConfirm('Remover foto?', `A foto de ${new Date(`${photo.date}T00:00:00`).toLocaleDateString('pt-BR')} será apagada do armazenamento local.`, () => {
        progressPhotos = progressPhotos.filter(item => item.id !== id);
        save(STORAGE_KEYS.progressPhotos, progressPhotos);
        refreshUI();
        renderFitnessPage();
        if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
        showToast('Foto removida', 'O registro visual foi apagado.', 'warn');
      });
    }

    function renderProgressPhotoPanel() {
      const panel = document.getElementById('fitness-progress-photo-panel');
      if (!panel) return;
      const latest = getSortedProgressPhotos()[0];
      if (!latest) {
        panel.innerHTML = `
          <div class="progress-photo-upload">
            <div class="progress-photo-empty">
              Ainda não existe foto salva. Registre uma imagem por mês para acompanhar sua evolução visual.
            </div>
          </div>
        `;
        return;
      }
      const latestDate = new Date(`${latest.date}T00:00:00`).toLocaleDateString('pt-BR');
      const monthly = getMonthlyProgressData(3);
      panel.innerHTML = `
        <div class="progress-photo-card">
          <img src="${latest.image}" alt="Última foto de progresso" class="progress-photo-preview" />
          <div class="progress-photo-meta">
            <div>
              <div class="settings-title">Último registro</div>
              <div class="settings-copy">${latestDate} · ${formatMonthLabel(getMonthKey(`${latest.date}T00:00:00`))}</div>
            </div>
            <button class="btn btn-ghost" style="padding:8px 12px" onclick="deleteProgressPhoto('${latest.id}')">Remover</button>
          </div>
          ${latest.note ? `<div class="progress-photo-note">${escapeHtml(latest.note)}</div>` : ''}
          <div class="progress-month-inline">
            ${monthly.map(item => `<span class="tag">${item.label}</span>`).join('')}
          </div>
        </div>
      `;
    }

    function renderMonthlyProgress() {
      const grid = document.getElementById('monthly-progress-grid');
      if (!grid) return;
      const months = getMonthlyProgressData(12);
      if (!months.length) {
        grid.innerHTML = '<div class="empty-state" style="padding:20px 12px">Adicione uma foto de progresso ou registre peso e treinos para montar a linha do tempo mensal.</div>';
        return;
      }
      grid.innerHTML = `<div class="monthly-progress-grid">${months.map(item => {
        const deltaLabel = item.weightDelta === null
          ? 'Sem variação de peso'
          : item.weightDelta === 0
            ? 'Peso estável'
            : item.weightDelta > 0
              ? `+${item.weightDelta.toFixed(1)} kg`
              : `${item.weightDelta.toFixed(1)} kg`;
        const deltaTone = item.weightDelta === null ? 'var(--muted)' : item.weightDelta <= 0 ? 'var(--accent2)' : 'var(--warn)';
        return `
          <div class="month-card">
            ${item.photo
              ? `<img src="${item.photo.image}" alt="Foto de progresso de ${item.label}" class="month-card-image" />`
              : `<div class="month-card-placeholder">Sem foto</div>`}
            <div class="month-card-body">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
                <div>
                  <div class="settings-title">${item.label}</div>
                  <div class="settings-copy">${item.photoCount || 0} foto${item.photoCount === 1 ? '' : 's'} · ${item.activeDays} dias ativos</div>
                </div>
                ${item.photo ? `<button class="icon-btn" onclick="deleteProgressPhoto('${item.photo.id}')" aria-label="Remover foto do mês"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>` : ''}
              </div>
              <div class="month-stats">
                <div><strong>${item.tasksDone}</strong><span>Tarefas</span></div>
                <div><strong>${item.workoutDays}</strong><span>Treinos</span></div>
                <div><strong style="color:${deltaTone}">${deltaLabel}</strong><span>Peso</span></div>
              </div>
              ${item.photo?.note ? `<div class="progress-photo-note">${escapeHtml(item.photo.note)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}</div>`;
    }

    async function generateFitnessPlan() {
      if (!fitnessProfile) {
        showToast('Configure seu perfil primeiro!', 'Clique em Meu Perfil', 'warn');
        openFitnessProfile();
        return;
      }

      const apiKey = localStorage.getItem('mr_gemini_key');
      if (!apiKey) {
        showToast('Configure a chave do Gemini', 'Clique em ⚙️ na aba IA', 'warn');
        return;
      }

      const btn = document.querySelector('#page-fitness .btn-primary');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" style="width:14px;height:14px;margin-right:4px;animation:spin 1s linear infinite"></i>Gerando...'; lucide.createIcons(); }

      const goalLabels = { lose_fat:'perda de gordura', gain_muscle:'ganho muscular', maintain:'manutenção', endurance:'resistência', general:'saúde geral' };
      const equipLabels = { none:'sem equipamento (calistenia)', dumbbells:'halteres em casa', gym:'academia completa', resistance_bands:'elásticos/bandas' };
      const levelLabels = { beginner:'iniciante', intermediate:'intermediário', advanced:'avançado' };

      const bmi = (fitnessProfile.weight / ((fitnessProfile.height/100) ** 2)).toFixed(1);

      const prompt = `Crie um plano de treino personalizado para:
- Idade: ${fitnessProfile.age} anos | Sexo: ${fitnessProfile.sex === 'male' ? 'Masculino' : 'Feminino'}
- Altura: ${fitnessProfile.height}cm | Peso: ${fitnessProfile.weight}kg | IMC: ${bmi}
- Objetivo: ${goalLabels[fitnessProfile.goal]}
- Nível: ${levelLabels[fitnessProfile.level]}
- Dias de treino escolhidos: ${Array.isArray(fitnessProfile.days) ? fitnessProfile.days.join(', ') : fitnessProfile.days + ' dias/semana'}
- Equipamento: ${equipLabels[fitnessProfile.equipment]}
${fitnessProfile.notes ? `- Restrições: ${fitnessProfile.notes}` : ''}

Retorne JSON puro sem crases:
{
  "weeklyPlan": [
    {"day": "Segunda", "focus": "Peito e Tríceps", "rest": false, "exercises": [
      {
        "name": "Supino Reto",
        "sets": 3,
        "reps": "12",
        "rest": "60s",
        "tip": "dica curta de execução",
        "muscles": ["Peitoral", "Tríceps", "Ombro anterior"],
        "howTo": ["Passo 1 detalhado", "Passo 2 detalhado", "Passo 3 detalhado"],
        "mistakes": ["Erro comum 1", "Erro comum 2"],
        "variation": "Variação mais fácil ou mais difícil"
      }
    ]},
    {"day": "Terça", "focus": "Descanso", "rest": true, "exercises": []}
  ],
  "todayWorkout": {"focus": "nome do foco", "exercises": []},
  "generalTips": ["dica 1", "dica 2", "dica 3"]
}
Crie exatamente 7 dias (Seg a Dom). Adapte ao nível e objetivo. Preencha howTo com 3-5 passos claros para cada exercício.`;

      try {
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
          { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );
        if (!response.ok) throw new Error('Erro na API');
        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        fitnessPlan = JSON.parse(raw.replace(/```json|```/g,'').trim());
        fitnessPlan.generatedAt = new Date().toISOString();
        save(STORAGE_KEYS.fitnessPlan, fitnessPlan);

        grantXp(40, 'Plano de treino gerado!');
        unlockBadge('first_plan', '📝 Primeiro Plano', 'Gerou seu primeiro plano de treino', '📝');
        showToast('Plano gerado! 🎉', 'Seu treino personalizado está pronto.', 'success');
        renderFitnessPage();
      } catch(e) {
        showToast('Erro ao gerar plano', e.message, 'warn');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="sparkles" style="width:14px;height:14px;margin-right:4px"></i>Gerar com IA'; lucide.createIcons(); }
      }
    }

    function completeExercise(exName, xpAmount) {
      const today = todayKey();
      if (!fitnessLogs[today]) fitnessLogs[today] = [];
      if (fitnessLogs[today].includes(exName)) return;
      fitnessLogs[today].push(exName);
      save(STORAGE_KEYS.fitnessLogs, fitnessLogs);

      // Update streak
      const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
      if (fitnessGameState.lastTrainingDate === yesterday || fitnessGameState.lastTrainingDate === today) {
        if (fitnessGameState.lastTrainingDate !== today) fitnessGameState.streak = (fitnessGameState.streak || 0) + 1;
      } else {
        fitnessGameState.streak = 1;
      }
      fitnessGameState.lastTrainingDate = today;
      save(STORAGE_KEYS.fitnessGameState, fitnessGameState);

      // Streak badges
      if (fitnessGameState.streak >= 7)  unlockBadge('streak_7',  '🔥 Semana Inteira',   '7 dias consecutivos de treino', '🔥');
      if (fitnessGameState.streak >= 30) unlockBadge('streak_30', '⚡ Mês Implacável',   '30 dias consecutivos de treino', '⚡');

      // Count total exercises done
      const totalDone = Object.values(fitnessLogs).flat().length;
      if (totalDone >= 10)  unlockBadge('ex_10',  '💦 10 Exercícios',    'Completou 10 exercícios', '💦');
      if (totalDone >= 50)  unlockBadge('ex_50',  '🏅 50 Exercícios',    'Completou 50 exercícios', '🏅');
      if (totalDone >= 100) unlockBadge('ex_100', '🥇 100 Exercícios',   'Completou 100 exercícios', '🥇');

      // Grant unified XP
      grantXp(xpAmount + 15, `Exercício concluído: ${exName}`);
      persistDaySnapshot(today);
      checkMissionRewards();
      evaluateAchievements();

      // Show celebration modal
      document.getElementById('exdone-title').textContent = `${exName} ✓`;
      document.getElementById('exdone-body').textContent  = 'Ótimo trabalho! Continue assim.';
      document.getElementById('exdone-xp').textContent    = `+${xpAmount + 15} XP Global`;
      const emojis = ['💪','🔥','⚡','🏋️','🎯','🚀'];
      document.getElementById('exdone-emoji').textContent = emojis[Math.floor(Math.random()*emojis.length)];
      openModal('modal-exercise-done');
      refreshUI();
    }

    let fitnessWeightChartInst = null;
    function renderFitnessPage() {
      if (!document.getElementById('page-fitness')?.classList.contains('active')) return;
      const gamificationOn = isGamificationEnabled();
      const fitnessBanner = document.getElementById('fitness-game-banner');
      const fitnessBadgesCard = document.getElementById('fitness-badges-card');
      if (fitnessBanner) fitnessBanner.hidden = !gamificationOn;
      if (fitnessBadgesCard) fitnessBadgesCard.hidden = !gamificationOn;

      if (gamificationOn) {
        const prog = getLevelProgress();
        document.getElementById('fitness-avatar').textContent     = '🏆';
        document.getElementById('fitness-rank-title').textContent = prog.title;
        document.getElementById('fitness-xp-label').textContent   = `${gameState.xp || 0} XP Coletivo`;
        document.getElementById('fitness-level-label').textContent = `Nível ${prog.level}`;
        document.getElementById('fitness-xp-next').textContent    = `${prog.current}/${prog.next} XP`;
        document.getElementById('fitness-xp-bar').style.width     = prog.pct + '%';
        document.getElementById('fitness-streak-label').textContent = `🔥 ${fitnessGameState.streak || 0} dias de treino consecutivos`;
      }

      // Profile display
      const profileDiv = document.getElementById('fitness-profile-display');
      if (fitnessProfile) {
        const bmi = (fitnessProfile.weight / ((fitnessProfile.height/100)**2)).toFixed(1);
        const bmiLabel = bmi < 18.5 ? 'Abaixo do peso' : bmi < 25 ? 'Normal ✅' : bmi < 30 ? 'Sobrepeso' : 'Obesidade';
        const goalEmoji = { lose_fat:'🔥', gain_muscle:'💪', maintain:'⚖️', endurance:'🏃', general:'❤️' };
        profileDiv.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${fitnessProfile.age}</div><div class="stat-label">Idade</div></div>
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${fitnessProfile.height}cm</div><div class="stat-label">Altura</div></div>
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${fitnessProfile.weight}kg</div><div class="stat-label">Peso</div></div>
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${bmi}</div><div class="stat-label">IMC · ${bmiLabel}</div></div>
          </div>
          <div style="margin-top:12px;font-size:13px;color:var(--muted)">
            ${goalEmoji[fitnessProfile.goal]} Objetivo: <b style="color:var(--text)">${{lose_fat:'Perder gordura',gain_muscle:'Ganhar músculo',maintain:'Manter forma',endurance:'Resistência',general:'Saúde geral'}[fitnessProfile.goal]}</b>
            &nbsp;·&nbsp; ${Array.isArray(fitnessProfile.days) ? fitnessProfile.days.join(', ') : fitnessProfile.days + '×/sem'}
          </div>`;
      } else if (profileDiv) {
        profileDiv.innerHTML = '<p class="text-sm text-muted">Nenhum perfil configurado ainda.<br>Clique em <b>Meu Perfil</b> para começar.</p>';
      }

      renderProgressPhotoPanel();

      // Weight chart
      const weightWrap = document.getElementById('fitness-weight-chart-wrap');
      if (weightWrap) {
        if (fitnessWeightChartInst) {
          fitnessWeightChartInst.destroy();
          fitnessWeightChartInst = null;
        }
        if (fitnessWeightLog.length >= 2) {
          weightWrap.innerHTML = '<canvas id="fitness-weight-chart"></canvas>';
          const wctx = document.getElementById('fitness-weight-chart')?.getContext('2d');
          if (wctx) {
            fitnessWeightChartInst = new Chart(wctx, {
              type: 'line',
              data: {
                labels: fitnessWeightLog.map(e => e.date.slice(5)),
                datasets: [{ data: fitnessWeightLog.map(e => e.weight), borderColor: '#7c6df7', backgroundColor: 'rgba(124,109,247,0.1)', tension: 0.4, pointRadius: 4, fill: true }]
              },
              options: { plugins:{ legend:{ display:false } }, scales: { x:{ticks:{color:'#6b6b88',font:{size:10}}}, y:{ticks:{color:'#6b6b88',font:{size:10}}} }, responsive:true, maintainAspectRatio:false }
            });
          }
        } else {
          weightWrap.innerHTML = '<p class="text-sm text-muted" style="padding:20px 0">Registre ao menos 2 pesos para ver o gráfico.</p>';
        }
      }

      // Today's workout
      const todayDiv = document.getElementById('fitness-today-plan');
      const today = todayKey();
      const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      const todayDayName = dayNames[new Date().getDay()];

      if (fitnessPlan) {
        const todayPlan = fitnessPlan.weeklyPlan?.find(d => d.day.startsWith(todayDayName.slice(0,3))) || fitnessPlan.todayWorkout;
        const doneToday = fitnessLogs[today] || [];

        if (!todayPlan || todayPlan.rest) {
          todayDiv.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">
            <div style="font-size:40px;margin-bottom:8px">😴</div>
            <div style="font-weight:600">Dia de Descanso</div>
            <div style="font-size:12px;margin-top:4px">Recuperação é parte do treino!</div>
          </div>`;
        } else {
          const todayDayIdx = fitnessPlan.weeklyPlan ? fitnessPlan.weeklyPlan.indexOf(todayPlan) : -1;
          const exList = (todayPlan.exercises || []).map((ex, exIdx) => {
            const done = doneToday.includes(ex.name);
            return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;background:${done?'rgba(92,230,184,0.08)':'var(--surface2)'};border:1px solid ${done?'rgba(92,230,184,0.2)':'var(--border)'};margin-bottom:8px;transition:all 0.2s">
              <button onclick="${done ? '' : `completeExercise('${ex.name.replace(/'/g,"\\'")}', 25)`}" style="width:28px;height:28px;border-radius:50%;border:2px solid ${done?'var(--accent2)':'var(--border)'};background:${done?'var(--accent2)':'transparent'};cursor:${done?'default':'pointer'};flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;transition:all 0.2s">
                ${done ? '✓' : ''}
              </button>
              <div style="flex:1;cursor:pointer" onclick="openExerciseDetail(${todayDayIdx}, ${exIdx})">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <div style="font-weight:600;font-size:14px;${done?'text-decoration:line-through;opacity:0.5':''}">${ex.name}</div>
                  <span style="font-size:10px;color:var(--muted);white-space:nowrap;display:flex;align-items:center;gap:3px"><i data-lucide="info" style="width:12px;height:12px"></i> detalhes</span>
                </div>
                <div style="font-size:12px;color:var(--muted);margin-top:2px">${ex.sets} séries × ${ex.reps} reps · descanso ${ex.rest}</div>
                ${ex.muscles?.length ? `<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">${ex.muscles.slice(0,3).map(m=>`<span style="font-size:10px;background:rgba(124,109,247,0.1);color:var(--accent);border-radius:10px;padding:2px 7px">${m}</span>`).join('')}</div>` : ''}
              </div>
            </div>`;
          }).join('');
          todayDiv.innerHTML = `<div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:10px">📌 ${todayPlan.focus || 'Treino de Hoje'}</div>${exList}`;
        }
      }

      // Weekly plan
      const weekDiv = document.getElementById('fitness-weekly-plan');
      const planTag = document.getElementById('fitness-plan-tag');
      if (fitnessPlan?.weeklyPlan) {
        planTag.style.display = 'inline-block';
        weekDiv.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">` +
          fitnessPlan.weeklyPlan.map(d => `
            <div style="background:${d.rest?'var(--surface2)':'rgba(124,109,247,0.08)'};border:1px solid ${d.rest?'var(--border)':'rgba(124,109,247,0.2)'};border-radius:12px;padding:12px;text-align:center">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${d.day}</div>
              <div style="font-size:13px;font-weight:700;color:${d.rest?'var(--muted)':'var(--text)'}">${d.rest ? '😴 Descanso' : d.focus}</div>
              ${!d.rest ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">${d.exercises?.length || 0} exercícios</div>` : ''}
            </div>`).join('') + '</div>';

        if (fitnessPlan.generalTips?.length) {
          weekDiv.innerHTML += `<div style="margin-top:16px;padding:12px;background:rgba(92,230,184,0.08);border:1px solid rgba(92,230,184,0.2);border-radius:10px">
            <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">💡 Dicas do seu plano</div>
            ${fitnessPlan.generalTips.map(t => `<div style="font-size:12px;color:var(--muted);margin-bottom:4px">• ${t}</div>`).join('')}
          </div>`;
        }
      }

      // Badges
      const badgesDiv = document.getElementById('fitness-badges');
      if (gamificationOn && (fitnessGameState.badges || []).length > 0) {
        badgesDiv.innerHTML = fitnessGameState.badges.map(b => `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">${b.icon}</span>
            <div><div style="font-size:13px;font-weight:600">${b.title}</div><div style="font-size:11px;color:var(--muted)">${b.desc}</div></div>
          </div>`).join('');
      } else if (gamificationOn && badgesDiv) {
        badgesDiv.innerHTML = '<p class="text-sm text-muted">Complete treinos para desbloquear conquistas.</p>';
      } else if (badgesDiv) {
        badgesDiv.innerHTML = '<p class="text-sm text-muted">Ative a gamificação nas configurações para acompanhar conquistas fitness.</p>';
      }

      lucide.createIcons();
    }

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
      updateGamificationVisibility();
      syncNotificationPermission();
      seedTaskDateTimeInputs();
      syncTaskFormState();
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
      renderSettingsPage();
      renderAIChatHistory();
      lucide.createIcons();
      renderFitnessPage();
      setTimeout(checkPendingExercises, 1500);
      window.addEventListener('resize', () => {
        if (!isMobileLayout()) closeSidebar();
      });
      window.addEventListener('focus', () => {
        checkNewDay();
        checkNotificationEngine();
        refreshUI();
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
  

