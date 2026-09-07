// Dashboard ("Hoje"): progresso, foco (período atual), prévias de tarefas/diárias.
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

function isDailyDoneToday(taskId, today) {
  return (dailyTaskLogs[today] || []).includes(taskId);
}

function getDashboardStats(today) {
  const punctual = tasks.filter((t) => !t.repeatDaily && isTaskForDate(t, today));
  const daily = tasks.filter((t) => t.repeatDaily);
  const donePunctual = punctual.filter((t) => t.done).length;
  const doneDaily = daily.filter((t) => isDailyDoneToday(t.id, today)).length;
  const total = punctual.length + daily.length;
  const done = donePunctual + doneDaily;
  return {
    donePunctual, totalPunctual: punctual.length,
    doneDaily, totalDaily: daily.length,
    overall: total ? Math.round((done / total) * 100) : 0,
    doneTotal: done,
  };
}

function renderDashboardStats(today) {
  const s = getDashboardStats(today);
  setEl('ov-progress', `${s.overall}%`);
  const bar = document.getElementById('ov-progress-bar');
  if (bar) bar.style.width = `${s.overall}%`;
  setEl('ov-tasks-done', `${s.donePunctual}/${s.totalPunctual}`);
  setEl('ov-daily-done', `${s.doneDaily}/${s.totalDaily}`);
  setEl('dash-stat-tasks', String(s.doneTotal));
}

function taskTagsHtml(t) {
  const schedule = hasTaskDateTime(t) ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : '';
  const block = isTaskPeriodAssignable(t) && getTaskBlockLabel(t.id)
    ? `<span class="tag">${getTaskBlockLabel(t.id)}</span>` : '';
  return `${schedule}${block}`;
}

function renderDashboardTasks() {
  const list = document.getElementById('dash-tasks-list');
  const card = document.getElementById('dash-card-tasks');
  if (!list || !card) return;
  card.style.display = '';
  const upcoming = getTodayTasks().filter((t) => !t.repeatDaily && !t.done).slice(0, 6);
  if (!upcoming.length) {
    list.innerHTML = '<div class="dashboard-now-empty">Nenhuma tarefa para hoje.<br><button class="btn btn-ghost" type="button" data-action="navigate" data-page="tasks" style="margin-top:8px;padding:6px 12px;font-size:12px">Planejar o dia</button></div>';
    return;
  }
  list.innerHTML = upcoming.map((t) => `
    <div class="task-item" style="margin-bottom:4px">
      <button class="task-check" type="button" data-action="toggle-task" data-task-id="${t.id}" aria-label="Concluir: ${escapeHtml(t.text)}"></button>
      <div class="task-content">
        <div class="task-title-row">
          <div class="task-text">${escapeHtml(t.text)}</div>
          <span class="task-state-tag">${getTaskStateLabel(t)}</span>
        </div>
        <div class="task-meta">${taskTagsHtml(t)}</div>
      </div>
    </div>`).join('');
}

function renderDashboardDaily(today) {
  const list = document.getElementById('dash-daily-list');
  const card = document.getElementById('dash-card-daily');
  if (!list || !card) return;
  card.style.display = '';
  const pending = tasks.filter((t) => t.repeatDaily && !isDailyDoneToday(t.id, today)).slice(0, 5);
  if (!pending.length) {
    list.innerHTML = '<div class="dashboard-now-empty">Nenhuma diária pendente.<br><button class="btn btn-ghost" type="button" data-action="navigate" data-page="tasks" style="margin-top:8px;padding:6px 12px;font-size:12px">Ver tarefas</button></div>';
    return;
  }
  list.innerHTML = pending.map((t) => `
    <button class="task-item task-row-btn" style="margin-bottom:4px;width:100%;text-align:left" type="button" data-action="toggle-task" data-task-id="${t.id}">
      <span class="task-check" style="pointer-events:none" aria-hidden="true"></span>
      <span class="task-content">
        <span class="task-title-row">
          <span class="task-text">${escapeHtml(t.text)}</span>
          <span class="task-state-tag">${getTaskStateLabel(t)}</span>
        </span>${hasTaskDateTime(t) ? `<span class="task-meta"><span class="tag">${formatDT(getTaskEffectiveDateTime(t, today))}</span></span>` : ''}
      </span>
    </button>`).join('');
}

function renderCurrentBlockCard() {
  const block = getCurrentTimeBlock();
  const meta = getTimeBlockMeta(block);
  const title = document.getElementById('dashboard-now-title');
  const range = document.getElementById('dashboard-now-range');
  const list = document.getElementById('dashboard-now-list');
  const pill = document.getElementById('dashboard-now-pill');
  if (!title || !range || !list || !pill) return;

  title.textContent = meta.label;
  range.textContent = meta.range;
  pill.textContent = `Agora: ${meta.label}`;

  const currentTasks = (timeblocks[block] || [])
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task) => isTaskPeriodAssignable(task) && !task.done);

  list.innerHTML = currentTasks.length
    ? currentTasks.map((task) => `
      <div class="dashboard-now-item">
        <button class="task-check" type="button" data-action="toggle-task" data-task-id="${task.id}" aria-label="Concluir: ${escapeHtml(task.text)}"></button>
        <div class="dashboard-now-copy">
          <div class="dashboard-now-task">${escapeHtml(task.text)}</div>
        </div>
      </div>`).join('')
    : '<div class="dashboard-now-empty">Nenhuma tarefa para este período.</div>';
}

function renderDashboard() {
  const today = todayKey();
  renderDashboardStats(today);
  renderDashboardTasks();
  renderDashboardDaily(today);

  // "Foco" pode ser ocultado nos Ajustes.
  const showFocus = typeof isDashboardClockEnabled === 'function' ? isDashboardClockEnabled() : true;
  const pill = document.getElementById('dashboard-now-pill');
  const focusCard = document.getElementById('dash-card-focus');
  if (pill) pill.style.display = showFocus ? '' : 'none';
  if (focusCard) focusCard.style.display = showFocus ? '' : 'none';
  // Sem o Foco, o grid usa 2 colunas para não deixar coluna vazia.
  document.querySelector('#page-dashboard .dashboard-grid')?.classList.toggle('no-focus', !showFocus);

  renderCurrentBlockCard();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
