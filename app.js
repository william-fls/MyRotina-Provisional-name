
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
    let dailyReset = load(STORAGE_KEYS.dailyReset, { lastDate: '', totalResets: 0 });
    let notificationSettings = load(STORAGE_KEYS.notificationSettings, { enabled: false, permission: 'default', reminderMinutes: 15, dailyBriefing: true, eveningNudge: true });
    let notificationLog = load(STORAGE_KEYS.notificationLog, {});
    let gameState = load(STORAGE_KEYS.gameState, { xp: 0, totalXpEarned: 0, badges: [], dayStreak: 0, lastPerfectDay: '', missionsClaimed: {} });
    let rewardLedger = load(STORAGE_KEYS.rewardLedger, { tasks: {}, habits: {} });
    let taskExerciseLog = load(STORAGE_KEYS.taskExerciseLog, load(STORAGE_KEYS.taskPenaltyLog, {}));
    let exerciseChallenges = load(STORAGE_KEYS.exerciseChallenges, []);
    let fitnessProfile = load(STORAGE_KEYS.fitnessProfile, null);
    let fitnessPlan = load(STORAGE_KEYS.fitnessPlan, null);
    let fitnessLogs = load(STORAGE_KEYS.fitnessLogs, {});
    let fitnessWeightLog = load(STORAGE_KEYS.fitnessWeightLog, []);
    let fitnessGameState = load(STORAGE_KEYS.fitnessGameState, { xp: 0, streak: 0, lastTrainingDate: '', badges: [] });
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
    const DEMO_HABIT_NAMES = [
      'Beber 2L de água',
      'Exercitar-se',
      'Ler',
      'Meditar',
      'Sono às 23h',
    ];
    const DEFAULT_NOTIFICATION_SETTINGS = { enabled: false, permission: 'default', reminderMinutes: 15, dailyBriefing: true, eveningNudge: true };
    const DEFAULT_GAME_STATE = { xp: 0, totalXpEarned: 0, badges: [], dayStreak: 0, lastPerfectDay: '', missionsClaimed: {} };
    const DEFAULT_REWARD_LEDGER = { tasks: {}, habits: {} };
    const EXERCISE_LIBRARY = {
      daily: {
        high: { title: 'Circuito rapido', detail: '20 agachamentos + 20 polichinelos.', duration: '4 min' },
        med: { title: 'Ativacao curta', detail: '15 agachamentos + 30 segundos de prancha.', duration: '3 min' },
        low: { title: 'Movimento leve', detail: '5 minutos de caminhada ou alongamento ativo.', duration: '5 min' },
      },
      once: {
        high: { title: 'Recuperacao intensa', detail: '3 rodadas de 15 agachamentos e 20 polichinelos.', duration: '8 min' },
        med: { title: 'Cardio de retomada', detail: '6 minutos de caminhada acelerada ou 40 polichinelos.', duration: '6 min' },
        low: { title: 'Reinicio corporal', detail: '10 minutos de caminhada leve ou mobilidade completa.', duration: '10 min' },
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
      dailyReset = dailyReset && typeof dailyReset === 'object' ? { lastDate: dailyReset.lastDate || '', totalResets: dailyReset.totalResets || 0 } : { lastDate: '', totalResets: 0 };
      notificationSettings = notificationSettings && typeof notificationSettings === 'object'
        ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...notificationSettings }
        : { ...DEFAULT_NOTIFICATION_SETTINGS };
      notificationLog = notificationLog && typeof notificationLog === 'object' ? notificationLog : {};
      gameState = gameState && typeof gameState === 'object'
        ? { ...DEFAULT_GAME_STATE, ...gameState }
        : { ...DEFAULT_GAME_STATE };
      taskExerciseLog = taskExerciseLog && typeof taskExerciseLog === 'object' ? taskExerciseLog : {};
      exerciseChallenges = Array.isArray(exerciseChallenges) ? exerciseChallenges : [];
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
      if (!gameState.missionsClaimed || typeof gameState.missionsClaimed !== 'object') gameState.missionsClaimed = {};
      tasks = tasks.map(task => ({
        ...task,
        repeatDaily: Boolean(task.repeatDaily),
        hasExercise: Boolean(task.hasExercise ?? task.hasPenalty),
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
          planName: challenge.planName || challenge.title || 'Movimento rapido',
          detail: challenge.detail || '',
          duration: challenge.duration || '',
          cadenceLabel: challenge.cadenceLabel || 'Pontual',
        }));

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
      save(STORAGE_KEYS.notificationLog, notificationLog);
      save(STORAGE_KEYS.gameState, gameState);
      save(STORAGE_KEYS.rewardLedger, rewardLedger);
      save(STORAGE_KEYS.taskExerciseLog, taskExerciseLog);
      save(STORAGE_KEYS.exerciseChallenges, exerciseChallenges);
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

    const LEVEL_THRESHOLDS = [0, 300, 800, 2000, 3500, 5000, 7000, 9500, 12500, 16000, 20000];

    function getLevelFromXp(xp = 0) {
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
      }
      return Math.floor((xp - 20000) / 4000) + 12;
    }

    function getLevelTitle(level) {
      if (level >= 4) return 'Lenda da Rotina';
      if (level >= 3) return 'Guerreiro da Rotina';
      if (level >= 2) return 'Disciplinado';
      return 'Aprendiz';
    }

    function getLevelProgress() {
      const xp = gameState.xp || 0;
      const level = getLevelFromXp(xp);
      const currentLevelStart = LEVEL_THRESHOLDS[level - 1] || ((level - 11) * 500 + 3250);
      const nextLevelStart = LEVEL_THRESHOLDS[level] || ((level - 10) * 500 + 3250);
      
      const current = xp - currentLevelStart;
      const next = nextLevelStart - currentLevelStart;
      
      return {
        level,
        current,
        next,
        pct: Math.round((current / next) * 100) || 0,
        remaining: next - current,
        title: getLevelTitle(level),
      };
    }

    function grantXp(amount, reason = '', tone = 'success') {
      if (!amount) return;
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

    function hasBadge(id) {
      return (gameState.badges || []).some(badge => badge.id === id);
    }

    function unlockBadge(id, title, description, icon = '🏆') {
      if (hasBadge(id)) return false;
      gameState.badges.unshift({
        id,
        title,
        description,
        icon,
        unlockedAt: new Date().toISOString(),
      });
      saveGameState();
      showToast(`${icon} Conquista desbloqueada`, title, 'success');
      sendBrowserNotification(`badge-${id}`, 'Nova conquista', `${icon} ${title}`);
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

    function getDailyMissions() {
      const today = todayKey();
      const doneTasks = taskStats[today]?.done || 0;
      const doneDailies = (dailyTaskLogs[today] || []).length;
      
      const dailyTasksCount = tasks.filter(t => t.repeatDaily).length;
      
      return [
        { id: 'mission-dailies', label: 'Hábito Diário', progress: Math.min(doneDailies, dailyTasksCount), total: dailyTasksCount || 1, reward: 25 },
        { id: 'mission-tasks', label: 'Missão do Dia', progress: Math.min(doneTasks, 3), total: 3, reward: 25 },
      ];
    }

    function checkMissionRewards() {
      const today = todayKey();
      if (!Array.isArray(gameState.missionsClaimed[today])) gameState.missionsClaimed[today] = [];
      getDailyMissions().forEach(mission => {
        if (mission.progress < mission.total) return;
        if (gameState.missionsClaimed[today].includes(mission.id)) return;
        gameState.missionsClaimed[today].push(mission.id);
        saveGameState();
        grantXp(mission.reward, `Missão concluída: ${mission.label}`);
      });
    }

    function evaluateAchievements() {
      const today = todayKey();
      const totalCompletedTasks = Object.values(taskStats).reduce((sum, day) => sum + (day.done || 0), 0);
      const doneTodayTasks = taskStats[today]?.done || 0;
      const doneTodayHabits = (dailyTaskLogs[today] || []).length;
      const todayTasks = getTodayTasks();
      const allTasksDone = todayTasks.length > 0 && todayTasks.every(task => task.done);
      const dailyTasks = tasks.filter(t => t.repeatDaily);
      const allHabitsDone = dailyTasks.length > 0 && dailyTasks.every(t => (dailyTaskLogs[today] || []).includes(t.id));
      const level = getLevelFromXp(gameState.xp || 0);

      if (totalCompletedTasks >= 1) unlockBadge('first-task', 'Primeiro check', 'Concluiu sua primeira tarefa.', '✅');
      if (doneTodayTasks >= 3) unlockBadge('task-trio-badge', 'Combo de foco', 'Fez 3 tarefas no mesmo dia.', '⚡');
      if (doneTodayHabits >= 3) unlockBadge('habit-trio-badge', 'Ritual em alta', 'Registrou 3 hábitos hoje.', '🌿');
      if ((gameState.dayStreak || 0) >= 3) unlockBadge('streak-3', 'Fogo aceso', 'Manteve atividade por 3 dias seguidos.', '🔥');
      if (level >= 5) unlockBadge('level-5', 'Patente nova', 'Chegou ao nível 5.', '🚀');

      if (allTasksDone && allHabitsDone && gameState.lastPerfectDay !== today) {
        gameState.lastPerfectDay = today;
        saveGameState();
        grantXp(40, 'Dia perfeito: tudo concluído');
        unlockBadge('perfect-day', 'Dia lendário', 'Você zerou tarefas e hábitos do dia.', '🏆');
      }
    }

    function renderGamePanel() {
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
        const claimed = gameState.missionsClaimed[todayKey()] || [];
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
      renderDashboard();
      renderTasks();
      renderExerciseChallenges();
      renderHeatmap();
      renderTimeBlocks();
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
        <strong>Faça 30 segundos de polichinelos AGORA</strong> para salvar sua sequência (streak) do dia e ganhar +5 XP.
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
      // Force setting today as active to avoid streak penalty tomorrow
      const today = todayKey();
      if (!taskStats[today]) taskStats[today] = { total: 0, done: 0 };
      taskStats[today].done += 1;
      save(STORAGE_KEYS.taskStats, taskStats);
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
      
      tasks.forEach(task => {
        if (autoCycle) {
          if (task.repeatDaily) {
            createTaskExerciseChallenge(task, lastCycleDate);
            task.done = false;
            if (task.datetime) task.datetime = getTaskEffectiveDateTime(task, today);
          } else if (isTaskForDate(task, lastCycleDate)) {
            createTaskExerciseChallenge(task, lastCycleDate);
          }
        } else if (manual) {
          if (isTaskForDate(task, today)) task.done = false;
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
      if (page === 'habits') renderHeatmap();
      if (page === 'stats') renderStats();
      if (page === 'fitness') renderFitnessPage();
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
      closeModal('modal-name');
    }

    // =============================================
    // TIPS
    // =============================================
    const TIPS = [
      'Comece pelo mais difícil enquanto sua energia está alta.',
      'Uma tarefa de cada vez. Foco também é produtividade.',
      'Hábitos consistentes vencem motivação passageira.',
      'Se não der para fazer perfeito, faça possível.',
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
        const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
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
      } else {
        t.completedAt = '';
      }
      save(STORAGE_KEYS.tasks, tasks);
      if (!wasDone && t.done && !rewardLedger.tasks[today].includes(id)) {
        rewardLedger.tasks[today].push(id);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        grantXp(getTaskXp(t), `Tarefa concluída: ${truncateText(t.text, 40)}`);
      }
      if (wasDone && !t.done && hadReward) {
        rewardLedger.tasks[today] = rewardLedger.tasks[today].filter(taskId => taskId !== id);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        grantXp(-getTaskXp(t));
      }
      updateTodayTaskStats();
      recalcActivityStreak();
      checkMissionRewards();
      evaluateAchievements();
      refreshUI();
      checkNotificationEngine();
    }

    function deleteTask(id) {
      showConfirm('Excluir tarefa?', 'Esta ação não pode ser desfeita.', () => {
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
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b'];
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
      });
      const dailyTasks = tasks.filter(t => t.repeatDaily);
      if (dailyTasks.length === 0) { hm.innerHTML = '<p class="text-muted text-sm">Adicione tarefas diÃ¡rias para ver o progresso contÃ­nuo.</p>'; return; }
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
        morning: { slot: '06h-12h', label: 'Manha', time: '06:00 - 12:00', color: 'var(--warn)' },
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
      if (suggestedRoutineTitle) suggestedRoutineTitle.textContent = 'Sugestao de rotina';

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
        <div>🌅 <strong>07:00</strong> Acordar & café da manhã</div>
        <div>📧 <strong>08:00</strong> E-mails e tarefas urgentes</div>
        <div>💻 <strong>10:00</strong> Foco profundo (trabalho remoto)</div>
        <div>☀️ <strong>12:30</strong> Almoço e pausa</div>
        <div>💻 <strong>14:00</strong> Continuação do trabalho</div>
        <div>🏃 <strong>17:00</strong> Exercício físico</div>
        <div>📖 <strong>19:00</strong> Leitura ou estudo</div>
        <div>🧘 <strong>21:00</strong> Meditação & encerramento</div>
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
      draggedTaskId = null;
      checkMissionRewards();
      refreshUI();
    }
    function removeFromBlock(taskId, block) {
      timeblocks[block] = timeblocks[block].filter(id => id !== taskId);
      save(STORAGE_KEYS.timeblocks, timeblocks);
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

      const totalCompletedTasks = Object.values(taskStats).reduce((sum, day) => sum + (day.done || 0), 0);
      const allDays = Object.keys(taskStats).length || 1;
      const completionAvg = Math.round((totalCompletedTasks / (allDays * Math.max(tasks.filter(t => !t.repeatDaily).length, 1))) * 100);

      if (summary) {
        summary.innerHTML = [
          { n: `${doneTodayTasks}/${todayTasks.length}`, l: 'Tarefas Hoje' },
          { n: `${doneHabitsToday}/${totalHabits}`, l: 'Hábitos Hoje' },
          { n: `${gameState.dayStreak || 0}d`, l: 'Sequência (Streak)' },
          { n: `Lv ${level}`, l: 'Nível Atual' },
          { n: `${totalCompletedTasks}`, l: 'Total Concluídas' },
          { n: `${(gameState.badges || []).length}`, l: 'Conquistas' },
        ].map(s => `<div class="stat-box" style="padding:16px"><div class="stat-number">${s.n}</div><div class="stat-label">${s.l}</div></div>`).join('');
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
        rewardLedger,
        taskExerciseLog,
        exerciseChallenges,
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

    // ── AI: histórico de conversa multi-turn ──────────────────────
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

    // ── Executa ações retornadas pela IA ──────────────────────────
    function executeAIActions(actions) {
      if (!actions || !Array.isArray(actions)) return [];
      const log = [];
      const today = todayKey();

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
              done: false,
              created: new Date().toISOString()
            };
            tasks.unshift(t);
            log.push(`➕ Criada: <b>${action.text}</b>`);
            break;
          }

          case 'delete': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
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
                log.push(`✏️ Editada: <b>${old}</b> → <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'clear_done': {
            const before = tasks.length;
            tasks = tasks.filter(t => !t.done);
            const removed = before - tasks.length;
            if (removed > 0) log.push(`🧹 ${removed} tarefa(s) concluída(s) removida(s)`);
            break;
          }
        }
      });

      if (log.length > 0) {
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        updateTodayTaskStats();
        recalcActivityStreak();
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

      // histórico multi-turn (últimas 10 trocas)
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
        btn.textContent = 'Ações Aplicadas ✅';
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
        showConfirm('Cérebros Conectados! 🧠', 'Sua chave foi salva localmente. A IA agora tem acesso total à sua rotina!', () => {});
      } else {
        localStorage.removeItem('mr_gemini_key');
        closeModal('modal-ai-settings');
      }
    }


    // ── Exercise Detail Modal ─────────────────────────────────────
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
        { icon: '⏱️', label: `${ex.rest} descanso` },
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
            <span style="color:var(--danger);flex-shrink:0;font-size:16px;line-height:1.2">✗</span>${m}
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
        btn.innerHTML = '✓ Marcar como Feito · <b>+25 XP</b>';
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

    // ── Day picker helpers ────────────────────────────────────────
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

    // ══════════════════════════════════════════════════════════════
    //  FITNESS MODULE
    // ══════════════════════════════════════════════════════════════



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
      closeModal('modal-weight-log');
      renderFitnessPage();
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
        unlockBadge('first_plan', '📅 Primeiro Plano', 'Gerou seu primeiro plano de treino', '📅');
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

      // Gamification banner
      const prog = getLevelProgress();
      document.getElementById('fitness-avatar').textContent     = '🏆';
      document.getElementById('fitness-rank-title').textContent = prog.title;
      document.getElementById('fitness-xp-label').textContent   = `${gameState.xp || 0} XP Coletivo`;
      document.getElementById('fitness-level-label').textContent = `Nível ${prog.level}`;
      document.getElementById('fitness-xp-next').textContent    = `${prog.current}/${prog.next} XP`;
      document.getElementById('fitness-xp-bar').style.width     = prog.pct + '%';
      document.getElementById('fitness-streak-label').textContent = `🔥 ${fitnessGameState.streak || 0} dias de treino consecutivos`;

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
      }

      // Weight chart
      const wctx = document.getElementById('fitness-weight-chart')?.getContext('2d');
      if (wctx && fitnessWeightLog.length >= 2) {
        if (fitnessWeightChartInst) fitnessWeightChartInst.destroy();
        fitnessWeightChartInst = new Chart(wctx, {
          type: 'line',
          data: {
            labels: fitnessWeightLog.map(e => e.date.slice(5)),
            datasets: [{ data: fitnessWeightLog.map(e => e.weight), borderColor: '#7c6df7', backgroundColor: 'rgba(124,109,247,0.1)', tension: 0.4, pointRadius: 4, fill: true }]
          },
          options: { plugins:{ legend:{ display:false } }, scales: { x:{ticks:{color:'#6b6b88',font:{size:10}}}, y:{ticks:{color:'#6b6b88',font:{size:10}}} }, responsive:true, maintainAspectRatio:false }
        });
      } else if (wctx) {
        const wrap = document.getElementById('fitness-weight-chart-wrap');
        if (wrap) wrap.innerHTML = '<p class="text-sm text-muted" style="padding:20px 0">Registre ao menos 2 pesos para ver o gráfico.</p>';
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
      if ((fitnessGameState.badges || []).length > 0) {
        badgesDiv.innerHTML = fitnessGameState.badges.map(b => `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">${b.icon}</span>
            <div><div style="font-size:13px;font-weight:600">${b.title}</div><div style="font-size:11px;color:var(--muted)">${b.desc}</div></div>
          </div>`).join('');
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
  
