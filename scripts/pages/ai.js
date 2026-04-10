function getAiProviderMeta(providerId) {
      return AI_PROVIDER_META[providerId] || AI_PROVIDER_META.gemini;
    }

    function getActiveAiConfig() {
      const provider = AI_PROVIDER_META[aiSettings?.provider] ? aiSettings.provider : DEFAULT_AI_SETTINGS.provider;
      const meta = getAiProviderMeta(provider);
      const stored = aiSettings?.providers?.[provider] || {};
      return {
        id: provider,
        label: meta.label,
        type: meta.type,
        key: (stored.key || '').trim(),
        model: (stored.model || meta.defaultModel || '').trim(),
        baseUrl: (stored.baseUrl || meta.baseUrl || '').trim(),
        supportsJsonMode: Boolean(meta.supportsJsonMode),
        showBaseUrl: Boolean(meta.showBaseUrl),
      };
    }

    function getAiConfigError(config) {
      if (!config.key) return `Configure a chave de API do ${config.label}.`;
      if (config.type !== 'gemini' && !config.model) return `Informe o modelo do ${config.label}.`;
      if (config.type !== 'gemini' && !config.baseUrl) return 'Informe o endpoint/base URL do provedor.';
      return '';
    }

    function syncAiProviderLabels() {
      const cfg = getActiveAiConfig();
      const aiLabel = document.getElementById('ai-provider-name');
      if (aiLabel) aiLabel.textContent = cfg.label;
      const settingsLabel = document.getElementById('settings-ai-provider');
      if (settingsLabel) settingsLabel.textContent = cfg.label;
    }

    function updateAiSettingsForm(providerId) {
      const provider = providerId || DEFAULT_AI_SETTINGS.provider;
      const meta = getAiProviderMeta(provider);
      const stored = aiSettings?.providers?.[provider] || {};

      const keyLabel = document.getElementById('ai-key-label');
      const keyInput = document.getElementById('ai-api-key');
      const modelInput = document.getElementById('ai-model');
      const modelNote = document.getElementById('ai-model-note');
      const baseGroup = document.getElementById('ai-base-url-group');
      const baseInput = document.getElementById('ai-base-url');
      const baseNote = document.getElementById('ai-base-url-note');

      if (keyLabel) keyLabel.textContent = meta.keyLabel || 'Chave da API';
      if (keyInput) {
        keyInput.placeholder = meta.keyPlaceholder || '';
        keyInput.value = stored.key || '';
      }
      if (modelInput) {
        modelInput.placeholder = meta.modelPlaceholder || '';
        modelInput.value = stored.model || meta.defaultModel || '';
      }
      if (modelNote) {
        modelNote.textContent = meta.defaultModel
          ? `Sugestão: ${meta.defaultModel}`
          : 'Informe o modelo fornecido pelo provedor.';
      }
      if (baseInput) {
        baseInput.placeholder = meta.baseUrl || '';
        baseInput.value = stored.baseUrl || meta.baseUrl || '';
      }
      if (baseGroup) baseGroup.style.display = meta.showBaseUrl ? 'block' : 'none';
      if (baseNote) {
        baseNote.textContent = meta.showBaseUrl
          ? 'Use um proxy se o provedor bloquear chamadas diretas do navegador.'
          : '';
      }
    }

    function hydrateAiSettingsModal() {
      const select = document.getElementById('ai-provider-select');
      if (select) select.value = aiSettings?.provider || DEFAULT_AI_SETTINGS.provider;
      updateAiSettingsForm(select?.value || DEFAULT_AI_SETTINGS.provider);
    }

    function onAiProviderChange() {
      const select = document.getElementById('ai-provider-select');
      if (!select) return;
      updateAiSettingsForm(select.value);
    }

    function buildOpenAiMessages(systemPrompt, history, userPrompt) {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      if (Array.isArray(history) && history.length > 0) {
        history.forEach(msg => {
          const content = msg?.parts?.[0]?.text || '';
          if (!content) return;
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content,
          });
        });
      } else if (userPrompt) {
        messages.push({ role: 'user', content: userPrompt });
      }
      return messages;
    }

    function buildGeminiContents(history, userPrompt) {
      if (Array.isArray(history) && history.length > 0) return history;
      return [{ role: 'user', parts: [{ text: userPrompt || '' }] }];
    }

    function parseAiJson(rawText) {
      if (!rawText) return null;
      try {
        return JSON.parse(rawText.replace(/```json|```/g, '').trim());
      } catch {
        return null;
      }
    }

    async function requestAiJson({ systemPrompt = '', history = null, userPrompt = '' }) {
      const config = getActiveAiConfig();
      const error = getAiConfigError(config);
      if (error) throw new Error(error);

      if (config.type === 'gemini') {
        const base = config.baseUrl.replace(/\/+$/, '');
        const url = `${base}/v1beta/models/${config.model}:generateContent?key=${config.key}`;
        const payload = {
          contents: buildGeminiContents(history, userPrompt),
          generationConfig: { responseMimeType: 'application/json' },
        };
        if (systemPrompt) payload.system_instruction = { parts: [{ text: systemPrompt }] };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        let data = {};
        try { data = await response.json(); } catch { }
        if (!response.ok) {
          const msg = data?.error?.message || 'API recusou o acesso. Verifique sua chave.';
          throw new Error(msg);
        }
        const rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawResult) throw new Error('Resposta em branco da IA.');
        return rawResult;
      }

      const base = config.baseUrl.replace(/\/+$/, '');
      const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
      const payload = {
        model: config.model,
        messages: buildOpenAiMessages(systemPrompt, history, userPrompt),
        temperature: 0.2,
      };
      if (config.supportsJsonMode) payload.response_format = { type: 'json_object' };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key}`,
        },
        body: JSON.stringify(payload),
      });
      let data = {};
      try { data = await response.json(); } catch { }
      if (!response.ok) {
        const msg = data?.error?.message || 'Erro na API.';
        throw new Error(msg);
      }
      const rawResult = data.choices?.[0]?.message?.content;
      if (!rawResult) throw new Error('Resposta em branco da IA.');
      return rawResult;
    }

    // =============================================
    // ASSISTENTE LOGIC
    // =============================================
    function getAiIntroMarkup() {
      return `
        <div class="ai-message-row bot">
          <div class="ai-avatar bot">AI</div>
          <div class="ai-bubble bot">
            <div class="ai-bubble-label">Assistente</div>
            Olá! Posso <b>criar, editar, deletar e concluir tarefas</b> com base no que você pedir.<br><br>
            Tente algo como <em>"organize minha manhã"</em>, <em>"limpe as concluídas"</em> ou <em>"crie uma rotina de estudos"</em>.
          </div>
        </div>
      `;
    }

    function createAiMessageElement(text, sender = 'user', extraClass = '') {
      const wrapper = document.createElement('div');
      const safeUserText = escapeHtml(text || '').replace(/\n/g, '<br>');
      const messageContent = sender === 'user' ? safeUserText : (text || '');
      wrapper.className = `ai-message-row ${sender} ${extraClass}`.trim();
      wrapper.innerHTML = `
        <div class="ai-avatar ${sender}">${sender === 'user' ? 'VO' : 'AI'}</div>
        <div class="ai-bubble ${sender}">
          ${sender === 'bot' ? '<div class="ai-bubble-label">Assistente</div>' : ''}
          ${messageContent}
        </div>
      `;
      return wrapper;
    }

    function scrollAiToEnd() {
      const chat = document.getElementById('ai-chat-history');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }

    function setAiPrompt(text, submit = false) {
      const input = document.getElementById('ai-input');
      if (!input) return;
      input.value = text;
      input.focus();
      if (submit) processAIInput();
    }

    function buildApplyActionsButtonHTML(actions, label = 'Aplicar no app') {
      if (!Array.isArray(actions) || actions.length === 0) return '';
      const actionsStr = JSON.stringify(actions).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      return `<button class="btn btn-primary w-full p-2 text-sm" onclick="applyAIActions('${actionsStr}', this)">${escapeHtml(label)}</button>`;
    }

    function sendAIMessage(text, sender = 'user') {
      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      chat.appendChild(createAiMessageElement(text, sender));
      scrollAiToEnd();
    }

    // Histórico de conversa do Assistente
    let aiChatHistory = [];
    let aiHistoryReady = false;
    let aiRequestInFlight = false;
    let taskAssistantOpen = false;

    function ensureAiHistoryReady() {
      if (aiHistoryReady) return;
      if (typeof load === 'function' && typeof STORAGE_KEYS === 'object' && STORAGE_KEYS.aiChatHistory) {
        const stored = load(STORAGE_KEYS.aiChatHistory, []);
        aiChatHistory = Array.isArray(stored) ? stored : [];
      } else {
        aiChatHistory = [];
      }
      aiHistoryReady = true;
    }

    function persistAiHistory() {
      if (typeof save === 'function' && typeof STORAGE_KEYS === 'object' && STORAGE_KEYS.aiChatHistory) {
        save(STORAGE_KEYS.aiChatHistory, aiChatHistory);
      }
    }

    function syncAiScrollMode(forceScrollable = null) {
      const page = document.getElementById('page-ai');
      const chatCard = page?.querySelector('.ai-chat-card');
      if (!page || !chatCard) return;
      const clearBtn = document.getElementById('ai-clear-btn');
      const shouldScroll = typeof forceScrollable === 'boolean'
        ? forceScrollable
        : (Array.isArray(aiChatHistory) && aiChatHistory.length > 0);
      page.classList.toggle('ai-has-messages', shouldScroll);
      chatCard.classList.toggle('is-scrollable', shouldScroll);
      if (clearBtn) clearBtn.hidden = !shouldScroll;
      if (!shouldScroll) {
        const chat = document.getElementById('ai-chat-history');
        if (chat) chat.scrollTop = 0;
      }
    }

    function setTaskAssistantPanelOpen(isOpen, { focusInput = true } = {}) {
      const card = document.getElementById('task-assistant-card');
      const form = document.getElementById('task-assistant-form');
      const toggleBtn = document.getElementById('task-assistant-toggle-btn');
      if (!card || !form || !toggleBtn) return;

      taskAssistantOpen = Boolean(isOpen);
      card.dataset.open = taskAssistantOpen ? 'true' : 'false';
      form.hidden = !taskAssistantOpen;
      toggleBtn.innerHTML = taskAssistantOpen
        ? '<i data-lucide="chevron-up" style="width:16px;height:16px"></i><span>Ocultar gerador</span>'
        : '<i data-lucide="sparkles" style="width:16px;height:16px"></i><span>Gerar minha rotina</span>';

      if (taskAssistantOpen && focusInput) {
        document.getElementById('task-assistant-day-input')?.focus();
      }
      lucide.createIcons();
    }

    function toggleTaskAssistantPanel(forceState) {
      if (typeof forceState === 'boolean') {
        setTaskAssistantPanelOpen(forceState);
        return;
      }
      setTaskAssistantPanelOpen(!taskAssistantOpen);
    }

    function bindTaskAssistantActions() {
      const toggleBtn = document.getElementById('task-assistant-toggle-btn');
      if (toggleBtn && !toggleBtn.dataset.boundClick) {
        toggleBtn.addEventListener('click', () => toggleTaskAssistantPanel());
        toggleBtn.dataset.boundClick = 'true';
      }

      const generateBtn = document.getElementById('task-assistant-generate-btn');
      if (generateBtn && !generateBtn.dataset.boundClick) {
        generateBtn.addEventListener('click', () => generateRoutineFromDescription());
        generateBtn.dataset.boundClick = 'true';
      }

      const voiceBtn = document.getElementById('task-assistant-voice-btn');
      if (voiceBtn && !voiceBtn.dataset.boundClick) {
        voiceBtn.addEventListener('click', () => toggleRoutineVoiceInput(voiceBtn));
        voiceBtn.dataset.boundClick = 'true';
      }

      const openChatBtn = document.getElementById('task-assistant-open-chat-btn');
      if (openChatBtn && !openChatBtn.dataset.boundClick) {
        openChatBtn.addEventListener('click', () => openAssistantPageWithPrompt());
        openChatBtn.dataset.boundClick = 'true';
      }
    }

    function initTaskAssistantPanel() {
      bindTaskAssistantActions();
      setTaskAssistantPanelOpen(false, { focusInput: false });
    }

    window.toggleTaskAssistantPanel = toggleTaskAssistantPanel;
    window.generateRoutineFromDescription = generateRoutineFromDescription;
    window.toggleRoutineVoiceInput = toggleRoutineVoiceInput;
    window.openAssistantPageWithPrompt = openAssistantPageWithPrompt;

    function normalizeAiHistoryEntry(entry) {
      if (!entry || typeof entry !== 'object') return null;
      const role = entry.role === 'user' ? 'user' : 'model';
      const text = typeof entry?.parts?.[0]?.text === 'string'
        ? entry.parts[0].text
        : typeof entry.content === 'string'
          ? entry.content
          : '';
      if (!text.trim()) return null;
      return { role, parts: [{ text: text.trim() }] };
    }

    function normalizeAiHistoryStorage() {
      ensureAiHistoryReady();
      const normalized = Array.isArray(aiChatHistory)
        ? aiChatHistory.map(normalizeAiHistoryEntry).filter(Boolean)
        : [];
      aiChatHistory = normalized.slice(-20);
      persistAiHistory();
    }

    function renderAIChatHistory() {
      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      normalizeAiHistoryStorage();
      syncAiScrollMode(aiChatHistory.length > 0);
      chat.innerHTML = getAiIntroMarkup();

      aiChatHistory.forEach(msg => {
        const text = msg?.parts?.[0]?.text || '';
        if (!text) return;
        if (msg.role === 'user') {
          sendAIMessage(text, 'user');
        } else {
          const aiResp = parseAiJson(text) || { message: text, actions: [] };
          sendAIMessage(aiResp.message || 'Pronto!', 'bot');
        }
      });
    }

    function clearAIChatHistory() {
       ensureAiHistoryReady();
       showConfirm('Limpar conversa?', 'Isso apagará o histórico do Assistente e resetará o contexto da conversa. As suas tarefas não serão afetadas.', () => {
          aiChatHistory = [];
          persistAiHistory();
          renderAIChatHistory();
       });
    }

    function normalizeTaskPeriod(rawPeriod) {
      const value = typeof rawPeriod === 'string' ? rawPeriod.trim().toLowerCase() : '';
      const map = {
        morning: 'morning',
        manha: 'morning',
        afternoon: 'afternoon',
        tarde: 'afternoon',
        evening: 'evening',
        noite: 'evening',
        night: 'night',
        madrugada: 'night',
      };
      return map[value] || '';
    }

    function executeAIActions(actions) {
      if (!actions || !Array.isArray(actions)) return [];
      const log = [];
      const today = todayKey();
      let blocksTouched = false;

      actions.forEach(action => {
        switch (action.type) {

          case 'create': {
            if (!action?.text || !String(action.text).trim()) break;
            const normalizedPeriod = normalizeTaskPeriod(action.period || action.block);
            const t = {
              id: uid(),
              text: String(action.text).trim().slice(0, 120),
              datetime: normalizedPeriod ? '' : getDefaultTaskDateTime(),
              repeatDaily: normalizedPeriod ? false : Boolean(action.repeatDaily),
              createdByAI: true,
              done: false,
              created: new Date().toISOString()
            };
            if (t.repeatDaily) t.datetime = getTaskEffectiveDateTime(t);
            tasks.unshift(t);
            if (normalizedPeriod && typeof applyTaskBlockSelection === 'function') {
              applyTaskBlockSelection(t.id, normalizedPeriod);
              blocksTouched = true;
            }
            log.push(`Criada: <b>${t.text}</b>`);
            break;
          }

          case 'delete': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match) {
                if (typeof removeTaskFromAllBlocks === 'function') {
                  removeTaskFromAllBlocks(t.id);
                  blocksTouched = true;
                }
              }
              return !match;
            });
            const removed = before - tasks.length;
            if (removed > 0) log.push(`Removida: <b>${action.text || action.id}</b>`);
            break;
          }

          case 'complete': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match && !t.done) {
                t.done = true;
                t.completedAt = new Date().toISOString();
                if (t.repeatDaily) {
                  if (!dailyTaskLogs[today]) dailyTaskLogs[today] = [];
                  if (!dailyTaskLogs[today].includes(t.id)) dailyTaskLogs[today].push(t.id);
                }
                log.push(`Concluída: <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'uncomplete': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match && t.done) {
                t.done = false;
                t.completedAt = '';
                if (t.repeatDaily) {
                  dailyTaskLogs[today] = (dailyTaskLogs[today] || []).filter(taskId => taskId !== t.id);
                }
                log.push(`Desmarcada: <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'edit': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match) {
                const old = t.text;
                if (action.newText)     t.text        = action.newText;
                if (action.repeatDaily !== undefined) t.repeatDaily = action.repeatDaily;
                log.push(`Editada: <b>${old}</b> -> <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'clear_done': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              if (t.done) {
                if (typeof removeTaskFromAllBlocks === 'function') {
                  removeTaskFromAllBlocks(t.id);
                  blocksTouched = true;
                }
              }
              return !t.done;
            });
            const removed = before - tasks.length;
            if (removed > 0) log.push(`${removed} tarefa(s) concluída(s) removida(s)`);
            break;
          }
        }
      });

      if (log.length > 0) {
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.dailyTaskLogs, dailyTaskLogs);
        if (blocksTouched) {
          save(STORAGE_KEYS.timeblocks, timeblocks);
          save(STORAGE_KEYS.timeblockHistory, timeblockHistory);
        }
        updateTodayTaskStats();
        refreshUI();
      }
      return log;
    }

    async function processAIInput() {
      ensureAiHistoryReady();
      const input = document.getElementById('ai-input');
      const sendBtn = document.getElementById('ai-send-btn');
      const text = input.value.trim();
      if (!text) return;
      syncAiScrollMode(true);
      if (aiRequestInFlight) {
        showToast('O Assistente ainda está respondendo', 'Aguarde a mensagem atual terminar.', 'warn');
        return;
      }

      const config = getActiveAiConfig();
      const configError = getAiConfigError(config);
      if (configError) {
        sendAIMessage(`<b>${configError}</b><br><br>Abra "Configurar" para conectar seu Assistente.`, 'bot');
        return;
      }

      sendAIMessage(text, 'user');
      input.value = '';

      // Histórico multi-turno
      aiChatHistory.push({ role: 'user', parts: [{ text }] });
      if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
      persistAiHistory();

      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      const typingId = 'typing-' + Date.now();
      const typingEl = createAiMessageElement('<em>Pensando...</em>', 'bot', 'typing');
      typingEl.id = typingId;
      chat.appendChild(typingEl);
      scrollAiToEnd();
      aiRequestInFlight = true;
      if (sendBtn) sendBtn.disabled = true;

      try {
        // Snapshot das tarefas atuais para contexto
        const userName = (load(STORAGE_KEYS.name, '') || 'usuário').trim();
        const today = todayKey();
        const taskList = tasks.map(t =>
          `[id:${t.id}] "${t.text}" | diária:${t.repeatDaily} | concluída:${t.done}`
        ).join('\n') || 'Nenhuma tarefa cadastrada.';

        const sysPrompt = `Você é o Assistente, assistente de produtividade integrado ao app "Minha Rotina" do usuário ${userName}.
Você pode LER e MODIFICAR as tarefas do app diretamente. Responda em português, de forma amigável (use HTML básico: <b>, <br>, <em>).

TAREFAS ATUAIS DO USUÁRIO (data: ${today}):
${taskList}

AÇÕES DISPONÍVEIS — retorne um array "actions" com objetos:
- Criar tarefa:    {"type":"create",    "text":"nome",  "repeatDaily":false}
- Deletar tarefa:  {"type":"delete",    "text":"trecho do nome ou id exato"}
- Concluir:        {"type":"complete",  "text":"trecho do nome"}
- Desmarcar:       {"type":"uncomplete","text":"trecho do nome"}
- Editar:          {"type":"edit",      "text":"trecho atual", "newText":"novo nome", "repeatDaily":false}
- Limpar feitas:   {"type":"clear_done"}

REGRAS:
- Use "text" para identificar tarefas pelo nome (busca parcial, case-insensitive)
- Só execute ações que o usuário pediu explicitamente ou que fazem sentido no contexto
- Se o usuário só conversa, retorne actions:[]
- NÃO invente IDs — use sempre "text" para identificar

MANDATÓRIO: retorne JSON puro sem crases:
{"message":"sua resposta em html","actions":[...]}`;

        const rawResult = await requestAiJson({ systemPrompt: sysPrompt, history: aiChatHistory, userPrompt: text });

        document.getElementById(typingId)?.remove();

        const parsed = parseAiJson(rawResult);
        const aiResp = parsed || { message: rawResult, actions: [] };

        // Adiciona resposta ao histórico
        aiChatHistory.push({ role: 'model', parts: [{ text: rawResult }] });
        persistAiHistory();

        let msg = aiResp.message || 'Aqui está sua resposta.';
        if (aiResp.actions && aiResp.actions.length > 0) {
           msg += `<br><br><div style="margin-top:12px">${buildApplyActionsButtonHTML(aiResp.actions, 'Aplicar no app')}</div>`;
        }

        sendAIMessage(msg, 'bot');

      } catch (err) {
        document.getElementById(typingId)?.remove();
        sendAIMessage(`<b>Erro:</b> ${err.message}`, 'bot');
      } finally {
        aiRequestInFlight = false;
        if (sendBtn) sendBtn.disabled = false;
      }
    }

    function openAssistantPageWithPrompt(promptText = '') {
      const routineInput = document.getElementById('task-assistant-day-input');
      const baseText = (promptText || routineInput?.value || '').trim();
      navigate('ai');
      const composed = baseText
        ? `Monte uma rotina para hoje com base neste contexto: ${baseText}`
        : '';
      const input = document.getElementById('ai-input');
      if (!input) return;
      if (composed) input.value = composed;
      input.focus();
    }

    function setTaskAssistantResultState(html, tone = 'neutral') {
      const result = document.getElementById('task-assistant-result');
      if (!result) return;
      result.hidden = false;
      result.classList.remove('is-success', 'is-error');
      if (tone === 'success') result.classList.add('is-success');
      if (tone === 'error') result.classList.add('is-error');
      result.innerHTML = html || '';
    }

    function normalizeRoutineCreateActions(rawActions) {
      if (!Array.isArray(rawActions)) return [];
      return rawActions
        .filter(action => action && action.type === 'create' && typeof action.text === 'string' && action.text.trim())
        .slice(0, 12)
        .map(action => {
          const normalized = {
            type: 'create',
            text: action.text.trim().slice(0, 120),
            repeatDaily: Boolean(action.repeatDaily),
          };
          const period = normalizeTaskPeriod(action.period || action.block);
          if (period && !normalized.repeatDaily) normalized.period = period;
          return normalized;
        });
    }

    async function generateRoutineFromDescription() {
      ensureAiHistoryReady();
      const input = document.getElementById('task-assistant-day-input');
      const btn = document.getElementById('task-assistant-generate-btn');
      if (!input || !btn) return;

      const description = input.value.trim();
      if (!description) {
        setTaskAssistantResultState('Descreva seu dia para eu montar a rotina.', 'error');
        showToast('Descrição vazia', 'Escreva como será seu dia e tente novamente.', 'warn');
        return;
      }

      const config = getActiveAiConfig();
      const configError = getAiConfigError(config);
      if (configError) {
          setTaskAssistantResultState(`<b>${escapeHtml(configError)}</b><br>Abra as configurações para conectar o Assistente.`, 'error');
        return;
      }

      const previousLabel = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" style="width:16px;height:16px;animation:spin 1s linear infinite"></i> Gerando...';
      setTaskAssistantResultState('Gerando uma rotina inicial baseada no seu dia...', 'neutral');
      lucide.createIcons();

      try {
        const today = todayKey();
        const userName = (load(STORAGE_KEYS.name, '') || 'usuário').trim() || 'usuário';
        const existingTasks = tasks.slice(0, 80).map(t => {
          const status = t.done ? 'concluída' : 'pendente';
          const cadence = t.repeatDaily ? 'diária' : (t.datetime ? 'pontual' : 'sem_data');
          return `- ${t.text} | tipo:${cadence} | status:${status}`;
        }).join('\n') || '- Nenhuma tarefa cadastrada.';

        const sysPrompt = `Você é o Assistente de rotina do app "Minha Rotina", para o usuário ${userName}.
Objetivo: transformar a descrição livre do dia em um plano prático de tarefas.

Retorne JSON puro neste formato:
{"message":"resumo curto em html basico","actions":[{"type":"create","text":"...","repeatDaily":false,"period":"morning|afternoon|evening|night"}]}

Regras obrigatorias:
- Use somente actions do tipo "create".
- Crie entre 4 e 10 tarefas objetivas e acionáveis.
- Use "period" quando a tarefa não tiver horário fixo.
- Se houver horário claro na descrição, pode omitir period.
- Evite duplicar tarefas já existentes.
- Português do Brasil.`;

        const userPrompt = `Data: ${today}

Descrição do dia:
${description}

        Tarefas já existentes:
${existingTasks}`;

        const rawResult = await requestAiJson({ systemPrompt: sysPrompt, history: null, userPrompt });
        const parsed = parseAiJson(rawResult) || {};
        const message = typeof parsed.message === 'string' && parsed.message.trim()
          ? parsed.message.trim()
          : 'Montei uma sugestão inicial. Revise e aplique se fizer sentido.';
        const actions = normalizeRoutineCreateActions(parsed.actions);

        aiChatHistory.push({ role: 'user', parts: [{ text: `[Planejamento] ${description}` }] });
        aiChatHistory.push({ role: 'model', parts: [{ text: JSON.stringify({ message, actions }) }] });
        if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
        persistAiHistory();

        if (!actions.length) {
          setTaskAssistantResultState(`${message}<br><br><em>Nenhuma tarefa nova foi sugerida.</em>`, 'error');
          showToast('Sem sugestões', 'Ajuste a descrição para gerar uma rotina mais detalhada.', 'warn');
          return;
        }

        const applyButton = buildApplyActionsButtonHTML(actions, 'Aplicar rotina no app');
        setTaskAssistantResultState(`${message}<div style="margin-top:10px">${applyButton}</div>`, 'success');
        showToast('Rotina sugerida', `Foram sugeridas ${actions.length} tarefa(s).`, 'success');
      } catch (err) {
        setTaskAssistantResultState(`<b>Erro:</b> ${escapeHtml(err?.message || 'Falha ao gerar rotina.')}`, 'error');
        showToast('Falha na geração', err?.message || 'Não foi possível falar com o Assistente.', 'danger');
      } finally {
        btn.disabled = false;
        btn.innerHTML = previousLabel;
        lucide.createIcons();
      }
    }

    let routineVoiceRecognition = null;
    function toggleRoutineVoiceInput(btn) {
      const input = document.getElementById('task-assistant-day-input');
      if (!input) return;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('Ditado indisponível', 'Seu navegador não suporta ditado por voz.', 'warn');
        return;
      }

      if (routineVoiceRecognition) {
        routineVoiceRecognition.stop();
        return;
      }

      const recognition = new SpeechRecognition();
      routineVoiceRecognition = recognition;
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      const original = input.value.trim();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="square" style="width:16px;height:16px"></i> Parar ditado';
        lucide.createIcons();
      }

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
        if (!transcript) return;
        input.value = original ? `${original} ${transcript}` : transcript;
      };

      recognition.onerror = () => {
        showToast('Falha no ditado', 'Não foi possível capturar sua voz agora.', 'warn');
      };

      recognition.onend = () => {
        routineVoiceRecognition = null;
        if (btn) {
          btn.innerHTML = '<i data-lucide="mic" style="width:16px;height:16px"></i> Ditar';
          lucide.createIcons();
        }
      };

      try {
        recognition.start();
      } catch (error) {
        routineVoiceRecognition = null;
        if (btn) {
          btn.innerHTML = '<i data-lucide="mic" style="width:16px;height:16px"></i> Ditar';
          lucide.createIcons();
        }
        showToast('Falha no ditado', error?.message || 'Não foi possível iniciar o microfone.', 'warn');
      }
    }

    window.applyAIActions = function(actionsStr, btn) {
      try {
        const actions = JSON.parse(actionsStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        const actionLog = executeAIActions(actions);
        btn.disabled = true;
        btn.textContent = 'Ações aplicadas';
        btn.classList.replace('btn-primary', 'btn-success');
        if (actionLog.length > 0) {
          const logDiv = document.createElement('div');
          logDiv.style.cssText = "font-size:12px;opacity:0.8;margin-top:8px;line-height:1.6";
          logDiv.innerHTML = actionLog.join('<br>');
          btn.parentNode.appendChild(logDiv);
        }
      } catch {
        showToast("Erro ao aplicar", "Não foi possível aplicar as alterações.", "danger");
      }
    };

    function openAiSettings() {
      hydrateAiSettingsModal();
      openModal('modal-ai-settings-inline');
    }

    function saveAiSettings() {
      aiSettings = normalizeAiSettings(aiSettings);
      const provider = document.getElementById('ai-provider-select')?.value || DEFAULT_AI_SETTINGS.provider;
      const meta = getAiProviderMeta(provider);
      const key = document.getElementById('ai-api-key')?.value.trim() || '';
      const modelInput = document.getElementById('ai-model')?.value.trim();
      const baseInput = document.getElementById('ai-base-url')?.value.trim();

      aiSettings.provider = provider;
      aiSettings.providers[provider] = {
        key,
        model: modelInput || meta.defaultModel || '',
        baseUrl: baseInput || meta.baseUrl || '',
      };
      save(STORAGE_KEYS.aiSettings, aiSettings);
      closeModal('modal-ai-settings-inline');
      syncAiProviderLabels();
      renderSettingsPage();
      renderAIChatHistory();

      if (key) {
        showConfirm('Assistente conectado!', `Sua chave do ${meta.label} foi salva localmente. O Assistente agora pode agir na sua rotina.`);
      } else {
        showToast('Chave removida', `A conexão com ${meta.label} foi removida.`, 'warn');
      }
    }


    // Exercise Detail Modal
    let _detailEx = null; // current exercise shown in detail modal


