// Tarefas: criar/editar/concluir/excluir, filtros, heatmap, blocos, modelos.
function getTaskFormState(isEdit = false) {
  const p = isEdit ? 'edit-task' : 'task';
  return {
    textInput: document.getElementById(isEdit ? 'edit-task-text' : 'task-input'),
    datetimeInput: document.getElementById(`${p}-datetime`),
    repeatInput: document.getElementById(`${p}-repeat-daily`),
    noDateInput: document.getElementById(`${p}-no-datetime`),
    blockInput: document.getElementById(`${p}-block`),
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
  composer.dataset.open = taskComposerOpen ? 'true' : 'false';
  form.hidden = !taskComposerOpen;
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(taskComposerOpen));
    const icon = taskComposerOpen ? 'chevron-up' : 'plus';
    const label = taskComposerOpen ? 'Ocultar' : 'Criar';
    toggleBtn.innerHTML = `<i data-lucide="${icon}" style="width:16px;height:16px"></i><span>${label}</span>`;
  }
  if (taskComposerOpen) {
    syncTaskFormState();
    if (focusInput) getTaskFormState(false).textInput?.focus();
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleTaskComposer(forceState) {
  setTaskComposerOpen(typeof forceState === 'boolean' ? forceState : !taskComposerOpen);
}

function initTaskComposer() {
  resetTaskComposer();
  setTaskComposerOpen(true, { focusInput: false });
}

// ---- Blocos: utilidades ----
function removeTaskFromAllBlocks(taskId) {
  Object.keys(timeblocks).forEach((block) => {
    timeblocks[block] = (timeblocks[block] || []).filter((id) => id !== taskId);
  });
}
function applyTaskBlockSelection(taskId, block) {
  removeTaskFromAllBlocks(taskId);
  if (block && timeblocks[block]) timeblocks[block] = [...timeblocks[block], taskId];
}
function isInAnyBlock(id) { return Boolean(getTaskAssignedBlock(id)); }

// ---- Formulário criar/editar: uma única fonte de verdade ----
// Duas chaves independentes que geram 4 combinações:
//  - semHora=false + diária=false → pontual com data/hora.
//  - semHora=false + diária=true  → diária com hora (só hora/min importam).
//  - semHora=true  + diária=false → pontual sem hora (vai para um período).
//  - semHora=true  + diária=true  → diária sem hora (também pode ir para um período).
// "Sem hora" = datetime vazio. O modelo salvo não mudou:
// { id, text, datetime ('HH:MM' embutido p/ diárias), repeatDaily, done, ... }.
function getTaskFormFlags(isEdit = false) {
  const form = getTaskFormState(isEdit);
  return {
    noTime: Boolean(form.noDateInput?.checked),
    daily: Boolean(form.repeatInput?.checked),
  };
}

function isValidDateTimeInput(value) {
  return typeof value === 'string' && value.length >= 16 && !Number.isNaN(new Date(value).getTime());
}

// Mantém hora/min e troca a data por hoje (diárias repetem todo dia).
// Entrada inválida cai para o padrão — nunca propaga lixo adiante.
function withTodayDate(dateTimeValue) {
  const current = new Date(dateTimeValue);
  if (Number.isNaN(current.getTime())) return getDefaultTaskDateTime();
  const base = new Date();
  base.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return toInputDateTime(base);
}

// Lê o formulário já normalizado. Bloco só vem preenchido sem hora marcada.
function readTaskForm(isEdit = false) {
  const form = getTaskFormState(isEdit);
  const text = form.textInput?.value.trim() || '';
  const { noTime, daily } = getTaskFormFlags(isEdit);
  let datetime = '';
  if (!noTime) {
    datetime = form.datetimeInput?.value || '';
    if (!isValidDateTimeInput(datetime)) datetime = getDefaultTaskDateTime();
    if (daily) datetime = withTodayDate(datetime);
  }
  const block = noTime ? (form.blockInput?.value || '') : '';
  return { text, noTime, daily, datetime, block };
}

// Preenche o formulário a partir de uma tarefa (abrir o "Editar").
function fillTaskForm(isEdit, task) {
  const form = getTaskFormState(isEdit);
  const noTime = !hasTaskDateTime(task);
  if (form.textInput) form.textInput.value = task.text || '';
  if (form.datetimeInput) {
    form.datetimeInput.value = task.repeatDaily
      ? (getTaskEffectiveDateTime(task) || getDefaultTaskDateTime())
      : (task.datetime || getDefaultTaskDateTime());
  }
  if (form.repeatInput) form.repeatInput.checked = Boolean(task.repeatDaily);
  if (form.noDateInput) form.noDateInput.checked = noTime;
  if (form.blockInput) form.blockInput.value = noTime ? getTaskAssignedBlock(task.id) : '';
  syncTaskFormState(isEdit);
}

// Espelha as chaves na UI: sem hora esmaece a data e mostra o Período;
// diária com hora mostra a dica de horário. Criar e editar iguais
// (nada some de repente — evita salto de layout).
function syncTaskFormState(isEdit = false) {
  const suffix = isEdit ? 'edit-task' : 'task';
  const repeat = document.getElementById(`${suffix}-repeat-daily`);
  const dtInput = document.getElementById(`${suffix}-datetime`);
  const dtWrap = document.getElementById(`${suffix}-datetime-wrap`);
  const blockWrap = document.getElementById(`${suffix}-block-wrap`);
  const blockSelect = document.getElementById(`${suffix}-block`);
  const dailyHint = document.getElementById(`${suffix}-daily-hint`);
  const { noTime, daily } = getTaskFormFlags(isEdit);

  if (dtInput) {
    dtInput.disabled = noTime;
    if (!noTime) {
      if (!isValidDateTimeInput(dtInput.value)) dtInput.value = getDefaultTaskDateTime();
      else if (daily) dtInput.value = withTodayDate(dtInput.value);
    }
  }
  dtWrap?.classList.toggle('is-no-date-active', noTime);
  if (blockWrap) blockWrap.hidden = !noTime;
  if (!noTime && blockSelect) blockSelect.value = '';
  if (dailyHint) dailyHint.hidden = noTime || !daily;
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
  const { text, daily, datetime, block } = readTaskForm(false);
  if (!text) {
    shake('task-input');
    return;
  }
  const task = {
    id: uid(),
    text,
    datetime,
    repeatDaily: daily,
    done: false,
    created: new Date().toISOString(),
  };
  tasks.unshift(task);
  // Bloco só existe sem hora marcada (readTaskForm já garante '').
  applyTaskBlockSelection(task.id, block);
  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  resetTaskComposer();
  setTaskComposerOpen(true, { focusInput: false });
  const input = document.getElementById('task-input');
  if (input && !isMobileLayout()) input.focus();
  refreshUI();
  showToast('Adicionada', task.text, 'success');
}

function setDailyLog(taskId, done) {
  const today = todayKey();
  if (!dailyTaskLogs[today]) dailyTaskLogs[today] = [];
  if (done) {
    if (!dailyTaskLogs[today].includes(taskId)) dailyTaskLogs[today].push(taskId);
  } else {
    dailyTaskLogs[today] = dailyTaskLogs[today].filter((x) => x !== taskId);
  }
  save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  const willBeDone = !t.done;
  if (t.repeatDaily) setDailyLog(id, willBeDone);
  t.done = willBeDone;
  t.completedAt = willBeDone ? new Date().toISOString() : '';
  save(STORAGE_KEYS.tasks, tasks);
  refreshUI();
}

function deleteTask(id) {
  showConfirm('Excluir tarefa?', 'Ação irreversível.', () => {
    tasks = tasks.filter((t) => t.id !== id);
    removeTaskFromAllBlocks(id);
    save(STORAGE_KEYS.tasks, tasks);
    save(STORAGE_KEYS.timeblocks, timeblocks);
    refreshUI();
  });
}

function editTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  editingTaskId = id;
  fillTaskForm(true, t);
  openModal('modal-edit-task');
}

function saveEditTask() {
  const t = tasks.find((x) => x.id === editingTaskId);
  if (!t) return;
  const { text, daily, datetime, block } = readTaskForm(true);
  if (text) t.text = text;
  t.repeatDaily = daily;
  t.datetime = datetime;

  if (isTaskPeriodAssignable(t)) applyTaskBlockSelection(t.id, block);
  else removeTaskFromAllBlocks(t.id);

  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  closeModal('modal-edit-task');
  refreshUI();
}

// ---- Filtros + resumo ----
function filterTasks(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tab').forEach((b) => b.classList.remove('active'));
  (btn?.classList ? btn : document.querySelector(`.filter-tab[data-filter="${filter}"]`))?.classList.add('active');
  renderTasks();
}

function getFilteredTasks() {
  const today = todayKey();
  if (currentFilter === 'pending') return tasks.filter((t) => !t.done);
  if (currentFilter === 'done') return tasks.filter((t) => t.done);
  if (currentFilter === 'today') return tasks.filter((t) => isTaskForDate(t, today));
  return tasks;
}

function getTaskBlockLabel(taskId) {
  const map = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', night: 'Madrugada' };
  return map[getTaskAssignedBlock(taskId)] || '';
}

function focusTaskInput() {
  setTaskComposerOpen(true, { focusInput: false });
  document.getElementById('task-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('task-input')?.focus(), 300);
}

function clearDoneTasks() {
  const donePunctual = tasks.filter((t) => t.done && !t.repeatDaily);
  const doneDaily = tasks.filter((t) => t.done && t.repeatDaily);
  if (!donePunctual.length && !doneDaily.length) {
    showToast('Nada', 'Nenhuma tarefa concluída.', 'warn');
    return;
  }
  const total = donePunctual.length + doneDaily.length;
  showConfirm('Limpar feitas?', `${total} tarefa(s) serão limpas. Diárias voltam a pendentes.`, () => {
    // Diárias nunca são apagadas aqui: só voltam a pendentes (preserva a rotina).
    const doneIds = new Set(donePunctual.map((t) => t.id));
    tasks = tasks.filter((t) => !doneIds.has(t.id));
    doneDaily.forEach((t) => {
      t.done = false;
      t.completedAt = '';
    });
    const today = todayKey();
    if (dailyTaskLogs[today]) {
      dailyTaskLogs[today] = [];
      save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
    }
    Object.keys(timeblocks).forEach((block) => {
      timeblocks[block] = (timeblocks[block] || []).filter((id) => !doneIds.has(id));
    });
    save(STORAGE_KEYS.tasks, tasks);
    save(STORAGE_KEYS.timeblocks, timeblocks);
    refreshUI();
    showToast('Limpo', `${donePunctual.length} removida(s), ${doneDaily.length} diária(s) reaberta(s).`, 'success');
  });
}

function updatePlanSummary() {
  const today = todayKey();
  const pending = tasks.filter((t) => !t.done).length;
  const todayCount = tasks.filter((t) => isTaskForDate(t, today) && !t.done).length;
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
    done: tasks.filter((t) => t.done).length,
    today: tasks.filter((t) => isTaskForDate(t, today)).length,
  };
  const labels = { all: 'Todas', pending: 'Pendentes', done: 'Feitas', today: 'Hoje' };
  Object.entries(counts).forEach(([filter, n]) => {
    const tab = document.querySelector(`.filter-tab[data-filter="${filter}"]`);
    if (tab) tab.innerHTML = `${labels[filter]} <span class="filter-count">${n}</span>`;
  });
  const clearBtn = document.getElementById('clear-done-btn');
  if (clearBtn) clearBtn.style.display = counts.done > 0 ? '' : 'none';
}

// ---- Lista de tarefas ----
function tasksEmptyCopy() {
  return {
    all: { title: 'Nenhuma tarefa.', hint: 'Crie a primeira.' },
    pending: { title: 'Tudo em dia.', hint: 'Nada pendente.' },
    done: { title: 'Nada feito ainda.', hint: 'Conclua uma tarefa.' },
    today: { title: 'Nada para hoje.', hint: 'Aproveite ou planeje.' },
  }[currentFilter] || { title: 'Nenhuma tarefa.', hint: '' };
}

function buildTaskItemHtml(t) {
  const safeText = escapeHtml(t.text);
  const schedule = hasTaskDateTime(t) ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : '';
  const block = isTaskPeriodAssignable(t) && getTaskBlockLabel(t.id)
    ? `<span class="tag">${getTaskBlockLabel(t.id)}</span>` : '';
  const check = t.done
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>'
    : '';
  return `<div class="task-item ${t.done ? 'done' : ''}">
    <button class="task-check ${t.done ? 'checked' : ''}" type="button" data-action="toggle-task" data-task-id="${t.id}" aria-pressed="${t.done}" aria-label="Concluir: ${safeText}">${check}</button>
    <div class="task-content">
      <div class="task-title-row">
        <div class="task-text">${safeText}</div>
        <span class="task-state-tag">${getTaskStateLabel(t)}</span>
      </div>
      <div class="task-meta"><span class="tag">${getTaskStateLabel(t)}</span>${schedule}${block}</div>
    </div>
    <div class="task-actions">
      <button class="icon-btn" data-action="edit-task" data-task-id="${t.id}" type="button" aria-label="Editar: ${safeText}"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
      <button class="icon-btn del" data-action="delete-task" data-task-id="${t.id}" type="button" aria-label="Excluir: ${safeText}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
    </div>
  </div>`;
}

function renderTasks() {
  updatePlanSummary();
  const list = document.getElementById('tasks-list');
  if (!list) return;
  const filtered = getFilteredTasks();
  if (!filtered.length) {
    const copy = tasksEmptyCopy();
    const showCreate = currentFilter === 'all' || currentFilter === 'today';
    list.innerHTML = `<div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
      <p><strong>${copy.title}</strong></p>
      ${copy.hint ? `<p>${copy.hint}</p>` : ''}
      ${showCreate ? '<button class="btn btn-primary" type="button" data-action="focus-task-input" style="margin-top:12px"><i data-lucide="plus" style="width:14px;height:14px"></i> Criar</button>' : ''}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  list.innerHTML = filtered.map(buildTaskItemHtml).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function formatDT(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

// ---- Heatmap semanal (só diárias) ----
function renderHeatmap() {
  const hm = document.getElementById('weekly-heatmap');
  if (!hm) return;
  const dailyTasks = tasks.filter((t) => t.repeatDaily);
  if (!dailyTasks.length) {
    hm.innerHTML = '<p class="text-muted text-sm">Adicione tarefas diárias para ver o progresso.</p>';
    return;
  }
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const todayStr = todayKey();
  hm.innerHTML = dailyTasks.map((t) => {
    const cells = dates.map((d) => {
      const key = localDateKey(d);
      const isDone = (dailyTaskLogs[key] || []).includes(t.id);
      return `<div class="hm-day"><div class="hm-label">${days[d.getDay()]}</div><div class="hm-cell ${isDone ? 'done' : ''} ${key === todayStr ? 'today' : ''}" title="${key}"></div></div>`;
    }).join('');
    return `<div class="heatmap-row"><div class="heatmap-title">${escapeHtml(t.text)}</div><div class="heatmap-scroll"><div class="heatmap">${cells}</div></div></div>`;
  }).join('');
}

// ---- Blocos de período ----
const TIME_BLOCK_CONFIG = {
  morning: { label: 'Manhã', time: '06:00 - 12:00', color: 'var(--accent)', icon: 'sunrise' },
  afternoon: { label: 'Tarde', time: '12:00 - 18:00', color: 'var(--accent2)', icon: 'sun' },
  evening: { label: 'Noite', time: '18:00 - 22:00', color: 'var(--accent)', icon: 'sunset' },
  night: { label: 'Madrugada', time: '22:00 - 06:00', color: 'var(--muted)', icon: 'moon' },
};

function getAssignableBlockTasks(block) {
  return (timeblocks[block] || [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter((task) => isTaskPeriodAssignable(task) && !task.done);
}

function renderTimeBlockHeaders(nowBlock) {
  Object.entries(TIME_BLOCK_CONFIG).forEach(([block, config]) => {
    const blockEl = document.querySelector(`#page-tasks .time-block.${block}`);
    if (blockEl) blockEl.classList.toggle('is-now', block === nowBlock);
    const header = document.querySelector(`#page-tasks .time-block.${block} .time-block-header`);
    if (!header) return;
    const n = getAssignableBlockTasks(block).length;
    header.innerHTML = `<span class="block-icon" style="color:${config.color}"><i data-lucide="${config.icon}" style="width:15px;height:15px"></i></span><span class="block-label" style="color:${config.color}">${config.label}</span>${block === nowBlock ? '<span class="block-now-tag">agora</span>' : ''}<span class="block-count">${n}</span><span class="block-time">${config.time}</span>`;
  });
}

function renderTimeBlockLists() {
  ['morning', 'afternoon', 'evening', 'night'].forEach((block) => {
    const container = document.getElementById(`block-${block}-tasks`);
    if (!container) return;
    const items = getAssignableBlockTasks(block);
    container.innerHTML = items.length
      ? items.map((task) => `
        <div class="block-task">
          <button class="task-check task-check-sm" type="button" data-action="toggle-task" data-task-id="${task.id}" aria-label="Concluir: ${escapeHtml(task.text)}"></button>
          <span class="block-task-main">${escapeHtml(task.text)}</span>
          <button class="icon-btn" type="button" data-action="remove-from-block" data-task-id="${task.id}" data-block="${block}" aria-label="Remover do bloco"><i data-lucide="x" style="width:14px;height:14px"></i></button>
        </div>`).join('')
      : '<div class="time-block-empty">Vazio.</div>';
  });
}

function renderPendingBlockTasks() {
  const box = document.getElementById('drag-tasks-list');
  if (!box) return;
  const pending = tasks.filter((task) => isTaskPeriodAssignable(task) && !task.done && !isInAnyBlock(task.id));
  if (!pending.length) {
    box.innerHTML = '<p class="text-muted text-sm">Tudo encaixado.</p>';
    return;
  }
  box.innerHTML = pending.map((task) => `
    <div class="pending-task-card">
      <div class="pending-task-copy">
        <div class="pending-task-title">${escapeHtml(task.text)}</div>
        <div class="text-sm text-muted">Sem hora marcada. Escolha um período.</div>
      </div>
      <div class="block-assign">
        <button class="block-assign-btn" type="button" data-action="move-to-block" data-task-id="${task.id}" data-block="morning">Manhã</button>
        <button class="block-assign-btn" type="button" data-action="move-to-block" data-task-id="${task.id}" data-block="afternoon">Tarde</button>
        <button class="block-assign-btn" type="button" data-action="move-to-block" data-task-id="${task.id}" data-block="evening">Noite</button>
        <button class="block-assign-btn" type="button" data-action="move-to-block" data-task-id="${task.id}" data-block="night">Madrugada</button>
      </div>
    </div>`).join('');
}

function renderTimeBlocks() {
  const tbDate = document.getElementById('tb-date');
  if (tbDate) {
    tbDate.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  const nowBlock = typeof getCurrentTimeBlock === 'function' ? getCurrentTimeBlock() : '';
  renderTimeBlockHeaders(nowBlock);
  renderTimeBlockLists();
  renderPendingBlockTasks();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function moveTaskToBlock(taskId, block) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || !block || !TIME_BLOCK_CONFIG[block]) return;
  if (!isTaskPeriodAssignable(task)) {
    showToast('Só tarefas sem hora', 'Tarefas com hora ficam fora dos blocos.', 'warn');
    return;
  }
  applyTaskBlockSelection(taskId, block);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
}

function removeFromBlock(taskId, block) {
  if (!timeblocks[block]) return;
  timeblocks[block] = timeblocks[block].filter((id) => id !== taskId);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
}

// ---- Modelos prontos ----
// Item: { text, block? } pontual sem hora → vai para o período;
// { text, block, daily: true } diária sem hora → repete e fica no período;
// { text, time: 'HH:MM', daily: true } diária com hora.
const PRESET_ROUTINES = [
  {
    id: 'manha-produtiva',
    name: 'Manhã Produtiva',
    description: 'Diárias sem hora para começar bem, todos os dias.',
    icon: 'sunrise',
    items: [
      { text: 'Arrumar a cama', block: 'morning', daily: true },
      { text: 'Beber 500 ml de água', block: 'morning', daily: true },
      { text: 'Revisar as 3 prioridades do dia', block: 'morning', daily: true },
    ],
  },
  {
    id: 'treino-rapido',
    name: 'Treino Rápido',
    description: '20 min de movimento para aplicar hoje.',
    icon: 'dumbbell',
    items: [
      { text: 'Aquecimento e mobilidade — 5 min', block: 'morning' },
      { text: 'Circuito: agachamento, flexão e prancha — 10 min', block: 'morning' },
      { text: 'Alongamento e respiração — 5 min', block: 'morning' },
    ],
  },
  {
    id: 'foco-estudos',
    name: 'Foco nos Estudos',
    description: 'Pomodoro da tarde com pausa e revisão.',
    icon: 'book-open',
    items: [
      { text: 'Estudar com timer — 25 min', block: 'afternoon' },
      { text: 'Pausa longe da tela — 5 min', block: 'afternoon' },
      { text: 'Revisar e anotar o que aprendeu', block: 'afternoon' },
    ],
  },
  {
    id: 'bem-estar-noturno',
    name: 'Bem-estar Noturno',
    description: 'Desacelere à noite, com uma diária fixa.',
    icon: 'moon',
    items: [
      { text: 'Ler 20 minutos', block: 'evening', daily: true },
      { text: 'Planejar as tarefas de amanhã', block: 'evening' },
      { text: 'Desconectar das telas', time: '22:00', daily: true },
    ],
  },
  {
    id: 'limpeza-express',
    name: 'Limpeza Express',
    description: 'Casa em ordem em 15 minutos.',
    icon: 'sparkles',
    items: [
      { text: 'Recolher objetos fora do lugar', block: 'afternoon' },
      { text: 'Limpar uma superfície (mesa ou pia)', block: 'afternoon' },
      { text: 'Tirar o lixo e trocar o saco', block: 'afternoon' },
    ],
  },
];

function getPresetRoutine(presetId) {
  return PRESET_ROUTINES.find((preset) => preset.id === presetId) || null;
}

// Chave texto + modo: evita dizer "já aplicado" para tarefa parecida de outro tipo.
function presetItemKey(text, daily, block, time) {
  return `${(text || '').trim().toLowerCase()}::${daily ? 'D' : ''}::${block || ''}::${time || ''}`;
}

function taskToPresetKey(t) {
  const time = t.repeatDaily && t.datetime ? (t.datetime.slice(11, 16) || '') : '';
  return presetItemKey(t.text, t.repeatDaily, getTaskAssignedBlock(t.id), time);
}

function isPresetAlreadyApplied(preset) {
  const existing = new Set(
    tasks.filter((t) => !t.done).map(taskToPresetKey)
  );
  return preset.items.every((item) => existing.has(
    presetItemKey(item.text, item.daily, item.block, item.time)
  ));
}

function applyPresetRoutine(presetId) {
  const preset = getPresetRoutine(presetId);
  if (!preset) return;
  if (isPresetAlreadyApplied(preset)) {
    showToast('Já aplicado', 'Essas tarefas já estão na rotina.', 'warn');
    return;
  }
  preset.items.forEach((item) => {
    const daily = Boolean(item.daily);
    const task = {
      id: uid(),
      text: item.text,
      datetime: daily && item.time ? `${todayKey()}T${item.time}` : '',
      repeatDaily: daily,
      done: false,
      created: new Date().toISOString(),
    };
    tasks.unshift(task);
    // Diárias com hora não vão para blocos; sem hora vão (pontuais ou diárias).
    if (!task.datetime) applyTaskBlockSelection(task.id, item.block || '');
  });
  save(STORAGE_KEYS.tasks, tasks);
  save(STORAGE_KEYS.timeblocks, timeblocks);
  refreshUI();
  showToast('Aplicado', `${preset.name}: ${preset.items.length} tarefas.`, 'success');
}

function renderPresetRoutines() {
  const grid = document.getElementById('preset-grid');
  if (!grid) return;
  grid.innerHTML = PRESET_ROUTINES.map((preset) => `
    <div class="preset-card">
      <div class="preset-card-head">
        <span class="preset-icon"><i data-lucide="${preset.icon}" style="width:18px;height:18px"></i></span>
        <div><div class="preset-name">${escapeHtml(preset.name)}</div><div class="preset-desc">${escapeHtml(preset.description)}</div></div>
      </div>
      <ul class="preset-items">${preset.items.map((item) => `<li>${escapeHtml(item.text)}${item.daily ? ' <span class="tag">Diária</span>' : ''}</li>`).join('')}</ul>
      <button class="btn btn-ghost preset-apply" type="button" data-action="apply-preset" data-preset-id="${preset.id}"><i data-lucide="plus" style="width:14px;height:14px"></i> Aplicar</button>
    </div>`).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
