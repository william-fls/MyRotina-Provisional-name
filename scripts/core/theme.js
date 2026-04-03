const DEFAULT_THEME_ID = 'dark';
const LAST_DARK_THEME_KEY = 'mr_lastDarkTheme';
const THEME_PRESETS = [
  {
    id: 'dark',
    name: 'Escuro Padrão',
    description: 'Escuro moderno com contraste limpo e foco no conteúdo.',
    mode: 'dark',
    swatches: ['#0D1117', '#5B8CFF', '#2DD4BF'],
  },
  {
    id: 'light',
    name: 'Claro Padrão',
    description: 'Claro minimalista com leitura confortável.',
    mode: 'light',
    swatches: ['#F6F8FB', '#3B82F6', '#14B8A6'],
  },
  {
    id: 'indigo-cyber',
    name: 'Indigo Cyber',
    description: 'Tech elegante com azul profundo e ciano suave.',
    mode: 'dark',
    swatches: ['#0B1020', '#6C7CFF', '#22C7E6'],
  },
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Black tech minimalista: preto profundo, cinza e branco.',
    mode: 'dark',
    swatches: ['#040506', '#2A2F37', '#F4F6F8'],
  },
  {
    id: 'violet-neon',
    name: 'Violet Neon',
    description: 'Toque criativo com roxo refinado e rosa equilibrado.',
    mode: 'dark',
    swatches: ['#140F1D', '#8B7CFF', '#F472B6'],
  },
  {
    id: 'emerald-deep',
    name: 'Emerald Deep',
    description: 'Verde sofisticado para um visual calmo e produtivo.',
    mode: 'dark',
    swatches: ['#0B1512', '#16A34A', '#06B6D4'],
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

function isLightTheme(themeId = getCurrentThemeId()) {
  return getThemePreset(themeId).mode === 'light';
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

function toggleTheme() {
  const current = getCurrentThemeId();
  const next = current === 'light'
    ? load(LAST_DARK_THEME_KEY, DEFAULT_THEME_ID)
    : 'light';
  setTheme(next, { silent: true });
}

function updateThemeIcon() {}
