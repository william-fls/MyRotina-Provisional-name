function isDashboardClockEnabled() {
  return appSettings.showDashboardClock !== false;
}

function saveAppSettings() {
  save(STORAGE_KEYS.appSettings, appSettings);
}

function syncDashboardClockVisibility() {
  const panel = document.querySelector('#page-dashboard .clock-panel');
  const hero = document.querySelector('#page-dashboard .dashboard-hero');
  const enabled = isDashboardClockEnabled();
  if (panel) panel.hidden = !enabled;
  if (hero) hero.classList.toggle('clock-disabled', !enabled);
}

function toggleDashboardClockSetting(enabled) {
  appSettings.showDashboardClock = Boolean(enabled);
  saveAppSettings();
  syncDashboardClockVisibility();
  renderSettingsPage();
  if (document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard();
  showToast(
    appSettings.showDashboardClock ? 'Relógio exibido' : 'Relógio ocultado',
    appSettings.showDashboardClock
      ? 'O painel principal voltou a mostrar hora e data.'
      : 'O painel principal ficou mais limpo, sem o relógio grande.',
    appSettings.showDashboardClock ? 'success' : 'warn'
  );
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
        <span class="theme-card-badge">${theme.mode === 'light' ? 'Claro' : 'Escuro'}</span>
      </div>
      <div class="theme-card-copy">${theme.description}</div>
    </button>
  `).join('');
}

function renderSettingsPage() {
  const currentName = document.getElementById('settings-current-name');
  if (currentName) currentName.textContent = (load(STORAGE_KEYS.name, '') || 'Você').trim() || 'Você';

  const clockToggle = document.getElementById('settings-clock-toggle');
  if (clockToggle) clockToggle.checked = isDashboardClockEnabled();
  const clockStatus = document.getElementById('settings-clock-status');
  if (clockStatus) clockStatus.textContent = isDashboardClockEnabled()
    ? 'Relógio visível no topo do dashboard.'
    : 'Relógio oculto no dashboard.';

  const currentTheme = getThemePreset(getCurrentThemeId());
  const themePill = document.getElementById('settings-theme-pill');
  if (themePill) themePill.textContent = currentTheme.name;
  const themeCopy = document.getElementById('settings-theme-copy');
  if (themeCopy) themeCopy.textContent = `Tema atual: ${currentTheme.name}.`;
  renderThemeOptions();

  const notificationEnv = getNotificationEnvironment();
  const notificationStatus = document.getElementById('settings-notification-status');
  if (notificationStatus) notificationStatus.textContent = getNotificationSupportText(notificationEnv);
  const mobileNote = document.getElementById('settings-mobile-note');
  if (mobileNote) mobileNote.textContent = getMobileNotificationHint(notificationEnv);
  const notificationPill = document.getElementById('settings-notification-pill');
  if (notificationPill) {
    notificationPill.textContent = notificationEnv.enabled ? 'Ativas' : 'Desligadas';
    notificationPill.classList.toggle('active', notificationEnv.enabled);
    notificationPill.classList.toggle('soft', !notificationEnv.enabled);
  }
  const notificationActionLabel = document.getElementById('settings-notification-action-label');
  if (notificationActionLabel) {
    notificationActionLabel.textContent =
      notificationEnv.ios && !notificationEnv.standalone
        ? 'Como ativar no iPhone'
        : notificationEnv.enabled ? 'Pausar alertas' : 'Ativar alertas';
  }

  syncAiProviderLabels();
  syncDashboardClockVisibility();
  lucide.createIcons();
}
