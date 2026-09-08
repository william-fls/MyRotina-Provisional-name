// =============================================
// Minha Rotina — shell compartilhado (modais, nome, PWA, eventos globais)
// Carregado em TODAS as páginas, depois de store.js/theme.js.
// Ações aqui: close-modal, open-name-modal, save-name (o botão de
// confirmação é ligado direto, sem data-action, para não duplicar).
// =============================================

// ---- Modais ----
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector('input, button, select, textarea')?.focus();
}
function closeModal(id) {
  const modal = typeof id === 'string' ? document.getElementById(id) : id;
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}
let confirmCallback = () => {};
function showConfirm(title, msg, cb = () => {}) {
  setEl('confirm-title', title);
  setEl('confirm-msg', msg);
  confirmCallback = cb;
  openModal('modal-confirm');
}
function confirmDialogYes() {
  const cb = confirmCallback;
  confirmCallback = () => {};
  closeModal('modal-confirm');
  cb();
}

// ---- Nome (primeiro acesso abre o modal em qualquer página) ----
function updateUserName(name) {
  const safeName = name || 'você';
  const el = document.getElementById('user-name');
  if (el) el.textContent = safeName;
  const baseTitle = document.body?.dataset?.title || 'Minha Rotina';
  document.title = name ? `${baseTitle} - ${name}` : baseTitle;
}
function initName() {
  const name = (load(STORAGE_KEYS.name, '') || '').trim();
  updateUserName(name);
  if (!name) openNameModal();
}
function openNameModal() {
  const input = document.getElementById('name-input');
  if (input) input.value = load(STORAGE_KEYS.name, '');
  openModal('modal-name');
}
function saveName() {
  const input = document.getElementById('name-input');
  const n = (input?.value || '').trim();
  if (n) save(STORAGE_KEYS.name, n);
  else localStorage.removeItem(STORAGE_KEYS.name);
  updateUserName(n);
  if (typeof renderSettingsPage === 'function') renderSettingsPage();
  closeModal('modal-name');
}

// ---- PWA: registro do service worker (offline + instalação) ----
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ---- Eventos globais do shell ----
function handleShellClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  switch (target.dataset.action) {
    case 'open-name-modal': openNameModal(); break;
    case 'save-name': saveName(); break;
    case 'close-modal': {
      const modal = target.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
      break;
    }
    default: break;
  }
}

// Fecha modal clicando no fundo.
function handleOverlayClick(event) {
  if (event.target.classList?.contains('modal-overlay')) closeModal(event.target.id);
}

function handleShellKeydown(event) {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach((m) => closeModal(m.id));
  }
}

// ---- Init comum (o script da página faz o resto) ----
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', handleShellClick);
  document.addEventListener('click', handleOverlayClick, true);
  document.addEventListener('keydown', handleShellKeydown);

  // Botão fixo de confirmação (ligação direta; sem data-action).
  document.getElementById('confirm-yes-btn')
    ?.addEventListener('click', confirmDialogYes);

  initTheme();
  normalizeStorage();
  initName();
  registerServiceWorker();

  if (typeof lucide !== 'undefined') lucide.createIcons();
});
