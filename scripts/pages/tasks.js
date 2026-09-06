function getTaskFormState(isEdit = false) {
  return {
    textInput: document.getElementById(isEdit ? 'edit-task-text' : 'task-input'),
    datetimeInput: document.getElementById(isEdit ? 'edit-task-datetime' : 'task-datetime'),
    repeatInput: document.getElementById(isEdit ? 'edit-task-repeat-daily' : 'task-repeat-daily'),
    noDateInput: document.getElementById(isEdit ? 'edit-task-no-datetime' : 'task-no-datetime'),
    blockInput: document.getElementById(isEdit ? 'edit-task-block' : 'task-block'),
  };
}

let taskComposerOpen = true;

function ensureTaskComposerStructure() {
  const composer = document.getElementById('task-composer');
  const form = document.getElementById('task-composer-form');
  const toggleBtn = document.getElementById('task-composer-toggle-btn');
  if (!composer || !form) return null;
  return { composer, form, toggleBtn };
}

function setTaskComposerOpen(isOpen, { focusInput = true } = {}) {
  const structure = ensureTaskComposerStructure();
  if (!structure) return;

  taskComposerOpen = Boolean(isOpen);
  const { composer, form, toggleBtn } = structure;

  if (composer) composer.dataset.open = taskComposerOpen ? 'true' : 'false';
  form.hidden = !taskComposerOpen;
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(taskComposerOpen));
    toggleBtn.innerHTML = taskComposerOpen
      ? '<i data-lucide="chevron-up" style="width:16px;height:16px"></i><span>Ocultar</span>'
      : '<i data-lucide="plus" style="width:16px;height:16px"></i><span>Criar</span>';
  }

  if (taskComposerOpen) {
    syncTaskFormState();
    if (focusInput) {
      const formState = getTaskFormState(false);
      formState.textInput?.focus();
    }
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleTaskComposer(forceState) {
  if (typeof forceState === 'boolean') {
    setTaskComposerOpen(forceState);
    return;
  }
  setTaskComposerOpen(!taskComposerOpen);
}

function initTaskComposer() {
  resetTaskComposer();
  setTaskComposerOpen(true, { focusInput: false });
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
    done: false,
    created: new Date().toISOString(),
  };

  if (task.repeatDaily) task.datetime = getTaskEffectiveDateTime(task);
  tasks.unshift(task);
  applyTaskBlockSelection(task.id, isNoDate ? (form.blockInput?.value || '') : '');

  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);

  resetTaskComposer();
  setTaskComposerOpen(true, { focusInput: false });
  const taskInput = document.getElementById('task-input');
  if (taskInput && !isMobileLayout()) taskInput.focus();
  refreshUI();
  showToast('Adicionada', text, 'success');
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
  refreshUI();
}

function deleteTask(id) {
  showConfirm('Excluir tarefa?', 'Ação irreversível.', () => {
    tasks = tasks.filter(t => t.id !== id);
    removeTaskFromAllBlocks(id);
    save(STORAGE_KEYS.tasks, tasks);
    save(STORAGE_KEYS.timeblocks, timeblocks);
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
  closeModal('modal-edit-task');
  refreshUI();
}

function filterTasks(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  if (btn && btn.classList) btn.classList.add('active');
  else document.querySelector(`.filter-tab[data-filter="${filter}"]`)?.classList.add('active');
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

function focusTaskInput() {
  setTaskComposerOpen(true, { focusInput: false });
  const input = document.getElementById('task-input');
  document.getElementById('task-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => input?.focus(), 300);
}

function clearDoneTasks() {
  const doneCount = tasks.filter(t => t.done).length;
  if (!doneCount) {
    showToast('Nada', 'Nenhuma tarefa concluída.', 'warn');
    return;
  }
  showConfirm(
    'Limpar feitas?',
    `${doneCount} tarefa(s) serão removida(s).`,
    () => {
      const doneIds = new Set(tasks.filter(t => t.done).map(t => t.id));
      tasks = tasks.filter(t => !t.done);
      Object.keys(timeblocks).forEach(block => {
        timeblocks[block] = (timeblocks[block] || []).filter(id => !doneIds.has(id));
      });
      save(STORAGE_KEYS.tasks, tasks);
      save(STORAGE_KEYS.timeblocks, timeblocks);
          refreshUI();
      showToast('Limpo', `${doneCount} tarefa(s) removida(s).`, 'success');
    }
  );
}

function updatePlanSummary() {
  const today = todayKey();
  const pending = tasks.filter(t => !t.done).length;
  const todayCount = tasks.filter(t => isTaskForDate(t, today) && !t.done).length;

  const subtitle = document.getElementById('plan-subtitle');
  if (subtitle) {
    const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    subtitle.textContent = `${date} · ${todayCount} para hoje`;
  }

  const count = document.getElementById('tasks-count');
  if (count) count.textContent = pending === 1 ? '1 pendente' : `${pending} pendentes`;

  const counts = {
    all: tasks.length,
    pending,
    done: tasks.filter(t => t.done).length,
    today: tasks.filter(t => isTaskForDate(t, today)).length,
  };
  const labels = { all: 'Todas', pending: 'Pendentes', done: 'Feitas', today: 'Hoje' };
  Object.entries(counts).forEach(([filter, n]) => {
    const tab = document.querySelector(`.filter-tab[data-filter="${filter}"]`);
    if (tab) tab.innerHTML = `${labels[filter]} <span class="filter-count">${n}</span>`;
  });

  const clearBtn = document.getElementById('clear-done-btn');
  if (clearBtn) clearBtn.style.display = counts.done > 0 ? '' : 'none';
}

function renderTasks() {
  updatePlanSummary();
  const list = document.getElementById('tasks-list');
  if (!list) return;
  const filtered = getFilteredTasks();
  if (filtered.length === 0) {
    const emptyCopy = {
      all: { title: 'Nenhuma tarefa.', hint: 'Crie a primeira.' },
      pending: { title: 'Tudo em dia.', hint: 'Nada pendente.' },
      done: { title: 'Nada feito ainda.', hint: 'Conclua uma tarefa.' },
      today: { title: 'Nada para hoje.', hint: 'Aproveite ou planeje.' },
    }[currentFilter] || { title: 'Nenhuma tarefa.', hint: '' };
    list.innerHTML = `<div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
      <p><strong>${emptyCopy.title}</strong></p>
      ${emptyCopy.hint ? `<p>${emptyCopy.hint}</p>` : ''}
      ${currentFilter === 'all' || currentFilter === 'today' ? `<button class="btn btn-primary" type="button" onclick="focusTaskInput()" style="margin-top:12px"><i data-lucide="plus" style="width:14px;height:14px"></i> Criar</button>` : ''}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  list.innerHTML = filtered.map(t => {
    const schedule = hasTaskDateTime(t) ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : '';
    const cadence = `<span class="tag">${getTaskStateLabel(t)}</span>`;
    const block = isTaskPeriodAssignable(t) && getTaskBlockLabel(t.id)
      ? `<span class="tag">${getTaskBlockLabel(t.id)}</span>`
      : '';
    const safeText = escapeHtml(t.text);
    return `<div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')" role="checkbox" aria-checked="${t.done}" aria-label="Concluir: ${safeText}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTask('${t.id}')}">
        ${t.done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </div>
      <div class="task-content">
        <div class="task-title-row">
          <div class="task-text">${safeText}</div>
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
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
    hm.innerHTML = '<p class="text-muted text-sm">Adicione tarefas diárias para ver o progresso.</p>';
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
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">${escapeHtml(t.text)}</div>
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

  const nowBlock = typeof getCurrentTimeBlock === 'function' ? getCurrentTimeBlock() : '';
  const headerConfig = {
    morning: { slot: '06h-12h', label: 'Manhã', time: '06:00 - 12:00', color: 'var(--accent)', icon: 'sunrise' },
    afternoon: { slot: '12h-18h', label: 'Tarde', time: '12:00 - 18:00', color: 'var(--accent2)', icon: 'sun' },
    evening: { slot: '18h-22h', label: 'Noite', time: '18:00 - 22:00', color: 'var(--accent)', icon: 'sunset' },
    night: { slot: '22h-06h', label: 'Madrugada', time: '22:00 - 06:00', color: 'var(--muted)', icon: 'moon' },
  };
  const blockCounts = {};
  ['morning', 'afternoon', 'evening', 'night'].forEach(block => {
    blockCounts[block] = (timeblocks[block] || [])
      .map(id => tasks.find(t => t.id === id))
      .filter(task => isTaskPeriodAssignable(task) && !task.done).length;
  });
  Object.entries(headerConfig).forEach(([block, config]) => {
    const blockEl = document.querySelector(`#page-tasks .time-block.${block}`);
    if (blockEl) blockEl.classList.toggle('is-now', block === nowBlock);
    const header = document.querySelector(`#page-tasks .time-block.${block} .time-block-header`);
    if (!header) return;
    const n = blockCounts[block] || 0;
    header.innerHTML = `<span class="block-icon" style="color:${config.color}"><i data-lucide="${config.icon}" style="width:15px;height:15px"></i></span><span class="block-label" style="color:${config.color}">${config.label}</span>${block === nowBlock ? '<span class="block-now-tag">agora</span>' : ''}<span class="block-count">${n}</span><span class="block-time">${config.time}</span>`;
  });

  ['morning', 'afternoon', 'evening', 'night'].forEach(block => {
    const container = document.getElementById(`block-${block}-tasks`);
    if (!container) return;
    const blockTasks = (timeblocks[block] || [])
      .map(id => tasks.find(t => t.id === id))
      .filter(task => isTaskPeriodAssignable(task) && !task.done);
    container.innerHTML = blockTasks.length
      ? blockTasks.map(task => `
        <div class="block-task">
          <button class="task-check task-check-sm" type="button" onclick="toggleTask('${task.id}')" aria-label="Concluir: ${escapeHtml(task.text)}"></button>
          <span class="block-task-main">${escapeHtml(task.text)}</span>
          <button class="icon-btn" type="button" onclick="removeFromBlock('${task.id}','${block}')" aria-label="Remover do bloco">
            <i data-lucide="x" style="width:14px;height:14px"></i>
          </button>
        </div>`).join('')
      : '<div class="time-block-empty">Vazio.</div>';
  });

  const dgl = document.getElementById('drag-tasks-list');
  if (dgl) {
    const pending = tasks.filter(task => isTaskPeriodAssignable(task) && !task.done && !isInAnyBlock(task.id));
    if (pending.length === 0) {
      dgl.innerHTML = '<p class="text-muted text-sm">Tudo encaixado.</p>';
    } else {
      dgl.innerHTML = pending.map(task => `
        <div class="pending-task-card">
          <div class="pending-task-copy">
            <div class="pending-task-title">${escapeHtml(task.text)}</div>
            <div class="text-sm text-muted">Sem data fixa. Escolha um período.</div>
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
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function isInAnyBlock(id) {
  return Boolean(getTaskAssignedBlock(id));
}

function moveTaskToBlock(taskId, block) {
  const task = tasks.find(item => item.id === taskId);
  if (!task || !block) return;
  if (!isTaskPeriodAssignable(task)) {
    showToast('Só tarefas sem data', 'Tarefas com data ficam fora dos blocos.', 'warn');
    return;
  }
  applyTaskBlockSelection(taskId, block);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
}

function removeFromBlock(taskId, block) {
  timeblocks[block] = (timeblocks[block] || []).filter(id => id !== taskId);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
}

// =============================================
// TREINOS PRÉ-DEFINIDOS (modelos de rotina)
// =============================================
const PRESET_ROUTINES = [
  {
    id: 'treino-rapido',
    name: 'Treino Rápido',
    description: '20 min de movimento.',
    icon: 'dumbbell',
    items: [
      { text: 'Aquecimento 5 min', block: 'morning' },
      { text: 'Circuito 10 min', block: 'morning' },
      { text: 'Alongamento 5 min', block: 'morning' },
    ],
  },
  {
    id: 'manha-produtiva',
    name: 'Manhã Produtiva',
    description: 'Comece com foco.',
    icon: 'sunrise',
    items: [
      { text: 'Arrumar a cama', block: 'morning' },
      { text: 'Revisar prioridades', block: 'morning' },
      { text: 'Bloco de foco 25 min', block: 'morning' },
    ],
  },
  {
    id: 'foco-estudos',
    name: 'Foco nos Estudos',
    description: 'Sessão com pausas.',
    icon: 'book-open',
    items: [
      { text: 'Estudar 25 min', block: 'afternoon' },
      { text: 'Pausa 5 min', block: 'afternoon' },
      { text: 'Revisar anotações', block: 'afternoon' },
    ],
  },
  {
    id: 'bem-estar-noturno',
    name: 'Bem-estar Noturno',
    description: 'Desacelere antes de dormir.',
    icon: 'moon',
    items: [
      { text: 'Ler 20 minutos', block: 'evening' },
      { text: 'Planejar amanhã', block: 'evening' },
      { text: 'Desconectar telas', block: 'night' },
    ],
  },
  {
    id: 'limpeza-express',
    name: 'Limpeza Express',
    description: 'Casa em 15 min.',
    icon: 'sparkles',
    items: [
      { text: 'Recolher objetos', block: 'afternoon' },
      { text: 'Limpar superfície', block: 'afternoon' },
      { text: 'Tirar o lixo', block: 'afternoon' },
    ],
  },
];

function getPresetRoutine(presetId) {
  return PRESET_ROUTINES.find(preset => preset.id === presetId) || null;
}

function isPresetAlreadyApplied(preset) {
  const existing = tasks
    .filter(t => !t.done && isTaskPeriodAssignable(t))
    .map(t => t.text.trim().toLowerCase());
  return preset.items.every(item => existing.includes(item.text.trim().toLowerCase()));
}

function applyPresetRoutine(presetId) {
  const preset = getPresetRoutine(presetId);
  if (!preset) return;
  if (isPresetAlreadyApplied(preset)) {
    showToast('Já aplicado', 'Essas tarefas já estão na rotina.', 'warn');
    return;
  }
  preset.items.forEach(item => {
    const task = {
      id: uid(),
      text: item.text,
      datetime: '',
      repeatDaily: false,
      done: false,
      created: new Date().toISOString(),
    };
    tasks.unshift(task);
    applyTaskBlockSelection(task.id, item.block || '');
  });
  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
  showToast('Aplicado', `${preset.name}: ${preset.items.length} tarefas.`, 'success');
}

function renderPresetRoutines() {
  const grid = document.getElementById('preset-grid');
  if (!grid) return;
  grid.innerHTML = PRESET_ROUTINES.map(preset => `
    <div class="preset-card">
      <div class="preset-card-head">
        <span class="preset-icon"><i data-lucide="${preset.icon}" style="width:18px;height:18px"></i></span>
        <div>
          <div class="preset-name">${escapeHtml(preset.name)}</div>
          <div class="preset-desc">${escapeHtml(preset.description)}</div>
        </div>
      </div>
      <ul class="preset-items">
        ${preset.items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('')}
      </ul>
      <button class="btn btn-ghost preset-apply" type="button" onclick="applyPresetRoutine('${preset.id}')">
        <i data-lucide="plus" style="width:14px;height:14px"></i> Aplicar
      </button>
    </div>`).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

