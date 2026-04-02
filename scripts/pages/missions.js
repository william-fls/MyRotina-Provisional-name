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
      { id: 'gemini_student', title: 'Aluno da IA', description: 'Complete 50 tarefas criadas pela IA.', icon: 'AI', category: 'epic', rarity: 'epic', target: 50, getValue: stats => stats.aiTasksCompleted },
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
            btnHtml = `<span class="badge badge-low" style="background:rgba(var(--success-rgb),0.1);color:var(--success)"><i data-lucide="check" style="width:12px;height:12px;display:inline-block"></i> Concluída</span>`;
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
      const notificationEnv = getNotificationEnvironment();
      const notifyEnabled = notificationEnv.enabled;
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
        const supportText = `${getNotificationSupportText(notificationEnv)} ${getMobileNotificationHint(notificationEnv)}`;
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


