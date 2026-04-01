const fs = require('fs');
const filePath = 'C:\\Users\\willi\\OneDrive\\Desktop\\MyRotina-Provisional-name\\Rotina.html';

let html = fs.readFileSync(filePath, 'utf8');

html = html.replace(/\/\* =============================================\r?\n     HABITS\r?\n  ============================================= \*\/(.*?)\/\* =============================================\r?\n     WEEKLY HEATMAP\r?\n  ============================================= \*\//s, '/* =============================================\n     WEEKLY HEATMAP\n  ============================================= */');

html = html.replace(/<a class="nav-item".*?<span class="nav-label">Hábitos<\/span>\s*<\/a>/s, '');
html = html.replace(/Hábitos feitos/g, 'Diárias feitas');
html = html.replace(/id="ov-habits-done"/g, 'id="ov-daily-done"');
html = html.replace(/id="ov-habits-bar"/g, 'id="ov-daily-bar"');
html = html.replace(/Hábitos de Hoje/g, 'Tarefas Diárias');
html = html.replace(/onclick="navigate\('habits'\)"/g, 'onclick="navigate(\'tasks\'); setTimeout(()=>filterTasks(\'all\', document.querySelector(\'.filter-tab\')), 50);"');
html = html.replace(/id="dash-habits-list"/g, 'id="dash-daily-list"');
html = html.replace(/<!-- ==================== HABITS ==================== -->.*?<section class="page" id="page-habits">.*?<\/section>/s, '');

// move heatmap
const newHeatmap = `
    <div class="card mt-4 mb-4">
      <div class="section-title" style="margin-bottom:12px">Progresso Contínuo (Tarefas Diárias)</div>
      <div id="weekly-heatmap"></div>
    </div>
`;
html = html.replace('<div class="planning-stack mt-4">', newHeatmap + '\n    <div class="planning-stack mt-4">');

html = html.replace(/Hábitos por Dia da Semana/g, 'Tarefas Diárias por Dia');
html = html.replace(/habits: 'mr_habits',/g, '');
html = html.replace(/habitLogs: 'mr_habitLogs',/g, "dailyTaskLogs: 'mr_dailyTaskLogs',");
html = html.replace(/let habits = load\(STORAGE_KEYS\.habits, \[\]\);\s*let habitLogs = load\(STORAGE_KEYS\.habitLogs, \{\}\);/s, "let dailyTaskLogs = load(STORAGE_KEYS.dailyTaskLogs, {});");

const migrationScript = `
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
`;
html = html.replace(/tasks = Array\.isArray\(tasks\) \? tasks : \[\];/g, migrationScript + "\n  tasks = Array.isArray(tasks) ? tasks : [];");
html = html.replace(/habits = Array\.isArray\(habits\) \? habits : \[\];/g, "");
html = html.replace(/habitLogs = habitLogs && typeof habitLogs === 'object' \? habitLogs : \{\};/g, "dailyTaskLogs = dailyTaskLogs && typeof dailyTaskLogs === 'object' ? dailyTaskLogs : {};");
html = html.replace(/rewardLedger\.habits && typeof rewardLedger\.habits === 'object' \? rewardLedger\.habits : \{\}/g, "{}");

html = html.replace(/const onlyDemoHabits = habits\.length > 0 && habits\.every\(habit => DEMO_HABIT_NAMES\.includes\(habit\.name\)\);/g, "");
html = html.replace(/const hasNoActivity = !Object\.keys\(habitLogs\)\.length/g, "const hasNoActivity = !Object.keys(dailyTaskLogs).length");
html = html.replace(/if \(hasNoActivity && \(onlyDemoTasks \|\| onlyDemoHabits\)\) \{/g, "if (hasNoActivity && onlyDemoTasks) {");
html = html.replace(/save\(STORAGE_KEYS\.habits, habits\);\s*save\(STORAGE_KEYS\.habitLogs, habitLogs\);/s, "save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);");
html = html.replace(/habits = \[\];\s*habitLogs = \{\};/s, "dailyTaskLogs = {};");

html = html.replace(/const hasTodayActivity = \(taskStats\[today\]\?\.done \|\| 0\) > 0 \|\| \(habitLogs\[today\] \|\| \[\]\)\.length > 0;/g, "const hasTodayActivity = (taskStats[today]?.done || 0) > 0 || (dailyTaskLogs[today] || []).length > 0;");
html = html.replace(/const hadHabits = \(habitLogs\[key\] \|\| \[\]\)\.length > 0;/g, "const hadHabits = (dailyTaskLogs[key] || []).length > 0;");
html = html.replace(/const doneHabits = \(habitLogs\[today\] \|\| \[\]\)\.length;/g, "const doneHabits = (dailyTaskLogs[today] || []).length;");
html = html.replace(/Registrar 2 hábitos/g, "Completar 2 diárias");
html = html.replace(/const doneTodayHabits = \(habitLogs\[today\] \|\| \[\]\)\.length;/g, "const doneTodayHabits = (dailyTaskLogs[today] || []).length;");

html = html.replace(/const allHabitsDone = habits\.length > 0 && habits\.every\(habit => \(habitLogs\[today\] \|\| \[\]\)\.includes\(habit\.id\)\);/, "const dailyTasks = tasks.filter(t => t.repeatDaily);\n  const allHabitsDone = dailyTasks.length > 0 && dailyTasks.every(t => (dailyTaskLogs[today] || []).includes(t.id));");
html = html.replace(/Registrou 3 hábitos hoje\./g, "Completou 3 tarefas diárias hoje.");

html = html.replace(/const doneHabits = habits\.filter\(h => \(habitLogs\[today\] \|\| \[\]\)\.includes\(h\.id\)\)\.length;/s, 'const dailyTasks = tasks.filter(t => t.repeatDaily);\n  const doneHabits = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;');
html = html.replace(/const totalH = habits\.length;/g, 'const totalH = dailyTasks.length;');

html = html.replace(/const dhl = document\.getElementById\('dash-habits-list'\);.*?renderGamePanel\(\);/s, `
  const dhl = document.getElementById('dash-daily-list');
  if (dhl) {
    if (dailyTasks.length === 0) {
      dhl.innerHTML = \`<div class="empty-state"><p>Nenhuma tarefa diária cadastrada.</p></div>\`;
    } else {
      dhl.innerHTML = dailyTasks.slice(0, 5).map(t => {
        const done = (dailyTaskLogs[today] || []).includes(t.id);
        return \`<div class="task-item \${done ? 'done-today' : ''}" style="margin-bottom:8px" onclick="toggleTask('\${t.id}')">
          <div class="task-check \${done ? 'checked' : ''}" style="pointer-events:none">
            \${done ? \`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>\` : ''}
          </div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">\${t.text}</div>
              <span class="task-state-tag">Diária</span>
            </div>
            <div class="task-meta">\${badgeHTML(t.priority)}</div>
          </div>
        </div>\`;
      }).join('');
    }
  }
  renderGamePanel();
`);

html = html.replace(/function toggleTask\(id\) \{.*?if \(\!wasDone && t\.done/s, `function toggleTask(id) {
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
  if (!wasDone && t.done`);

html = html.replace(/habitLogs\[today\] = \[\];/g, 'dailyTaskLogs[today] = [];');
html = html.replace(/renderHabits\(\);/g, 'renderHeatmap();');

html = html.replace(/const totalHabits = habits\.length;/g, "const dailyTasks = tasks.filter(t => t.repeatDaily);\n  const totalHabits = dailyTasks.length;");
html = html.replace(/const doneHabitsToday = habits\.filter\(h => \(habitLogs\[today\] \|\| \[\]\)\.includes\(h\.id\)\)\.length;/g, "const doneHabitsToday = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;");
html = html.replace(/const maxStreak = Math\.max\(0, \.\.\.habits\.map\(h => h\.streak\)\);/g, "const maxStreak = 0; // Streaks removed for simplicity");
html = html.replace(/const doneH = habits\.filter\(h => \(habitLogs\[key\] \|\| \[\]\)\.includes\(h\.id\)\)\.length;/g, "const doneH = dailyTasks.filter(t => (dailyTaskLogs[key] || []).includes(t.id)).length;");
html = html.replace(/const pctHabit = habits\.length \? Math\.round\(\(doneH \/ habits\.length\) \* 100\) : 0;/g, "const pctHabit = dailyTasks.length ? Math.round((doneH / dailyTasks.length) * 100) : 0;");

html = html.replace(/function renderHeatmap\(\).*?\n\}/s, `function renderHeatmap() {
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
      return \`<div class="hm-day">
        <div class="hm-label">\${days[d.getDay()]}</div>
        <div class="hm-cell \${isDone ? 'done' : ''} \${isToday ? 'today' : ''}" title="\${key}"></div>
      </div>\`;
    }).join('');
    return \`<div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">\${t.text}</div>
      <div class="heatmap-scroll"><div class="heatmap">\${cells}</div></div>
    </div>\`;
  }).join('');
}`);

html = html.replace(/function addHabit\(\).*?refreshUI\(\);\n\}/s, '');
html = html.replace(/function toggleHabit\(id\).*?checkNotificationEngine\(\);\n\}/s, '');
html = html.replace(/function recalcStreaks\(\).*?save\(STORAGE_KEYS\.habits, habits\);\n\}/s, '');
html = html.replace(/function deleteHabit\(id\).*?refreshUI\(\);\n  \}\);\n\}/s, '');
html = html.replace(/function renderHabits\(\).*?lucide\.createIcons\(\);\n\}/s, '');

html = html.replace(/recalcStreaks\(\);\n/g, '');
html = html.replace(/if \(e\.key === 'Enter' && document\.activeElement\.id === 'habit-name-input'\) addHabit\(\);/g, '');


fs.writeFileSync(filePath, html, 'utf8');
console.log('done!');
