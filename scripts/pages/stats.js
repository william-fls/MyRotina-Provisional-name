let chartTasks = null, chartHabits = null;

    function renderStats() {
      const today = todayKey();
      const todayTasks = getTodayTasks();
      const doneTodayTasks = todayTasks.filter(t => t.done).length;
      const dailyTasks = tasks.filter(t => t.repeatDaily);
      const totalHabits = dailyTasks.length;
      const doneHabitsToday = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;

      const summary = document.getElementById('stats-summary');
      const totalTodayDone = doneTodayTasks + doneHabitsToday;
      const todayProgressPct = Math.round((totalTodayDone / Math.max(todayTasks.length + totalHabits, 1)) * 100);

      const totalCompletedTasks = Object.values(taskStats).reduce((sum, day) => sum + (day.done || 0), 0);
      const allDays = Object.keys(taskStats).length || 1;
      const completionAvg = Math.round((totalCompletedTasks / (allDays * Math.max(tasks.filter(t => !t.repeatDaily).length, 1))) * 100);
      const workoutDaysTotal = Object.keys(fitnessLogs || {}).filter(key => Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0).length;
      const activeDays = Object.keys(taskStats || {}).filter(key => Number(taskStats[key]?.done || 0) > 0).length;
      const timeblockDays = Object.keys(timeblockHistory || {}).length;

      setEl('stats-ov-tasks-done', `${doneTodayTasks}/${todayTasks.length}`);
      setEl('stats-ov-daily-done', `${doneHabitsToday}/${totalHabits}`);
      setEl('stats-ov-progress', `${todayProgressPct}%`);
      setStyle('stats-ov-progress-bar', 'width', `${todayProgressPct}%`);
      setEl('stats-dash-stat-tasks', `${totalTodayDone}`);

      if (summary) {
        const cards = [
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

      const themeStyles = getComputedStyle(document.documentElement);
      const accent = themeStyles.getPropertyValue('--accent').trim() || '#7c6df7';
      const accent2 = themeStyles.getPropertyValue('--accent2').trim() || '#5ce6b8';
      const accentRgb = themeStyles.getPropertyValue('--accent-rgb').trim() || '124, 109, 247';
      const accent2Rgb = themeStyles.getPropertyValue('--accent2-rgb').trim() || '92, 230, 184';
      const muted = themeStyles.getPropertyValue('--muted').trim() || '#6b6b88';
      const textColor = themeStyles.getPropertyValue('--text').trim() || '#e8e8f0';
      const chartGrid = themeStyles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.04)';

      const chartDefaults = {
        scales: {
          x: { grid: { color: chartGrid }, ticks: { color: muted } },
          y: { grid: { color: chartGrid }, ticks: { color: muted }, min: 0, max: 100 }
        },
        plugins: { legend: { labels: { color: textColor } } },
        responsive: true, maintainAspectRatio: true,
      };

      if (chartTasks) chartTasks.destroy();
      chartTasks = new Chart(document.getElementById('chart-tasks'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: '% Concluído', data: taskData, backgroundColor: `rgba(${accentRgb},0.55)`, borderColor: accent, borderWidth: 2, borderRadius: 6 }]
        },
        options: chartDefaults
      });

      if (chartHabits) chartHabits.destroy();
      chartHabits = new Chart(document.getElementById('chart-habits'), {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: '% Hábitos Feitos', data: habitData, borderColor: accent2, backgroundColor: `rgba(${accent2Rgb},0.14)`, tension: 0.4, fill: true, pointBackgroundColor: accent2 }]
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
    // EXPORT
    // =============================================


