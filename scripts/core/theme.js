const DEFAULT_THEME_ID = 'dark-tech';
const LAST_DARK_THEME_KEY = 'mr_lastDarkTheme';
const THEME_PRESETS = [
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Black tech minimalista: preto profundo, cinza e branco.',
    mode: 'dark',
    swatches: ['#040506', '#2A2F37', '#F4F6F8'],
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    description: 'Vidro fosco com paleta dark tech em preto, cinza e branco.',
    mode: 'dark',
    swatches: ['#040506', '#2A2F37', '#F4F6F8'],
  },
];

function getThemePreset(themeId) {
  return THEME_PRESETS.find(theme => theme.id === themeId) || THEME_PRESETS[0];
}

function normalizeThemeId(themeId) {
  return getThemePreset(themeId).id;
}

function getCurrentThemeId() {
  return normalizeThemeId(
    document.documentElement.getAttribute('data-theme') || load(STORAGE_KEYS.theme, DEFAULT_THEME_ID)
  );
}

function updateThemeMeta(themeId = getCurrentThemeId()) {
  const preset = getThemePreset(themeId);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const computed = getComputedStyle(document.documentElement);
  const surface = computed.getPropertyValue('--surface').trim() || preset.swatches[1] || preset.swatches[0];
  if (metaTheme) metaTheme.setAttribute('content', surface);
  document.documentElement.dataset.themeMode = preset.mode;
}

function applyTheme(themeId, { persist = false } = {}) {
  const normalized = normalizeThemeId(themeId);
  const preset = getThemePreset(normalized);
  document.documentElement.setAttribute('data-theme', preset.id);
  document.documentElement.dataset.themeMode = preset.mode;
  if (persist) {
    save(STORAGE_KEYS.theme, preset.id);
    if (preset.mode === 'dark') save(LAST_DARK_THEME_KEY, preset.id);
  }
  updateThemeMeta(preset.id);
  return preset;
}

function initTheme() {
  applyTheme(load(STORAGE_KEYS.theme, DEFAULT_THEME_ID));
}

function setTheme(themeId, { silent = false } = {}) {
  const previous = getCurrentThemeId();
  const next = applyTheme(themeId, { persist: true });
  if (!silent && previous !== next.id) {
    showToast('Tema atualizado', `${next.name} aplicado ao app.`, 'success');
  }
  refreshUI();
  renderSettingsPage();
}
