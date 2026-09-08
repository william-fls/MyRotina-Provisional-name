# Minha Rotina — instruções do projeto

Planejador diário PWA, 100% client-side. Vanilla JS + Tailwind CDN + Lucide.
Sem frameworks, sem build, sem backend. Dados no `localStorage`.

## Estrutura (3 páginas, sem SPA)

- `index.html` — Hoje (saudação, progresso, Foco, prévias). Scripts: `theme → store → shell → dashboard`.
- `planejar.html` — Criar, Modelos, filtros, lista, heatmap, blocos, modais confirmar/editar. Scripts: `theme → store → shell → tasks`.
- `ajustes.html` — Aparência, Perfil, Dia, Backup, Privacidade, modal confirmar. Scripts: `theme → store → shell → settings`.
- `scripts/core/store.js` — estado global, storage, helpers de data/tarefa, mutações compartilhadas (`toggleTask`), reset, backup v3, toast. Carregado em todas as páginas.
- `scripts/core/shell.js` — modais, nome (primeiro acesso), registro do SW, delegação global (`close-modal`, `open-name-modal`, `save-name`), `Escape`, init comum.
- `scripts/core/theme.js` — temas (`THEME_PRESETS`, `applyTheme`).
- `scripts/pages/dashboard.js|tasks.js|settings.js` — render + delegação + init **só da própria página**.
- Navegação = links reais (`href="./planejar.html"`), ativo fixo por página (`aria-current`). Sem `navigate()`, sem drawer, sem topbar mobile.
- `style.css` — design tokens (`:root`/`[data-theme]`), layout desktop + mobile em `@media (max-width: 768px)`.
- `sw.js`, `manifest.webmanifest`, `icons/` (SVG + PNG 192/512 + maskable) — PWA.
- `test_*.js` + `audit2.py` — suítes Node (`node test_mechanics.js` etc.) e auditoria (`python3 audit2.py`).

## Comunicação entre páginas

- `localStorage` é a fonte da verdade (mesma origem). Cada carregamento relê tudo via `normalizeStorage()`.
- Mutações chamam `emitStoreChanged()`; cada página registra seu render com `setStoreChangedHandler(fn)` no init.
- Chrome compartilhado (sidebar, dock, toast, modais) é **duplicado** nos 3 HTML — manter idêntico ao alterar.

## Comandos

- Rodar: servir a pasta via HTTP (`npx serve .`) — `file://` quebra o PWA.
- Checar sintaxe: `node --check scripts/core/store.js scripts/core/shell.js scripts/core/theme.js scripts/pages/tasks.js scripts/pages/dashboard.js scripts/pages/settings.js sw.js`
- Testes: `node test_mechanics.js && node test_form_matrix.js && node test_theme_nav.js && node test_dash_layout.js && node test_plan_settings_layout.js` + auditoria `python3 audit2.py`.
- Sem build ou lint no repo. Lógica pura roda em Node com mocks mínimos de `localStorage`/`document`/`window` (o top-level dos JS só lê `localStorage` e registra listeners).

## Regras críticas (não quebrar)

1. **Nunca renomear os valores de `STORAGE_KEYS`** (`mr_tasks`, `mr_appSettings`, `mr_dailyTaskLogs`, `mr_name`, `mr_theme`, `mr_timeblocks`, `mr_dailyReset`) — quebra dados de usuários existentes.
2. **Backup sempre `v3`** (`{app, version: 3, exportedAt, data}`) — manter import compatível.
3. **Modelo da tarefa**: `{id, text, datetime ('' = sem hora), repeatDaily, done, created, completedAt?}`. Não adicionar campos obrigatórios sem fallback.
4. **UI sempre em PT-BR.** Código e comentários no idioma do arquivo tocado.
5. **Sem frameworks.** Vanilla + utilitários Tailwind inline + Lucide via `data-lucide`.
6. **Sem `onclick=`/`onchange=` inline** — delegação `data-action` por página (`shell.js`: `handleShellClick`/`handleOverlayClick`/`handleShellKeydown`; cada página tem seu handler + init próprios).
7. **Mobile (≤768px)**: o dock inferior é a única navegação; sem hamburger, sem topbar. Não alterar o layout desktop ao mexer no mobile.

## Lógica de tarefas (4 combinações)

Duas flags independentes (`Sem hora` + `Diária`):

| Tipo | `datetime` | `repeatDaily` | Bloco? | Label |
|------|------------|---------------|--------|-------|
| Pontual com hora | `YYYY-MM-DDTHH:MM` | `false` | não | `Pontual` |
| Diária com hora | hora de hoje (só HH:MM importa) | `true` | não | `Diária` |
| Sem hora pontual | `''` | `false` | sim | `Sem hora` |
| Diária sem hora | `''` | `true` | sim | `Diária sem hora` |

- Fonte única em `tasks.js`: `getTaskFormFlags`, `readTaskForm`, `fillTaskForm`, `syncTaskFormState`, `isValidDateTimeInput`, `withTodayDate`. Criar (`addTask`) e editar (`editTask`/`saveEditTask`) usam os mesmos helpers — não duplicar.
- `isTaskPeriodAssignable(task)` = tarefa sem `datetime` (pontual ou diária).
- Reset **manual** zera tarefas e blocos; reset **automático** (virada do dia) preserva blocos de diárias sem hora.
- `clearDoneTasks` nunca apaga diárias (só reabre).
- Modelos (`PRESET_ROUTINES`): item `{text, block?, daily?, time?}` (`time: 'HH:MM'` = diária com hora); dedupe por texto+modo (`presetItemKey`).

## Convenções

- Funções **globais** (scripts em ordem no HTML, sem módulos). Não converter para ES modules sem atualizar `index.html` + `sw.js`.
- Todo texto do usuário passa por `escapeHtml` (XSS). Toasts via `showToast`, confirmações via `showConfirm`.
- CSS: usar variáveis existentes; estilos mobile só dentro do `@media` atual; não deixar classes mortas.
- A cada mudança em asset cacheado, bump em `ASSET_VERSION` no `sw.js`.
