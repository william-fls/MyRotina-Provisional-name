const DEFAULT_THEME_ID = 'dark';
const LAST_DARK_THEME_KEY = 'mr_lastDarkTheme';
const THEME_PRESETS = [
  {
    id: 'dark',
    name: 'Escuro Padrão',
    description: 'Visual original do app para uso diário.',
    mode: 'dark',
    swatches: ['#0A0A0F', '#111118', '#7C6DF7', '#5CE6B8', '#F7A26D'],
  },
  {
    id: 'light',
    name: 'Claro Padrão',
    description: 'Leve e limpo para ambientes claros.',
    mode: 'light',
    swatches: ['#F0F0F7', '#FFFFFF', '#5847E0', '#0EA5E9', '#F59E0B'],
  },
  {
    id: 'indigo-cyber',
    name: 'Indigo Cyber',
    description: 'Tech, produtividade e um ar futurista.',
    mode: 'dark',
    swatches: ['#0A0A0F', '#18181F', '#6366F1', '#22D3EE', '#8B5CF6'],
  },
  {
    id: 'violet-neon',
    name: 'Violet Neon',
    description: 'Premium, criativo e com energia forte.',
    mode: 'dark',
    swatches: ['#0F0A14', '#1C1626', '#A855F7', '#EC4899', '#F59E0B'],
  },
  {
    id: 'emerald-deep',
    name: 'Emerald Deep',
    description: 'Fresco, saudável e sofisticado.',
    mode: 'dark',
    swatches: ['#0B1210', '#16201D', '#10B981', '#06B6D4', '#84CC16'],
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
