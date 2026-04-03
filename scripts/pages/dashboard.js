function renderTip() {
  const day = new Date().getDate();
  document.getElementById('tip-text').textContent = TIPS[day % TIPS.length];
}

function getCurrentTimeBlock() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function getTimeBlockMeta(block) {
  const map = {
    morning: { label: 'Manhã', range: '06:00 - 12:00', accent: 'var(--accent)' },
    afternoon: { label: 'Tarde', range: '12:00 - 18:00', accent: 'var(--accent2)' },
    evening: { label: 'Noite', range: '18:00 - 22:00', accent: 'var(--accent)' },
    night: { label: 'Madrugada', range: '22:00 - 06:00', accent: 'var(--muted)' },
  };
  return map[block] || map.morning;
}

const DASHBOARD_CARD_ORDER_KEY = 'mr_dashboardCardOrder';
const DASHBOARD_CARD_VISIBILITY_KEY = 'mr_dashboardCardVisibility';
const DASHBOARD_CARD_ORDER_META = [
  { id: 'tip', label: 'Dica do dia' },
  { id: 'week', label: 'Esta semana' },
  { id: 'overview-focus', label: 'Resumo + Foco do período' },
  { id: 'lists', label: 'Listas rapidas' },
];

let dashboardCardOrderDraft = [];
let dashboardCardVisibilityDraft = {};

function getDefaultDashboardCardOrder() {
  return DASHBOARD_CARD_ORDER_META.map(item => item.id);
}

function getDefaultDashboardCardVisibility() {
  const defaults = {};
  getDefaultDashboardCardOrder().forEach(id => { defaults[id] = true; });
  return defaults;
}

function sanitizeDashboardCardOrder(order) {
  const valid = new Set(getDefaultDashboardCardOrder());
  const incoming = Array.isArray(order) ? order : [];
  const deduped = [];
  incoming.forEach(id => {
    if (!valid.has(id) || deduped.includes(id)) return;
    deduped.push(id);
  });
  getDefaultDashboardCardOrder().forEach(id => {
    if (!deduped.includes(id)) deduped.push(id);
  });
  return deduped;
}

function sanitizeDashboardCardVisibility(visibility) {
  const defaults = getDefaultDashboardCardVisibility();
  const source = visibility && typeof visibility === 'object' ? visibility : {};
  const safe = {};
  Object.keys(defaults).forEach(id => {
    safe[id] = source[id] !== false;
  });
  return safe;
}

function loadDashboardCardOrder() {
  try {
    const raw = JSON.parse(localStorage.getItem(DASHBOARD_CARD_ORDER_KEY) || 'null');
    return sanitizeDashboardCardOrder(raw);
  } catch {
    return getDefaultDashboardCardOrder();
  }
}

function loadDashboardCardVisibility() {
  try {
    const raw = JSON.parse(localStorage.getItem(DASHBOARD_CARD_VISIBILITY_KEY) || 'null');
    return sanitizeDashboardCardVisibility(raw);
  } catch {
    return getDefaultDashboardCardVisibility();
  }
}

function persistDashboardCardOrder(order) {
  const safe = sanitizeDashboardCardOrder(order);
  localStorage.setItem(DASHBOARD_CARD_ORDER_KEY, JSON.stringify(safe));
  return safe;
}

function persistDashboardCardVisibility(visibility) {
  const safe = sanitizeDashboardCardVisibility(visibility);
  localStorage.setItem(DASHBOARD_CARD_VISIBILITY_KEY, JSON.stringify(safe));
  return safe;
}

function countVisibleDashboardCards(visibility) {
  return Object.values(sanitizeDashboardCardVisibility(visibility)).filter(Boolean).length;
}

function applyDashboardCardOrder(order) {
  const container = document.getElementById('dashboard-cards-container');
  if (!container) return;
  const safe = sanitizeDashboardCardOrder(order || loadDashboardCardOrder());
  const sections = Array.from(container.querySelectorAll('[data-dashboard-card]'));
  const byId = new Map(sections.map(section => [section.dataset.dashboardCard, section]));
  safe.forEach(id => {
    const node = byId.get(id);
    if (node) container.appendChild(node);
  });
}

function applyDashboardCardVisibility(visibility) {
  const safe = sanitizeDashboardCardVisibility(visibility || loadDashboardCardVisibility());
  const sections = document.querySelectorAll('#dashboard-cards-container [data-dashboard-card]');
  sections.forEach(section => {
    const id = section.dataset.dashboardCard;
    section.hidden = !safe[id];
  });
}

function moveDashboardCardInDraft(index, delta) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= dashboardCardOrderDraft.length) return;
  const nextOrder = [...dashboardCardOrderDraft];
  const [item] = nextOrder.splice(index, 1);
  nextOrder.splice(nextIndex, 0, item);
  dashboardCardOrderDraft = nextOrder;
  renderDashboardOrderEditor();
}

function toggleDashboardCardInDraft(id) {
  const current = Boolean(dashboardCardVisibilityDraft[id]);
  if (current && countVisibleDashboardCards(dashboardCardVisibilityDraft) <= 1) {
    showToast('Mantenha 1 card ativo', 'A tela inicial precisa de pelo menos um card visível.', 'warn');
    return;
  }
  dashboardCardVisibilityDraft = {
    ...dashboardCardVisibilityDraft,
    [id]: !current,
  };
  renderDashboardOrderEditor();
}

function renderDashboardOrderEditor() {
  const list = document.getElementById('dashboard-order-list');
  if (!list) return;
  const labels = new Map(DASHBOARD_CARD_ORDER_META.map(item => [item.id, item.label]));
  list.innerHTML = dashboardCardOrderDraft.map((id, index) => `
    <div class="dashboard-order-item">
      <div class="dashboard-order-meta">
        <div class="dashboard-order-label">${labels.get(id) || id}</div>
        <div class="dashboard-order-state">${dashboardCardVisibilityDraft[id] ? 'Ativo' : 'Oculto'}</div>
      </div>
      <div class="dashboard-order-actions">
        <button class="btn ${dashboardCardVisibilityDraft[id] ? 'btn-success' : 'btn-ghost'} dashboard-order-toggle" type="button" onclick="toggleDashboardCardInDraft('${id}')">
          ${dashboardCardVisibilityDraft[id] ? 'Ocultar' : 'Mostrar'}
        </button>
        <button class="icon-btn" type="button" onclick="moveDashboardCardInDraft(${index}, -1)" ${index === 0 ? 'disabled' : ''} aria-label="Subir">
          <i data-lucide="chevron-up" style="width:16px;height:16px"></i>
        </button>
        <button class="icon-btn" type="button" onclick="moveDashboardCardInDraft(${index}, 1)" ${index === dashboardCardOrderDraft.length - 1 ? 'disabled' : ''} aria-label="Descer">
          <i data-lucide="chevron-down" style="width:16px;height:16px"></i>
        </button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function openDashboardOrderModal() {
  dashboardCardOrderDraft = [...loadDashboardCardOrder()];
  dashboardCardVisibilityDraft = { ...loadDashboardCardVisibility() };
  renderDashboardOrderEditor();
  openModal('modal-dashboard-order');
}

function saveDashboardCardOrder() {
  const savedOrder = persistDashboardCardOrder(dashboardCardOrderDraft);
  const savedVisibility = persistDashboardCardVisibility(dashboardCardVisibilityDraft);
  applyDashboardCardOrder(savedOrder);
  applyDashboardCardVisibility(savedVisibility);
  closeModal('modal-dashboard-order');
  showToast('Layout atualizado', 'Ordem e visibilidade dos cards foram salvas.', 'success');
}

function resetDashboardCardOrder() {
  dashboardCardOrderDraft = getDefaultDashboardCardOrder();
  dashboardCardVisibilityDraft = getDefaultDashboardCardVisibility();
  const savedOrder = persistDashboardCardOrder(dashboardCardOrderDraft);
  const savedVisibility = persistDashboardCardVisibility(dashboardCardVisibilityDraft);
  applyDashboardCardOrder(savedOrder);
  applyDashboardCardVisibility(savedVisibility);
  renderDashboardOrderEditor();
  showToast('Layout padrão restaurado', 'Todos os cards voltaram para o estado original.', 'warn');
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
  title.style.color = meta.accent;
  range.textContent = meta.range;
  pill.textContent = `Agora: ${meta.label}`;

  const currentTasks = (timeblocks[block] || [])
    .map(id => tasks.find(task => task.id === id))
    .filter(task => isTaskPeriodAssignable(task) && !task.done);

  if (!currentTasks.length) {
    list.innerHTML = `
      <div class="dashboard-now-empty">
        Nenhuma tarefa sem data foi encaixada para este período. Você pode organizar isso na aba Planejamento.
      </div>`;
    return;
  }

  list.innerHTML = currentTasks.map(task => `
    <div class="dashboard-now-item">
      <button class="task-check" type="button" onclick="toggleTask('${task.id}')"></button>
      <div class="dashboard-now-copy">
        <div class="dashboard-now-task">${task.text}</div>
        <div class="task-meta">${badgeHTML(task.priority)} <span class="tag">Período do dia</span></div>
      </div>
    </div>
  `).join('');
}

// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  applyDashboardCardOrder(loadDashboardCardOrder());
  applyDashboardCardVisibility(loadDashboardCardVisibility());
  syncDashboardClockVisibility();
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
  setEl('ov-daily-done', `${doneHabits}/${totalH}`);
  setStyle('ov-daily-bar', 'width', `${pctH}%`);

  const overall = Math.round(((doneTasks + doneHabits) / Math.max(totalT + totalH, 1)) * 100);
  setEl('ov-progress', `${overall}%`);
  setStyle('ov-progress-bar', 'width', `${overall}%`);

  setEl('dash-stat-tasks', doneTasks + doneHabits);
  setEl('dash-stat-streak', `${gameState.dayStreak || 0}d`);

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
          <div class="task-check" onclick="toggleTask('${t.id}')"></div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">${t.text}</div>
              <span class="task-state-tag">${getTaskStateLabel(t)}</span>
            </div>
            <div class="task-meta">${badgeHTML(t.priority)} ${hasTaskDateTime(t) ? `<span class="tag">${formatDT(getTaskEffectiveDateTime(t))}</span>` : ''} ${isTaskPeriodAssignable(t) && getTaskBlockLabel(t.id) ? `<span class="tag">${getTaskBlockLabel(t.id)}</span>` : ''}</div>
          </div>
        </div>`).join('');
    }
  }

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
          <div class="task-check" style="pointer-events:none"></div>
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

  const del = document.getElementById('dash-exercises-list');
  const cardE = document.getElementById('dash-card-exercises');
  let showE = [];
  if (del && cardE && typeof fitnessPlan !== 'undefined' && fitnessPlan) {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const todayDayName = dayNames[new Date().getDay()];
    const todayPlan = fitnessPlan.weeklyPlan?.find(d => d.day.startsWith(todayDayName.slice(0, 3))) || fitnessPlan.todayWorkout;
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
          <div class="task-check" onclick="completeExercise('${ex.name.replace(/'/g, "\\\\'")}', 25)"></div>
          <div class="task-content">
            <div class="task-title-row">
              <div class="task-text">${ex.name}</div>
            <span class="task-state-tag" style="background:rgba(var(--success-rgb),0.12);color:var(--success)">Exercício</span>
            </div>
            <div class="task-meta">${ex.sets} series x ${ex.reps} reps</div>
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

  renderCurrentBlockCard();
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

  const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
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
          statusColor = 'var(--accent2)';
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
