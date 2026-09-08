// Ajustes: roda só em ajustes.html. Estado e backup vivem no store.js.
function renderThemeOptions() {
  const grid = document.getElementById('settings-theme-grid');
  if (!grid) return;
  const activeThemeId = getCurrentThemeId();
  grid.innerHTML = THEME_PRESETS.map(theme => `
    <button
      class="theme-card ${theme.id === activeThemeId ? 'active' : ''}"
      type="button"
      data-action="set-theme"
      data-theme-id="${theme.id}"
      aria-pressed="${theme.id === activeThemeId}"
    >
      <div class="theme-card-swatches">
        ${theme.swatches.map(color => `<span class="theme-card-swatch" style="background:${color}"></span>`).join('')}
      </div>
      <div class="theme-card-top">
        <div class="theme-card-name">${theme.name}</div>
      </div>
      <div class="theme-card-copy">${theme.description}</div>
    </button>
  `).join('');
}

function toggleDashboardClock() {
  appSettings.showDashboardClock = !isDashboardClockEnabled();
  save(STORAGE_KEYS.appSettings, appSettings);
  const enabled = isDashboardClockEnabled();
  renderSettingsPage();
  showToast(
    enabled ? 'Foco visível' : 'Foco oculto',
    enabled ? 'Card de foco no Hoje.' : 'Card de foco removido.',
    'success',
  );
}

function restartDay() {
  showConfirm(
    'Reiniciar dia?',
    'Tarefas e blocos serão zerados.',
    () => resetDayState({ manual: true })
  );
}

function renderSettingsPage() {
  const currentName = document.getElementById('settings-current-name');
  if (currentName) currentName.textContent = (load(STORAGE_KEYS.name, '') || 'Você').trim() || 'Você';

  const currentTheme = getThemePreset(getCurrentThemeId());
  const themePill = document.getElementById('settings-theme-pill');
  if (themePill) themePill.textContent = currentTheme.name;
  const themeCopy = document.getElementById('settings-theme-copy');
  if (themeCopy) themeCopy.textContent = `Atual: ${currentTheme.name}.`;
  renderThemeOptions();

  const clockToggle = document.getElementById('settings-clock-toggle');
  if (clockToggle) {
    clockToggle.checked = isDashboardClockEnabled();
    clockToggle.setAttribute('aria-checked', String(isDashboardClockEnabled()));
  }
  const taskCount = document.getElementById('settings-task-count');
  if (taskCount) {
    const total = Array.isArray(tasks) ? tasks.length : 0;
    const done = Array.isArray(tasks) ? tasks.filter(t => t.done).length : 0;
    taskCount.textContent = `${total} tarefas · ${done} feitas`;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- Eventos + init (só Ajustes) ----
function handleSettingsClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const themeId = target.dataset.themeId || target.dataset.presetId;

  switch (target.dataset.action) {
    case 'restart-day': restartDay(); break;
    case 'export-data': exportData(); break;
    case 'import-data': triggerImportData(); break;
    case 'clear-all-data': clearAllData(); break;
    case 'set-theme': if (themeId) setTheme(themeId); break;
    default: break;
  }
}

// O switch do relógio usa 'change' (estado já atualizado, sem duplo clique).
function handleSettingsChange(event) {
  if (event.target?.id === 'settings-clock-toggle') toggleDashboardClock();
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', handleSettingsClick);
  document.body.addEventListener('change', handleSettingsChange);
  setStoreChangedHandler(renderSettingsPage);

  // Backup: sem inline onchange no HTML.
  document.getElementById('import-backup-file')
    ?.addEventListener('change', importDataFromFile);

  checkNewDay();
  renderSettingsPage();

  if (typeof lucide !== 'undefined') lucide.createIcons();

  window.addEventListener('focus', () => {
    checkNewDay();
    renderSettingsPage();
  });
});