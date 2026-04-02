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
        if (!response.ok) throw new Error('API recusou o acesso. Verifique sua chave.');
        const data = await response.json();
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
    // ROTINA AI LOGIC
    // =============================================
    function sendAIMessage(text, sender = 'user') {
      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      const wrapper = document.createElement('div');
      
      if (sender === 'user') {
         wrapper.style.cssText = "display:flex; gap:12px; align-items:flex-end; max-width:90%; align-self:flex-end; flex-direction:row-reverse;";
         wrapper.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;background:var(--surface3);display:flex;align-items:center;justify-content:center;color:var(--text);font-size:14px;flex-shrink:0">??</div>
            <div class="ai-msg user-msg">${text}</div>
         `;
      } else {
         wrapper.style.cssText = "display:flex; gap:12px; align-items:flex-end; max-width:90%; align-self:flex-start;";
         wrapper.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;box-shadow:0 4px 10px rgba(var(--accent-rgb),0.3)">?</div>
            <div class="ai-msg bot-msg">${text}</div>
         `;
      }
      
      chat.appendChild(wrapper);
      chat.scrollTop = chat.scrollHeight;
    }

    // Histórico de conversa da IA
    let aiChatHistory = load(STORAGE_KEYS.aiChatHistory, []);

    function renderAIChatHistory() {
      const chat = document.getElementById('ai-chat-history');
      if (!chat) return;
      
      const firstChild = chat.firstElementChild;
      chat.innerHTML = '';
      if (firstChild) chat.appendChild(firstChild);
      
      aiChatHistory.forEach(msg => {
        const text = msg.parts[0].text;
        if (msg.role === 'user') {
          sendAIMessage(text, 'user');
        } else {
          const aiResp = parseAiJson(text) || { message: text, actions: [] };
          sendAIMessage(aiResp.message || 'Pronto!', 'bot');
        }
      });
    }

    function clearAIChatHistory() {
       showConfirm('Limpar conversa?', 'Isso apagará o histórico da IA e resetará o contexto da conversa. As suas tarefas não serão afetadas.', () => {
          aiChatHistory = [];
          save(STORAGE_KEYS.aiChatHistory, aiChatHistory);
          renderAIChatHistory();
       });
    }

    function executeAIActions(actions) {
      if (!actions || !Array.isArray(actions)) return [];
      const log = [];
      const today = todayKey();
      let aiMutationCount = 0;

      actions.forEach(action => {
        switch (action.type) {

          case 'create': {
            const t = {
              id: uid(),
              text: action.text,
              priority: action.priority || 'med',
              datetime: getDefaultTaskDateTime(),
              repeatDaily: action.repeatDaily || false,
              hasExercise: false,
              createdByAI: true,
              done: false,
              created: new Date().toISOString()
            };
            tasks.unshift(t);
            aiMutationCount += 1;
            log.push(`? Criada: <b>${action.text}</b>`);
            break;
          }

          case 'delete': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match) clearTaskCompletion(t.id, today);
              return !match;
            });
            const removed = before - tasks.length;
            if (removed > 0) log.push(`??? Removida: <b>${action.text || action.id}</b>`);
            break;
          }

          case 'complete': {
            tasks.forEach(t => {
              const match = (action.id && t.id === action.id) ||
                            (action.text && t.text.toLowerCase().includes(action.text.toLowerCase()));
              if (match && !t.done) {
                t.done = true;
                t.completedAt = new Date().toISOString();
                recordTaskCompletion(t.id, today, t.completedAt);
                if (!Array.isArray(rewardLedger.tasks[today])) rewardLedger.tasks[today] = [];
                if (!rewardLedger.tasks[today].includes(t.id)) {
                  rewardLedger.tasks[today].push(t.id);
                  grantXp(getTaskXp(t), `Tarefa concluída: ${t.text}`);
                }
                log.push(`? Concluída: <b>${t.text}</b>`);
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
                clearTaskCompletion(t.id, today);
                log.push(`?? Desmarcada: <b>${t.text}</b>`);
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
                if (action.priority)    t.priority    = action.priority;
                if (action.repeatDaily !== undefined) t.repeatDaily = action.repeatDaily;
                aiMutationCount += 1;
                log.push(`?? Editada: <b>${old}</b> ? <b>${t.text}</b>`);
              }
            });
            break;
          }

          case 'clear_done': {
            const before = tasks.length;
            tasks = tasks.filter(t => {
              if (t.done) clearTaskCompletion(t.id, today);
              return !t.done;
            });
            const removed = before - tasks.length;
            if (removed > 0) log.push(`?? ${removed} tarefa(s) concluída(s) removida(s)`);
            break;
          }
        }
      });

      if (log.length > 0) {
        if (aiMutationCount > 0) recordAiAction(aiMutationCount, today);
        save(STORAGE_KEYS.tasks, tasks);
        save(STORAGE_KEYS.rewardLedger, rewardLedger);
        updateTodayTaskStats();
        recalcActivityStreak();
        persistDaySnapshot(today);
        checkMissionRewards();
        evaluateAchievements();
        refreshUI();
      }
      return log;
    }

    async function processAIInput() {
      const input = document.getElementById('ai-input');
      const text = input.value.trim();
      if (!text) return;

      const config = getActiveAiConfig();
      const configError = getAiConfigError(config);
      if (configError) {
        sendAIMessage(`<b>${configError}</b><br><br>?? Clique em ?? na aba IA.`, 'bot');
        return;
      }

      sendAIMessage(text, 'user');
      input.value = '';

      // Histórico multi-turno
      aiChatHistory.push({ role: 'user', parts: [{ text }] });
      if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
      save(STORAGE_KEYS.aiChatHistory, aiChatHistory);

      const chat = document.getElementById('ai-chat-history');
      const typingId = 'typing-' + Date.now();
      const typingEl = document.createElement('div');
      typingEl.id = typingId;
      typingEl.style.cssText = 'display:flex;gap:12px;align-items:flex-end;max-width:90%;align-self:flex-start;';
      typingEl.innerHTML = `
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;box-shadow:0 4px 10px rgba(var(--accent-rgb),0.3)">?</div>
        <div class="ai-msg bot-msg" style="opacity:0.6;font-style:italic">Pensando...</div>
      `;
      chat.appendChild(typingEl);
      chat.scrollTop = chat.scrollHeight;

      try {
        // Snapshot das tarefas atuais para contexto
        const userName = (load(STORAGE_KEYS.name, '') || 'usuário').trim();
        const today = todayKey();
        const taskList = tasks.map(t =>
          `[id:${t.id}] "${t.text}" | prioridade:${t.priority} | diária:${t.repeatDaily} | concluída:${t.done}`
        ).join('\n') || 'Nenhuma tarefa cadastrada.';

        const sysPrompt = `Você é a Rotina A.I., assistente de produtividade integrado ao app "Minha Rotina" do usuário ${userName}.
Você pode LER e MODIFICAR as tarefas do app diretamente. Responda em português, de forma amigável (use HTML básico: <b>, <br>, <em>).

TAREFAS ATUAIS DO USUÁRIO (data: ${today}):
${taskList}

AÇÕES DISPONÍVEIS — retorne um array "actions" com objetos:
- Criar tarefa:    {"type":"create",    "text":"nome",  "priority":"high|med|low", "repeatDaily":false}
- Deletar tarefa:  {"type":"delete",    "text":"trecho do nome ou id exato"}
- Concluir:        {"type":"complete",  "text":"trecho do nome"}
- Desmarcar:       {"type":"uncomplete","text":"trecho do nome"}
- Editar:          {"type":"edit",      "text":"trecho atual", "newText":"novo nome", "priority":"med", "repeatDaily":false}
- Limpar feitas:   {"type":"clear_done"}

REGRAS:
- Use "text" para identificar tarefas pelo nome (busca parcial, case-insensitive)
- Só execute ações que o usuário pediu explicitamente ou que fazem sentido no contexto
- Se o usuário só conversa, retorne actions:[]
- NÃO invente IDs — use sempre "text" para identificar

MANDATÓRIO: retorne JSON puro sem crases:
{"message":"sua resposta em html","actions":[...]}`;

        const rawResult = await requestAiJson({ systemPrompt: sysPrompt, history: aiChatHistory });

        document.getElementById(typingId)?.remove();

        const parsed = parseAiJson(rawResult);
        const aiResp = parsed || { message: rawResult, actions: [] };

        // Adiciona resposta ao histórico
        aiChatHistory.push({ role: 'model', parts: [{ text: rawResult }] });
        save(STORAGE_KEYS.aiChatHistory, aiChatHistory);

        let msg = aiResp.message || 'Aqui está sua resposta.';
        if (aiResp.actions && aiResp.actions.length > 0) {
           const actionsStr = JSON.stringify(aiResp.actions).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
           msg += `<br><br><div style="margin-top:12px">
             <button class="btn btn-primary w-full p-2 text-sm" onclick="applyAIActions('${actionsStr}', this)">? Aplicar no app</button>
           </div>`;
        }

        sendAIMessage(msg, 'bot');

      } catch (err) {
        document.getElementById(typingId)?.remove();
        sendAIMessage(`<b>Erro:</b> ${err.message}`, 'bot');
      }
    }

    window.applyAIActions = function(actionsStr, btn) {
      try {
        const actions = JSON.parse(actionsStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        const actionLog = executeAIActions(actions);
        btn.disabled = true;
        btn.textContent = 'Ações aplicadas ?';
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
        showConfirm('Cérebros conectados! ??', `Sua chave do ${meta.label} foi salva localmente. A IA agora tem acesso total à sua rotina!`);
      } else {
        showToast('Chave removida', `A conexão com ${meta.label} foi removida.`, 'warn');
      }
    }


    // Exercise Detail Modal
    let _detailEx = null; // current exercise shown in detail modal


