function getTaskFormState(isEdit = false) {
  return {
    textInput: document.getElementById(isEdit ? 'edit-task-text' : 'task-input'),
    datetimeInput: document.getElementById(isEdit ? 'edit-task-datetime' : 'task-datetime'),
    repeatInput: document.getElementById(isEdit ? 'edit-task-repeat-daily' : 'task-repeat-daily'),
    noDateInput: document.getElementById(isEdit ? 'edit-task-no-datetime' : 'task-no-datetime'),
    blockInput: document.getElementById(isEdit ? 'edit-task-block' : 'task-block'),
  };
}

let taskComposerOpen = false;

function ensureTaskComposerStructure() {
  const composer = document.getElementById('task-composer');
  if (!composer) return null;

  let form = document.getElementById('task-composer-form');
  let toggleBtn = document.getElementById('task-composer-toggle-btn');
  if (!form || !toggleBtn) {
    const legacyTitle = composer.querySelector(':scope > .section-title');
    if (legacyTitle) legacyTitle.remove();

    form = document.createElement('div');
    form.id = 'task-composer-form';
    form.className = 'task-composer-form';

    const childrenToMove = Array.from(composer.childNodes);
    childrenToMove.forEach(node => form.appendChild(node));

    const head = document.createElement('div');
    head.className = 'task-composer-head';
    head.innerHTML = `
      <div>
        <div class="section-title" style="margin-bottom:4px">Nova rotina</div>
        <p class="text-sm text-muted">Abra para cadastrar uma rotina manualmente.</p>
      </div>
      <button class="btn btn-primary" id="task-composer-toggle-btn" type="button" onclick="toggleTaskComposer()">
        <i data-lucide="plus" style="width:16px;height:16px"></i>
        <span>Criar nova rotina</span>
      </button>
    `;

    composer.innerHTML = '';
    composer.appendChild(head);
    composer.appendChild(form);

    toggleBtn = head.querySelector('#task-composer-toggle-btn');
  }

  const addBtn = form.querySelector('button[onclick="addTask()"]');
  if (addBtn && !form.querySelector('.task-composer-actions')) {
    addBtn.type = 'button';
    addBtn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px"></i> Salvar rotina';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-ghost';
    closeBtn.type = 'button';
    closeBtn.setAttribute('onclick', 'toggleTaskComposer(false)');
    closeBtn.innerHTML = '<i data-lucide="x" style="width:16px;height:16px"></i> Fechar';

    const actions = document.createElement('div');
    actions.className = 'task-composer-actions';
    addBtn.replaceWith(actions);
    actions.appendChild(addBtn);
    actions.appendChild(closeBtn);
  }

  return { composer, form, toggleBtn };
}

function setTaskComposerOpen(isOpen, { focusInput = true } = {}) {
  const structure = ensureTaskComposerStructure();
  if (!structure) return;

  taskComposerOpen = Boolean(isOpen);
  const { composer, form, toggleBtn } = structure;

  if (composer) composer.dataset.open = taskComposerOpen ? 'true' : 'false';
  form.hidden = !taskComposerOpen;
  toggleBtn.innerHTML = taskComposerOpen
    ? '<i data-lucide="chevron-up" style="width:16px;height:16px"></i><span>Ocultar cadastro</span>'
    : '<i data-lucide="plus" style="width:16px;height:16px"></i><span>Criar nova rotina</span>';

  if (taskComposerOpen) {
    syncTaskFormState();
    if (focusInput) {
      const formState = getTaskFormState(false);
      formState.textInput?.focus();
    }
  }
  lucide.createIcons();
}

function toggleTaskComposer(forceState) {
  if (typeof forceState === 'boolean') {
    setTaskComposerOpen(forceState);
    return;
  }
  setTaskComposerOpen(!taskComposerOpen);
}

function initTaskComposer() {
  ensureTaskComposerStructure();
  resetTaskComposer();
  setTaskComposerOpen(false, { focusInput: false });
}

function removeTaskFromAllBlocks(taskId) {
  Object.keys(timeblocks).forEach(block => {
    timeblocks[block] = (timeblocks[block] || []).filter(id => id !== taskId);
  });
}

function applyTaskBlockSelection(taskId, block) {
  removeTaskFromAllBlocks(taskId);
  if (!block) return;
  timeblocks[block] = [...(timeblocks[block] || []), taskId];
  timeblockHistory[todayKey()] = true;
}

function resetTaskComposer() {
  const form = getTaskFormState(false);
  if (form.textInput) form.textInput.value = '';
  if (form.datetimeInput) form.datetimeInput.value = getDefaultTaskDateTime();
  if (form.repeatInput) form.repeatInput.checked = false;
  if (form.noDateInput) form.noDateInput.checked = false;
  if (form.blockInput) form.blockInput.value = '';
  syncTaskFormState();
}

function addTask() {
  const form = getTaskFormState(false);
  const text = form.textInput?.value.trim();
  if (!text) {
    shake('task-input');
    return;
  }

  const isNoDate = Boolean(form.noDateInput?.checked);
  const task = {
    id: uid(),
    text,
    datetime: isNoDate ? '' : (form.datetimeInput?.value || getDefaultTaskDateTime()),
    repeatDaily: isNoDate ? false : Boolean(form.repeatInput?.checked),
    createdByAI: false,
    done: false,
    created: new Date().toISOString(),
  };

  if (task.repeatDaily) task.datetime = getTaskEffectiveDateTime(task);
  tasks.unshift(task);
  applyTaskBlockSelection(task.id, isNoDate ? (form.blockInput?.value || '') : '');

  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  save(STORAGE_KEYS.timeblockHistory, timeblockHistory);

  resetTaskComposer();
  setTaskComposerOpen(false, { focusInput: false });
  updateTodayTaskStats();
  refreshUI();
  checkNotificationEngine();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const wasDone = t.done;
  const today = todayKey();
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
  updateTodayTaskStats();
  refreshUI();
  checkNotificationEngine();
}

function deleteTask(id) {
  showConfirm('Excluir tarefa?', 'Esta ação não pode ser desfeita.', () => {
    tasks = tasks.filter(t => t.id !== id);
    removeTaskFromAllBlocks(id);
    save(STORAGE_KEYS.tasks, tasks);
    save(STORAGE_KEYS.timeblocks, timeblocks);
    updateTodayTaskStats();
    refreshUI();
  });
}

function editTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingTaskId = id;
  const form = getTaskFormState(true);
  const noDate = isTaskPeriodAssignable(t);
  if (form.textInput) form.textInput.value = t.text;
  if (form.datetimeInput) form.datetimeInput.value = t.repeatDaily
    ? getTaskEffectiveDateTime(t)
    : (t.datetime || getDefaultTaskDateTime());
  if (form.repeatInput) form.repeatInput.checked = Boolean(t.repeatDaily);
  if (form.noDateInput) form.noDateInput.checked = noDate;
  if (form.blockInput) form.blockInput.value = noDate ? getTaskAssignedBlock(t.id) : '';
  syncTaskFormState(true);
  openModal('modal-edit-task');
}

function saveEditTask() {
  const t = tasks.find(t => t.id === editingTaskId);
  if (!t) return;
  const form = getTaskFormState(true);
  const isNoDate = Boolean(form.noDateInput?.checked);

  t.text = form.textInput?.value.trim() || t.text;
  t.repeatDaily = isNoDate ? false : Boolean(form.repeatInput?.checked);
  t.datetime = isNoDate ? '' : (form.datetimeInput?.value || getDefaultTaskDateTime());
  if (t.repeatDaily) t.datetime = getTaskEffectiveDateTime(t);

  if (isTaskPeriodAssignable(t)) {
    applyTaskBlockSelection(t.id, form.blockInput?.value || '');
  } else {
    removeTaskFromAllBlocks(t.id);
  }

  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
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
    default: return tasks;
  }
}

function getTaskBlockLabel(taskId) {
  const map = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    evening: 'Noite',
    night: 'Madrugada',
  };
  const block = getTaskAssignedBlock(taskId);
  return map[block] || '';
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
    const schedule = hasTaskDateTime(t) ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : '';
    const cadence = `<span class="tag">${getTaskStateLabel(t)}</span>`;
    const block = isTaskPeriodAssignable(t) && getTaskBlockLabel(t.id)
      ? `<span class="tag">Período: ${getTaskBlockLabel(t.id)}</span>`
      : '';
    return `<div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
        ${t.done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </div>
      <div class="task-content">
        <div class="task-title-row">
          <div class="task-text">${t.text}</div>
          <span class="task-state-tag">${getTaskStateLabel(t)}</span>
        </div>
        <div class="task-meta" style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">${cadence} ${schedule} ${block}</div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="editTask('${t.id}')"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
        <button class="icon-btn del" onclick="deleteTask('${t.id}')"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function formatDT(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// =============================================
// HEATMAP
// =============================================
function renderHeatmap() {
  const hm = document.getElementById('weekly-heatmap');
  if (!hm) return;
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const dailyTasks = tasks.filter(t => t.repeatDaily);
  if (dailyTasks.length === 0) {
    hm.innerHTML = '<p class="text-muted text-sm">Adicione tarefas diárias para ver o progresso contínuo.</p>';
    return;
  }
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
    morning: { slot: '06h-12h', label: 'Manhã', time: '06:00 - 12:00', color: 'var(--accent)' },
    afternoon: { slot: '12h-18h', label: 'Tarde', time: '12:00 - 18:00', color: 'var(--accent2)' },
    evening: { slot: '18h-22h', label: 'Noite', time: '18:00 - 22:00', color: 'var(--accent)' },
    night: { slot: '22h-06h', label: 'Madrugada', time: '22:00 - 06:00', color: 'var(--muted)' },
  };
  Object.entries(headerConfig).forEach(([block, config]) => {
    const header = document.querySelector(`#page-tasks .time-block.${block} .time-block-header`);
    if (!header) return;
    header.innerHTML = `<span class="tag">${config.slot}</span><span class="block-label" style="color:${config.color}">${config.label}</span><span class="block-time">${config.time}</span>`;
  });

  ['morning', 'afternoon', 'evening', 'night'].forEach(block => {
    const container = document.getElementById(`block-${block}-tasks`);
    if (!container) return;
    const blockTasks = (timeblocks[block] || [])
      .map(id => tasks.find(t => t.id === id))
      .filter(task => isTaskPeriodAssignable(task));
    container.innerHTML = blockTasks.length
      ? blockTasks.map(task => `
        <div class="block-task">
          <span class="block-task-main">${task.text}</span>
          <button class="icon-btn" type="button" onclick="removeFromBlock('${task.id}','${block}')" aria-label="Remover do bloco">
            <i data-lucide="x" style="width:14px;height:14px"></i>
          </button>
        </div>`).join('')
      : '<div class="time-block-empty">Nenhuma tarefa sem data neste bloco ainda.</div>';
  });

  const dgl = document.getElementById('drag-tasks-list');
  if (dgl) {
    const pending = tasks.filter(task => isTaskPeriodAssignable(task) && !task.done && !isInAnyBlock(task.id));
    if (pending.length === 0) {
      dgl.innerHTML = '<p class="text-muted text-sm">Tudo encaixado nos períodos.</p>';
    } else {
      dgl.innerHTML = pending.map(task => `
        <div class="pending-task-card">
          <div class="pending-task-copy">
            <div class="pending-task-title">${task.text}</div>
            <div class="text-sm text-muted">Essas tarefas não têm data fixa. Escolha um período para encaixar no dia.</div>
          </div>
          <div class="block-assign">
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${task.id}','morning')">Manhã</button>
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${task.id}','afternoon')">Tarde</button>
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${task.id}','evening')">Noite</button>
            <button class="block-assign-btn" type="button" onclick="moveTaskToBlock('${task.id}','night')">Madrugada</button>
          </div>
        </div>`).join('');
    }
  }
  lucide.createIcons();
}

function isInAnyBlock(id) {
  return Boolean(getTaskAssignedBlock(id));
}

function moveTaskToBlock(taskId, block) {
  const task = tasks.find(item => item.id === taskId);
  if (!task || !block) return;
  if (!isTaskPeriodAssignable(task)) {
    showToast('So tarefas sem data entram aqui', 'As tarefas com data e hora continuam fora dos blocos do dia.', 'warn');
    return;
  }
  applyTaskBlockSelection(taskId, block);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
  refreshUI();
}

function removeFromBlock(taskId, block) {
  timeblocks[block] = (timeblocks[block] || []).filter(id => id !== taskId);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
}

