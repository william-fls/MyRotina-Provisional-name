$path = "c:\Users\willi\OneDrive\Desktop\MyRotina-Provisional-name\Rotina.html"
$content = Get-Content -Raw -Path $path -Encoding UTF8

$content = $content -replace '(?s)(/\* =============================================\r?\n     )HABITS(\r?\n  ============================================= \*/.*?)(/\* =============================================\r?\n     )WEEKLY HEATMAP(\r?\n  ============================================= \*/)', '$3WEEKLY HEATMAP$4'

$content = $content -replace '(?s)<a class="nav-item"\s*data-page="habits".*?<span class="nav-label">Hábitos</span>\s*</a>', ''
$content = $content.Replace('Hábitos feitos', 'Diárias feitas')
$content = $content.Replace('id="ov-habits-done"', 'id="ov-daily-done"')
$content = $content.Replace('id="ov-habits-bar"', 'id="ov-daily-bar"')

$content = $content.Replace('Hábitos de Hoje', 'Tarefas Diárias')
$content = $content.Replace('onclick="navigate(''habits'')"', 'onclick="navigate(''tasks''); setTimeout(()=>filterTasks(''all'', document.querySelector(''.filter-tab'')), 50);"')
$content = $content.Replace('id="dash-habits-list"', 'id="dash-daily-list"')

$content = $content -replace '(?s)<!-- ==================== HABITS ==================== -->.*?<section class="page" id="page-habits">.*?</section>', ''

$newHeatmap = @'
    <div class="card mt-4 mb-4">
      <div class="section-title" style="margin-bottom:12px">Progresso Contínuo (Tarefas Diárias)</div>
      <div id="weekly-heatmap"></div>
    </div>
'@

$content = $content.Replace('<div class="planning-stack mt-4">', $newHeatmap + "`n    <div class=`"planning-stack mt-4`">")

$content = $content.Replace('Hábitos por Dia da Semana', 'Tarefas Diárias por Dia')

$content = $content.Replace("habits: 'mr_habits',", '')
$content = $content.Replace("habitLogs: 'mr_habitLogs',", "dailyTaskLogs: 'mr_dailyTaskLogs',")

$content = $content -replace '(?s)let habits = load\(STORAGE_KEYS\.habits, \[\]\);\s*let habitLogs = load\(STORAGE_KEYS\.habitLogs, \{\}\);', "let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});"

$migrationScript = @'
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
  } catch(e) {}
'@

$content = $content.Replace('tasks = Array.isArray(tasks) ? tasks : [];', $migrationScript + "`n  tasks = Array.isArray(tasks) ? tasks : [];")
$content = $content.Replace("habits = Array.isArray(habits) ? habits : [];", "")
$content = $content.Replace("habitLogs = habitLogs && typeof habitLogs === 'object' ? habitLogs : {};", "dailyTaskLogs = dailyTaskLogs && typeof dailyTaskLogs === 'object' ? dailyTaskLogs : {};")
$content = $content.Replace("rewardLedger.habits && typeof rewardLedger.habits === 'object' ? rewardLedger.habits : {}", "{}")

$content = $content.Replace("const onlyDemoHabits = habits.length > 0 && habits.every(habit => DEMO_HABIT_NAMES.includes(habit.name));", "")
$content = $content.Replace("const hasNoActivity = !Object.keys(habitLogs).length", "const hasNoActivity = !Object.keys(dailyTaskLogs).length")
$content = $content.Replace("if (hasNoActivity && (onlyDemoTasks || onlyDemoHabits)) {", "if (hasNoActivity && onlyDemoTasks) {")
$content = $content -replace '(?s)save\(STORAGE_KEYS\.habits, habits\);\s*save\(STORAGE_KEYS\.habitLogs, habitLogs\);', "save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);"
$content = $content -replace '(?s)habits = \[\];\s*habitLogs = \{\};', "dailyTaskLogs = {};"

$content = $content.Replace("const hasTodayActivity = (taskStats[today]?.done || 0) > 0 || (habitLogs[today] || []).length > 0;", "const hasTodayActivity = (taskStats[today]?.done || 0) > 0 || (dailyTaskLogs[today] || []).length > 0;")
$content = $content.Replace("const hadHabits = (habitLogs[key] || []).length > 0;", "const hadHabits = (dailyTaskLogs[key] || []).length > 0;")
$content = $content.Replace("const doneHabits = (habitLogs[today] || []).length;", "const doneHabits = (dailyTaskLogs[today] || []).length;")
$content = $content.Replace("Registrar 2 hábitos", "Completar 2 diárias")
$content = $content.Replace("const doneTodayHabits = (habitLogs[today] || []).length;", "const doneTodayHabits = (dailyTaskLogs[today] || []).length;")

$content = $content -replace '(?s)const allHabitsDone = habits\.length > 0 && habits\.every\(habit => \(habitLogs\[today\] \|\| \[\]\)\.includes\(habit\.id\)\);', "const dailyTasks = tasks.filter(t => t.repeatDaily);`n  const allHabitsDone = dailyTasks.length > 0 && dailyTasks.every(t => (dailyTaskLogs[today] || []).includes(t.id));"
$content = $content.Replace("Registrou 3 hábitos hoje.", "Completou 3 tarefas diárias hoje.")

$content = $content -replace '(?s)const doneHabits = habits\.filter.*?\.length;', "const dailyTasks = tasks.filter(t => t.repeatDaily);`n  const doneHabits = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;"
$content = $content.Replace('const totalH = habits.length;', 'const totalH = dailyTasks.length;')

$newDashList = @'
  const dhl = document.getElementById('dash-daily-list');
  if (dhl) {
    if (dailyTasks.length === 0) {
      dhl.innerHTML = `<div class="empty-state"><p>Nenhuma tarefa diária cadastrada.</p></div>`;
    } else {
      dhl.innerHTML = dailyTasks.slice(0, 5).map(t => {
        const done = (dailyTaskLogs[today] || []).includes(t.id);
        return `<div class="task-item ${done ? 'done-today' : ''}" style="margin-bottom:8px" onclick="toggleTask('${t.id}')">
          <div class="task-check ${done ? 'checked' : ''}" style="pointer-events:none">
            ${done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
          </div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">${t.text}</div>
              <span class="task-state-tag">Diária</span>
            </div>
            <div class="task-meta">${badgeHTML(t.priority)}</div>
          </div>
        </div>`;
      }).join('');
    }
  }
  renderGamePanel();
'@
$content = $content -replace '(?s)const dhl = document\.getElementById\(''dash-habits-list''\);.*?renderGamePanel\(\);', $newDashList

$newToggleTask = @'
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
  save(STORAGE_KEYS.tasks, tasks);
  if (!wasDone && t.done
'@
$content = $content -replace "(?s)function toggleTask\(id\) \{.*?if \(\!wasDone && t\.done", $newToggleTask

$content = $content.Replace('habitLogs[today] = [];', 'dailyTaskLogs[today] = [];')
$content = $content.Replace('renderHabits();', 'renderHeatmap();')

$content = $content.Replace("const totalHabits = habits.length;", "const dailyTasks = tasks.filter(t => t.repeatDaily);`n  const totalHabits = dailyTasks.length;")
$content = $content.Replace("const doneHabitsToday = habits.filter(h => (habitLogs[today] || []).includes(h.id)).length;", "const doneHabitsToday = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;")
$content = $content.Replace("const maxStreak = Math.max(0, ...habits.map(h => h.streak));", "const maxStreak = 0; // Streaks removed for simplicity")
$content = $content.Replace("const doneH = habits.filter(h => (habitLogs[key] || []).includes(h.id)).length;", "const doneH = dailyTasks.filter(t => (dailyTaskLogs[key] || []).includes(t.id)).length;")
$content = $content.Replace("const pctHabit = habits.length ? Math.round((doneH / habits.length) * 100) : 0;", "const pctHabit = dailyTasks.length ? Math.round((doneH / dailyTasks.length) * 100) : 0;")

$newRenderHeatmap = @'
function renderHeatmap() {
  const hm = document.getElementById('weekly-heatmap');
  if (!hm) return;
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const today = new Date();
  const dates = Array.from({length:7}, (_,i) => {
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
'@
$content = $content -replace "(?s)function renderHeatmap\(\).*?\n\}", $newRenderHeatmap

$content = $content -replace '(?s)function addHabit\(\).*?refreshUI\(\);\n\}', ''
$content = $content -replace '(?s)function toggleHabit\(id\).*?checkNotificationEngine\(\);\n\}', ''
$content = $content -replace '(?s)function recalcStreaks\(\).*?save\(STORAGE_KEYS\.habits, habits\);\n\}', ''
$content = $content -replace '(?s)function deleteHabit\(id\).*?refreshUI\(\);\n  \}\);\n\}', ''
$content = $content -replace '(?s)function renderHabits\(\).*?lucide\.createIcons\(\);\n\}', ''

$content = $content.Replace("recalcStreaks();`n", "")
$content = $content.Replace("if (e.key === 'Enter' && document.activeElement.id === 'habit-name-input') addHabit();", "")

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Output "Done"
