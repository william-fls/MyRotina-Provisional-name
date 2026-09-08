# Minha Rotina

Planejador diário simples no navegador. PWA com dados locais — sem conta, sem backend.

## O que o app faz

- **Hoje** — visão compacta do dia: período atual, tarefas pendentes e recorrentes
- **Planejar** — criar, editar e concluir tarefas; tarefas que repetem todo dia; blocos de tempo (Manhã, Tarde, Noite, Madrugada)
- **Ajustes** — nome, tema e backup (exportar/importar JSON)

Dados ficam no `localStorage` do navegador. Nada sai da máquina.

## Como rodar

1. Clone o repositório
2. Sirva a pasta com um servidor local (`file://` quebra PWA): `npx serve .`
3. Abra `index.html` no navegador
4. No primeiro acesso, defina seu nome

## Stack

- HTML5, CSS e JavaScript no cliente (sem framework)
- Tailwind CSS via CDN
- Lucide Icons
- Service worker (`sw.js`) e `manifest.webmanifest` para offline e instalação

## Estrutura

```
index.html          (Hoje)
planejar.html       (Planejar)
ajustes.html        (Ajustes)
style.css
sw.js
manifest.webmanifest
scripts/core/
  theme.js
  store.js          (estado, storage, backup — todas as páginas)
  shell.js          (modais, nome, SW, eventos globais)
scripts/pages/
  dashboard.js      (só Hoje)
  tasks.js          (só Planejar)
  settings.js       (só Ajustes)
icons/              (SVG + PNG 192/512 + maskable)
test_*.js, audit2.py (testes Node + auditoria)
```

## Instalação no celular (PWA)

1. Sirva a pasta via **HTTPS** (ou `localhost`): `npx serve .`
2. Abra no Chrome do Android → menu ⋮ → **"Adicionar à tela inicial"** / **"Instalar app"**.
3. No iPhone (Safari): Compartilhar → **"Adicionar à Tela de Início"**.


