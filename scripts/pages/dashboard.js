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
    .map(id => tasks.find(task => task.id === id))
    .filter(task => isTaskPeriodAssignable(task) && !task.done);

  if (!currentTasks.length) {
    list.innerHTML = `<div class="dashboard-now-empty">Nenhuma tarefa para este período.</div>`;
    return;
  }

  list.innerHTML = currentTasks.map(task => `
    <div class="dashboard-now-item">
      <button class="task-check" type="button" onclick="toggleTask('${task.id}')" aria-label="Concluir: ${escapeHtml(task.text)}"></button>
      <div class="dashboard-now-copy">
        <div class="dashboard-now-task">${escapeHtml(task.text)}</div>
      </div>
    </div>
  `).join('');
}

function renderDashboard() {
  const today = todayKey();
  const todayTasks = getTodayTasks();

  const punctualTasks = todayTasks.filter(t => !t.repeatDaily);
  const doneTasks = punctualTasks.filter(t => t.done).length;
  const totalT = punctualTasks.length;

  const dailyTasks = tasks.filter(t => t.repeatDaily);
  const doneHabits = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;
  const totalH = dailyTasks.length;

  const overall = Math.round(((doneTasks + doneHabits) / Math.max(totalT + totalH, 1)) * 100);
  setEl('ov-progress', `${overall}%`);
  setStyle('ov-progress-bar', 'width', `${overall}%`);
  setEl('ov-tasks-done', `${doneTasks}/${totalT}`);
  setEl('ov-daily-done', `${doneHabits}/${totalH}`);
  setEl('dash-stat-tasks', doneTasks + doneHabits);

  const dtl = document.getElementById('dash-tasks-list');
  const cardT = document.getElementById('dash-card-tasks');
  const showT = punctualTasks.filter(t => !t.done).slice(0, 6);
  if (dtl && cardT) {
    if (showT.length === 0) {
      cardT.style.display = 'none';
    } else {
      cardT.style.display = 'flex';
      cardT.style.flexDirection = 'column';
      dtl.innerHTML = showT.map(t => `
        <div class="task-item" style="margin-bottom:4px">
          <div class="task-check" onclick="toggleTask('${t.id}')" role="checkbox" aria-checked="false" aria-label="Concluir: ${escapeHtml(t.text)}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTask('${t.id}') }"></div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">${escapeHtml(t.text)}</div>
              <span class="task-state-tag">${getTaskStateLabel(t)}</span>
            </div>
            <div class="task-meta">${hasTaskDateTime(t) ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : ''} ${isTaskPeriodAssignable(t) && getTaskBlockLabel(t.id) ? `<span class="tag">${getTaskBlockLabel(t.id)}</span>` : ''}</div>
          </div>
        </div>`).join('');
    }
  }

  const dhl = document.getElementById('dash-daily-list');
  const cardD = document.getElementById('dash-card-daily');
  if (dhl && cardD) {
    const showD = dailyTasks.filter(t => !(dailyTaskLogs[today] || []).includes(t.id)).slice(0, 5);
    if (showD.length === 0) {
      cardD.style.display = 'none';
    } else {
      cardD.style.display = 'flex';
      cardD.style.flexDirection = 'column';
      dhl.innerHTML = showD.map(t => `
        <div class="task-item" style="margin-bottom:4px" onclick="toggleTask('${t.id}')">
          <div class="task-check" style="pointer-events:none"></div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">${escapeHtml(t.text)}</div>
              <span class="task-state-tag">Diária</span>
            </div>
          </div>
        </div>`).join('');
    }
  }

  const clockPill = document.getElementById('dashboard-now-pill');
  const focusCard = document.getElementById('dash-card-focus');
  const showClock = typeof isDashboardClockEnabled === 'function' ? isDashboardClockEnabled() : true;
  if (clockPill) clockPill.style.display = showClock ? '' : 'none';
  if (focusCard) focusCard.style.display = showClock ? '' : 'none';

  renderCurrentBlockCard();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
