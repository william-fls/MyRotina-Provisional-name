function isDashboardClockEnabled() {
  return appSettings.showDashboardClock !== false;
}

function renderThemeOptions() {
  const grid = document.getElementById('settings-theme-grid');
  if (!grid) return;
  const activeThemeId = getCurrentThemeId();
  grid.innerHTML = THEME_PRESETS.map(theme => `
    <button
      class="theme-card ${theme.id === activeThemeId ? 'active' : ''}"
      type="button"
      onclick="setTheme('${theme.id}')"
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
  renderSettingsPage();
  renderDashboard();
  showToast(
    isDashboardClockEnabled() ? 'Foco visível' : 'Foco oculto',
    isDashboardClockEnabled() ? 'Card de foco no Hoje.' : 'Card de foco removido.',
    'success'
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
