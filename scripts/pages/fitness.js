    const FITNESS_ROUTINE_KEY = 'mr_fitnessRoutine';
    const FITNESS_SELECTABLE_LOGS_KEY = 'mr_fitnessSelectableLogs';
    const DEFAULT_FITNESS_ROUTINE = { mode: 'ai', presetId: 'essencial-3x' };
    const DAY_ALIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    const SELECTABLE_EXERCISES = [
      { id: 'sel-agachamento', name: 'Agachamento livre', sets: 3, reps: '12', rest: '45s', muscles: ['Quadriceps', 'Gluteos'], howTo: ['Afaste os pes na largura dos ombros.', 'Desca controlando o quadril para tras.', 'Suba empurrando o chao com os calcanhares.'], videoUrl: 'https://www.youtube.com/results?search_query=agachamento+livre+execucao+certa' },
      { id: 'sel-flexao', name: 'Flexao de braco', sets: 3, reps: '10', rest: '60s', muscles: ['Peitoral', 'Triceps'], howTo: ['Alinhe punhos abaixo dos ombros.', 'Mantenha o corpo reto durante todo o movimento.', 'Desca ate proximo do chao e retorne.'], videoUrl: 'https://www.youtube.com/results?search_query=flexao+de+braco+execucao+certa' },
      { id: 'sel-prancha', name: 'Prancha frontal', sets: 3, reps: '30s', rest: '45s', muscles: ['Core', 'Lombar'], howTo: ['Apoie antebracos e pontas dos pes.', 'Ative abdomen e gluteos.', 'Evite elevar ou afundar o quadril.'], videoUrl: 'https://www.youtube.com/results?search_query=prancha+frontal+execucao+certa' },
      { id: 'sel-afundo', name: 'Afundo alternado', sets: 3, reps: '10 por perna', rest: '60s', muscles: ['Quadriceps', 'Gluteos'], howTo: ['De um passo a frente.', 'Desca ate formar angulos proximos de 90 graus.', 'Suba e alterne a perna.'], videoUrl: 'https://www.youtube.com/results?search_query=afundo+alternado+execucao+certa' },
      { id: 'sel-polichinelo', name: 'Polichinelo', sets: 4, reps: '30s', rest: '30s', muscles: ['Cardio', 'Corpo inteiro'], howTo: ['Salte abrindo pernas e elevando bracos.', 'Retorne para a posicao inicial.', 'Mantenha ritmo constante.'], videoUrl: 'https://www.youtube.com/results?search_query=polichinelo+execucao+certa' },
      { id: 'sel-elevacao', name: 'Elevacao de joelhos', sets: 3, reps: '20', rest: '30s', muscles: ['Cardio', 'Core'], howTo: ['Corra parado elevando os joelhos.', 'Mantenha tronco firme.', 'Respire de forma ritmada.'], videoUrl: 'https://www.youtube.com/results?search_query=elevacao+de+joelhos+execucao+certa' },
    ];

    const FITNESS_PRESET_PLANS = [
      {
        id: 'essencial-3x',
        name: 'Essencial 3x',
        description: 'Treino equilibrado para manter constancia na semana.',
        weeklyPlan: [
          { day: 'Segunda', focus: 'Forca geral', rest: false, exercises: [
            { name: 'Agachamento livre', sets: 3, reps: '12', rest: '45s', muscles: ['Quadriceps', 'Gluteos'], howTo: ['Pes na largura dos ombros.', 'Desca com controle.', 'Suba contraindo gluteos.'], tip: 'Mantenha o peito aberto.' },
            { name: 'Flexao de braco', sets: 3, reps: '10', rest: '60s', muscles: ['Peitoral', 'Triceps'], howTo: ['Apoie as maos abaixo dos ombros.', 'Desca com cotovelos em diagonal.', 'Suba sem perder alinhamento.'], tip: 'Ative o abdomen durante todo o exercicio.' },
            { name: 'Prancha frontal', sets: 3, reps: '30s', rest: '45s', muscles: ['Core'], howTo: ['Apoie antebracos no chao.', 'Corpo alinhado da cabeca aos pes.', 'Segure o tempo indicado.'], tip: 'Respire pelo nariz para manter estabilidade.' },
          ]},
          { day: 'Terca', focus: 'Descanso', rest: true, exercises: [] },
          { day: 'Quarta', focus: 'Pernas e cardio', rest: false, exercises: [
            { name: 'Afundo alternado', sets: 3, reps: '10 por perna', rest: '60s', muscles: ['Quadriceps', 'Gluteos'], howTo: ['Passo a frente com tronco reto.', 'Desca ate 90 graus.', 'Suba e troque a perna.'], tip: 'Evite projetar o joelho da frente.' },
            { name: 'Polichinelo', sets: 4, reps: '30s', rest: '30s', muscles: ['Cardio'], howTo: ['Abra e feche pernas e bracos.', 'Mantenha ritmo constante.', 'Respeite o tempo de descanso.'], tip: 'Aterrisse suave para proteger joelhos.' },
          ]},
          { day: 'Quinta', focus: 'Descanso', rest: true, exercises: [] },
          { day: 'Sexta', focus: 'Core e postura', rest: false, exercises: [
            { name: 'Prancha frontal', sets: 4, reps: '30s', rest: '40s', muscles: ['Core'], howTo: ['Antebracos no chao.', 'Corpo alinhado.', 'Segure sem prender a respiracao.'], tip: 'Contraia gluteos para reduzir carga lombar.' },
            { name: 'Elevacao de joelhos', sets: 3, reps: '20', rest: '30s', muscles: ['Cardio', 'Core'], howTo: ['Corra parado com joelhos altos.', 'Mantenha tronco firme.', 'Controle a respiracao.'], tip: 'Suba os joelhos ate altura do quadril.' },
          ]},
          { day: 'Sabado', focus: 'Mobilidade leve', rest: false, exercises: [
            { name: 'Alongamento dinamico', sets: 2, reps: '8 min', rest: '30s', muscles: ['Mobilidade'], howTo: ['Mobilize ombros, quadril e tornozelos.', 'Mantenha movimentos suaves.', 'Finaliza com respiracao profunda.'], tip: 'Movimentos sem dor e sem pressa.' },
          ]},
          { day: 'Domingo', focus: 'Descanso', rest: true, exercises: [] },
        ],
        generalTips: ['Priorize regularidade acima de intensidade.', 'Mantenha pausas curtas para preservar ritmo.', 'Hidrate-se antes e depois do treino.'],
      },
      {
        id: 'condicionamento-5x',
        name: 'Condicionamento 5x',
        description: 'Maior frequencia para evolucao de resistencia.',
        weeklyPlan: [
          { day: 'Segunda', focus: 'Cardio base', rest: false, exercises: [
            { name: 'Polichinelo', sets: 5, reps: '35s', rest: '25s', muscles: ['Cardio'], howTo: ['Abra e feche pernas e bracos de forma ritmada.', 'Mantenha postura ereta.'], tip: 'Comece moderado e acelere no fim.' },
            { name: 'Prancha frontal', sets: 3, reps: '35s', rest: '40s', muscles: ['Core'], howTo: ['Apoie antebracos.', 'Mantenha corpo alinhado.', 'Respire com controle.'], tip: 'Nao deixe o quadril subir.' },
          ]},
          { day: 'Terca', focus: 'Membros inferiores', rest: false, exercises: [
            { name: 'Agachamento livre', sets: 4, reps: '12', rest: '45s', muscles: ['Quadriceps', 'Gluteos'], howTo: ['Pes firmes no chao.', 'Desca com controle.', 'Suba empurrando calcanhares.'], tip: 'Joelhos acompanham a ponta dos pes.' },
            { name: 'Afundo alternado', sets: 3, reps: '12 por perna', rest: '60s', muscles: ['Quadriceps', 'Gluteos'], howTo: ['Passo a frente.', 'Desca ate 90 graus.', 'Retorne e alterne.'], tip: 'Mantenha tronco neutro.' },
          ]},
          { day: 'Quarta', focus: 'Recuperacao ativa', rest: false, exercises: [
            { name: 'Caminhada acelerada', sets: 1, reps: '20 min', rest: '---', muscles: ['Cardio'], howTo: ['Ritmo sustentado.', 'Passadas amplas e postura ereta.'], tip: 'Mantenha respiracao constante.' },
          ]},
          { day: 'Quinta', focus: 'Parte superior', rest: false, exercises: [
            { name: 'Flexao de braco', sets: 4, reps: '10', rest: '60s', muscles: ['Peitoral', 'Triceps'], howTo: ['Maos alinhadas aos ombros.', 'Desca controlando.', 'Suba sem perder alinhamento.'], tip: 'Adapte com apoio no joelho se precisar.' },
            { name: 'Prancha frontal', sets: 3, reps: '40s', rest: '40s', muscles: ['Core'], howTo: ['Antebracos apoiados.', 'Coluna neutra.', 'Segure com firmeza.'], tip: 'Ative o abdomen o tempo todo.' },
          ]},
          { day: 'Sexta', focus: 'Cardio intenso', rest: false, exercises: [
            { name: 'Elevacao de joelhos', sets: 5, reps: '30s', rest: '25s', muscles: ['Cardio', 'Core'], howTo: ['Joelhos altos alternados.', 'Bracos acompanham o ritmo.'], tip: 'Pise leve para reduzir impacto.' },
            { name: 'Polichinelo', sets: 3, reps: '40s', rest: '30s', muscles: ['Cardio'], howTo: ['Ritmo continuo.', 'Coordene bracos e pernas.'], tip: 'Controle o ritmo respiratorio.' },
          ]},
          { day: 'Sabado', focus: 'Descanso', rest: true, exercises: [] },
          { day: 'Domingo', focus: 'Descanso', rest: true, exercises: [] },
        ],
        generalTips: ['Durma bem para recuperar energia.', 'Ajuste intensidade quando estiver muito cansado.', 'Mantenha constancia durante as 5 sessoes da semana.'],
      },
    ];

    let fitnessRoutineState = null;
    let fitnessSelectableLogs = null;

    function normalizeDayString(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function normalizeFitnessRoutine(raw) {
      const safe = raw && typeof raw === 'object' ? raw : {};
      const mode = ['none', 'ai', 'preset'].includes(safe.mode) ? safe.mode : DEFAULT_FITNESS_ROUTINE.mode;
      const fallbackPreset = FITNESS_PRESET_PLANS[0]?.id || '';
      const presetId = FITNESS_PRESET_PLANS.some(plan => plan.id === safe.presetId) ? safe.presetId : (safe.presetId || fallbackPreset);
      return { mode, presetId };
    }

    function loadFitnessRoutineState() {
      if (!fitnessRoutineState) {
        fitnessRoutineState = normalizeFitnessRoutine(load(FITNESS_ROUTINE_KEY, DEFAULT_FITNESS_ROUTINE));
      }
      return fitnessRoutineState;
    }

    function saveFitnessRoutineState() {
      if (!fitnessRoutineState) return;
      save(FITNESS_ROUTINE_KEY, fitnessRoutineState);
    }

    function loadFitnessSelectableLogs() {
      if (!fitnessSelectableLogs || typeof fitnessSelectableLogs !== 'object') {
        fitnessSelectableLogs = load(FITNESS_SELECTABLE_LOGS_KEY, {});
      }
      return fitnessSelectableLogs;
    }

    function saveFitnessSelectableLogs() {
      if (!fitnessSelectableLogs || typeof fitnessSelectableLogs !== 'object') return;
      save(FITNESS_SELECTABLE_LOGS_KEY, fitnessSelectableLogs);
    }

    function getPresetPlanById(presetId) {
      return FITNESS_PRESET_PLANS.find(plan => plan.id === presetId) || FITNESS_PRESET_PLANS[0] || null;
    }

    function buildPlanFromPreset(preset) {
      if (!preset) return null;
      return {
        source: 'preset',
        presetId: preset.id,
        generatedAt: new Date().toISOString(),
        weeklyPlan: deepClone(preset.weeklyPlan || []),
        todayWorkout: deepClone((preset.weeklyPlan || []).find(item => !item.rest) || { focus: 'Treino', exercises: [] }),
        generalTips: deepClone(preset.generalTips || []),
      };
    }

    function getWorkoutDaysInLast(windowDays = 7) {
      let count = 0;
      for (let i = 0; i < windowDays; i += 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0) count += 1;
      }
      return count;
    }

    function findTodayWorkout(plan) {
      if (!plan) return null;
      const alias = DAY_ALIAS[new Date().getDay()];
      const normalizedAlias = normalizeDayString(alias);
      const fromWeek = (plan.weeklyPlan || []).find(item => normalizeDayString(item.day).startsWith(normalizedAlias));
      return fromWeek || plan.todayWorkout || null;
    }

    function applyPresetPlan(presetId, { silent = false } = {}) {
      const preset = getPresetPlanById(presetId);
      if (!preset) return;
      fitnessPlan = buildPlanFromPreset(preset);
      save(STORAGE_KEYS.fitnessPlan, fitnessPlan);

      const routine = loadFitnessRoutineState();
      routine.mode = 'preset';
      routine.presetId = preset.id;
      saveFitnessRoutineState();

      if (!silent) showToast('Plano predefinido aplicado', preset.name, 'success');
      renderFitnessPage();
    }

    function applyPresetPlanFromSelect() {
      const select = document.getElementById('fitness-preset-select');
      if (!select) return;
      applyPresetPlan(select.value);
    }

    function setFitnessRoutineMode(mode) {
      const routine = loadFitnessRoutineState();
      if (!['none', 'ai', 'preset'].includes(mode)) return;
      routine.mode = mode;
      if (!routine.presetId) routine.presetId = FITNESS_PRESET_PLANS[0]?.id || '';
      saveFitnessRoutineState();

      if (mode === 'preset') {
        applyPresetPlan(routine.presetId, { silent: true });
        return;
      }

      if (mode === 'none') {
        showToast('Modo sem exercícios', 'O app vai ocultar os treinos da rotina.', 'warn');
      } else {
        showToast('Modo IA ativo', 'Você pode gerar um plano personalizado quando quiser.', 'success');
      }
      renderFitnessPage();
    }

    function completeSelectableExercise(exerciseId) {
      const routine = loadFitnessRoutineState();
      if (routine.mode === 'none') {
        showToast('Modo sem exercícios', 'Altere o modo para concluir exercícios.', 'warn');
        return;
      }

      const exercise = SELECTABLE_EXERCISES.find(item => item.id === exerciseId);
      if (!exercise) return;

      const logs = loadFitnessSelectableLogs();
      const today = todayKey();
      const doneIds = Array.isArray(logs[today]) ? logs[today] : [];
      if (doneIds.includes(exerciseId)) return;

      doneIds.push(exerciseId);
      logs[today] = doneIds;
      saveFitnessSelectableLogs();

      completeExercise(`${exercise.name} (selecionável)`, 20, { showModal: false });
      showToast('Exercício concluído', `${exercise.name} registrado no dia.`, 'success');
      renderFitnessPage();
    }

    function hydrateRoutineUi() {
      const routine = loadFitnessRoutineState();
      const presetWrap = document.getElementById('fitness-preset-wrap');
      const presetSelect = document.getElementById('fitness-preset-select');
      const modeNote = document.getElementById('fitness-mode-note');
      const aiButton = document.getElementById('fitness-ai-generate-btn');
      const selectableCard = document.getElementById('fitness-selectable-card');

      document.querySelectorAll('.fitness-mode-btn').forEach(button => {
        const isActive = button.id === `fitness-mode-${routine.mode}`;
        button.classList.toggle('active', isActive);
        button.classList.toggle('btn-primary', isActive);
        button.classList.toggle('btn-ghost', !isActive);
      });

      if (presetSelect) {
        presetSelect.innerHTML = FITNESS_PRESET_PLANS
          .map(plan => `<option value="${plan.id}">${plan.name}</option>`)
          .join('');
        presetSelect.value = routine.presetId || FITNESS_PRESET_PLANS[0]?.id || '';
      }

      if (presetWrap) presetWrap.hidden = routine.mode !== 'preset';
      if (aiButton) aiButton.style.display = routine.mode === 'ai' ? 'inline-flex' : 'none';
      if (selectableCard) selectableCard.hidden = routine.mode !== 'ai';

      if (modeNote) {
        if (routine.mode === 'none') modeNote.textContent = 'Rotina sem exercícios ativa. Nenhum treino será sugerido.';
        if (routine.mode === 'ai') modeNote.textContent = 'Plano inteligente: gere seu treino com IA de acordo com seu perfil.';
        if (routine.mode === 'preset') modeNote.textContent = 'Plano predefinido ativo. Você pode trocar o preset quando quiser.';
      }
    }

    function renderSelectableExercises() {
      const list = document.getElementById('fitness-selectable-list');
      const summary = document.getElementById('fitness-selectable-summary');
      if (!list) return;

      const logs = loadFitnessSelectableLogs();
      const doneIds = new Set(Array.isArray(logs[todayKey()]) ? logs[todayKey()] : []);
      if (summary) summary.textContent = `${doneIds.size}/${SELECTABLE_EXERCISES.length} feitos hoje`;

      list.innerHTML = SELECTABLE_EXERCISES.map(exercise => {
        const done = doneIds.has(exercise.id);
        return `
          <div class="fitness-selectable-item ${done ? 'done' : ''}">
            <div class="fitness-selectable-copy">
              <div class="fitness-selectable-name">${exercise.name}</div>
              <div class="fitness-selectable-meta">${exercise.sets} séries x ${exercise.reps} repetições - descanso ${exercise.rest}</div>
            </div>
            <div class="fitness-selectable-actions">
              <button class="btn ${done ? 'btn-ghost' : 'btn-primary'}" style="padding:8px 12px" ${done ? 'disabled' : `onclick="completeSelectableExercise('${exercise.id}')"`}>
                ${done ? 'Concluído' : 'Concluir'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }


    // Day picker helpers
    function toggleDayPick(btn) {
      btn.classList.toggle('selected');
      updateDaysCount();
    }

    function updateDaysCount() {
      const selected = document.querySelectorAll('#fp-days-picker .day-pick-btn.selected');
      const label = document.getElementById('fp-days-count');
      if (!label) return;
      if (selected.length === 0) {
        label.textContent = 'Nenhum dia selecionado';
      } else {
        const names = Array.from(selected).map(b => b.dataset.day);
        label.textContent = `${selected.length} dia${selected.length > 1 ? 's' : ''}: ${names.join(', ')}`;
        label.style.color = 'var(--accent2)';
      }
    }

    //  FITNESS MODULE



    function openFitnessProfile() {
      if (fitnessProfile) {
        document.getElementById('fp-age').value       = fitnessProfile.age || '';
        document.getElementById('fp-sex').value       = fitnessProfile.sex || 'male';
        document.getElementById('fp-height').value    = fitnessProfile.height || '';
        document.getElementById('fp-weight').value    = fitnessProfile.weight || '';
        document.getElementById('fp-goal').value      = fitnessProfile.goal || 'general';
        document.getElementById('fp-level').value     = fitnessProfile.level || 'beginner';
        // Restore selected days
        document.querySelectorAll('#fp-days-picker .day-pick-btn').forEach(b => {
          const days = Array.isArray(fitnessProfile.days) ? fitnessProfile.days : [];
          b.classList.toggle('selected', days.includes(b.dataset.day));
        });
        updateDaysCount();
        document.getElementById('fp-equipment').value = fitnessProfile.equipment || 'none';
        document.getElementById('fp-notes').value     = fitnessProfile.notes || '';
      }
      openModal('modal-fitness-profile');
    }

    function saveFitnessProfile() {
      const age    = parseInt(document.getElementById('fp-age').value);
      const height = parseFloat(document.getElementById('fp-height').value);
      const weight = parseFloat(document.getElementById('fp-weight').value);

      const selectedDays = Array.from(document.querySelectorAll('#fp-days-picker .day-pick-btn.selected')).map(b => b.dataset.day);
      if (!age || !height || !weight) { showToast('Preencha idade, altura e peso', '', 'warn'); return; }
      if (selectedDays.length === 0) { showToast('Selecione ao menos 1 dia de treino', '', 'warn'); return; }

      const isNew = !fitnessProfile;
      fitnessProfile = {
        age, height, weight,
        sex:       document.getElementById('fp-sex').value,
        goal:      document.getElementById('fp-goal').value,
        level:     document.getElementById('fp-level').value,
        days:      Array.from(document.querySelectorAll('#fp-days-picker .day-pick-btn.selected')).map(b => b.dataset.day),
        equipment: document.getElementById('fp-equipment').value,
        notes:     document.getElementById('fp-notes').value.trim(),
        updatedAt: new Date().toISOString(),
      };

      // Log weight entry automatically
      const today = todayKey();
      fitnessWeightLog = fitnessWeightLog.filter(e => e.date !== today);
      fitnessWeightLog.push({ date: today, weight });
      fitnessWeightLog.sort((a, b) => a.date.localeCompare(b.date));

      save(STORAGE_KEYS.fitnessProfile, fitnessProfile);
      save(STORAGE_KEYS.fitnessWeightLog, fitnessWeightLog);

      if (isNew) {
        grantFitnessXp(50, 'Perfil fitness criado!');
        unlockFitnessBadge('profile_set', 'Perfil configurado', 'Configurou seu perfil físico', '👤');
        if (!isGamificationEnabled()) showToast('Perfil criado!', '', 'success');
      } else {
        showToast('Perfil atualizado!', '', 'success');
      }
      closeModal('modal-fitness-profile');
      renderFitnessPage();
    }

    function openWeightLog() {
      document.getElementById('wl-date').value = todayKey();
      document.getElementById('wl-weight').value = fitnessProfile?.weight || '';
      openModal('modal-weight-log');
    }

    function saveWeightEntry() {
      const weight = parseFloat(document.getElementById('wl-weight').value);
      const date   = document.getElementById('wl-date').value;
      if (!weight || !date) { showToast('Preencha peso e data', '', 'warn'); return; }
      fitnessWeightLog = fitnessWeightLog.filter(e => e.date !== date);
      fitnessWeightLog.push({ date, weight });
      fitnessWeightLog.sort((a, b) => a.date.localeCompare(b.date));
      save(STORAGE_KEYS.fitnessWeightLog, fitnessWeightLog);
      if (fitnessProfile) { fitnessProfile.weight = weight; save(STORAGE_KEYS.fitnessProfile, fitnessProfile); }
      grantFitnessXp(10, 'Peso registrado!');
      if (!isGamificationEnabled()) showToast('Peso registrado!', '', 'success');
      persistDaySnapshot(date);
      checkMissionRewards();
      evaluateAchievements();
      closeModal('modal-weight-log');
      refreshUI();
      renderFitnessPage();
    }

    function getSortedProgressPhotos() {
      return [...progressPhotos].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    function getMonthlyProgressData(limit = 12) {
      const monthKeys = new Set([
        ...Object.keys(taskStats || {}).map(key => key.slice(0, 7)),
        ...Object.keys(fitnessLogs || {}).map(key => key.slice(0, 7)),
        ...fitnessWeightLog.map(entry => String(entry.date || '').slice(0, 7)),
        ...progressPhotos.map(photo => String(photo.date || '').slice(0, 7)),
      ]);

      return [...monthKeys]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limit)
        .map(monthKey => {
          const weights = fitnessWeightLog
            .filter(entry => String(entry.date || '').startsWith(monthKey))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
          const photos = getSortedProgressPhotos().filter(photo => String(photo.date || '').startsWith(monthKey));
          const taskKeys = Object.keys(taskStats || {}).filter(key => key.startsWith(monthKey));
          const fitnessKeys = Object.keys(fitnessLogs || {}).filter(key => key.startsWith(monthKey));
          const tasksDone = taskKeys.reduce((sum, key) => sum + Number(taskStats[key]?.done || 0), 0);
          const workoutDays = fitnessKeys.filter(key => Array.isArray(fitnessLogs[key]) && fitnessLogs[key].length > 0).length;
          const activeDays = taskKeys.filter(key => Number(taskStats[key]?.done || 0) > 0).length;
          const weightStart = weights[0]?.weight ?? null;
          const weightEnd = weights[weights.length - 1]?.weight ?? null;
          const weightDelta = Number.isFinite(weightStart) && Number.isFinite(weightEnd)
            ? Number((weightEnd - weightStart).toFixed(1))
            : null;
          return {
            monthKey,
            label: formatMonthLabel(monthKey),
            photo: photos[0] || null,
            photoCount: photos.length,
            tasksDone,
            workoutDays,
            activeDays,
            weightStart,
            weightEnd,
            weightDelta,
          };
        });
    }

    function renderProgressPhotoPreview(imageData = '') {
      const wrap = document.getElementById('progress-photo-preview-wrap');
      if (!wrap) return;
      if (!imageData) {
        wrap.innerHTML = `<div class="progress-photo-empty">Escolha uma foto para visualizar antes de salvar.</div>`;
        return;
      }
      wrap.innerHTML = `<img src="${imageData}" alt="Prévia da foto de progresso" class="progress-photo-preview" />`;
    }

    function openProgressPhotoModal() {
      pendingProgressPhotoData = '';
      const dateInput = document.getElementById('progress-photo-date');
      const noteInput = document.getElementById('progress-photo-note');
      const fileInput = document.getElementById('progress-photo-file');
      if (dateInput) dateInput.value = todayKey();
      if (noteInput) noteInput.value = '';
      if (fileInput) fileInput.value = '';
      renderProgressPhotoPreview('');
      openModal('modal-progress-photo');
    }

    function compressProgressPhoto(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxSide = 1080;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Não foi possível preparar a imagem.'));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.84));
          };
          img.onerror = () => reject(new Error('A imagem selecionada não pôde ser lida.'));
          img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
        reader.readAsDataURL(file);
      });
    }

    async function handleProgressPhotoSelection(event) {
      const file = event?.target?.files?.[0];
      if (!file) {
        pendingProgressPhotoData = '';
        renderProgressPhotoPreview('');
        return;
      }
      try {
        pendingProgressPhotoData = await compressProgressPhoto(file);
        renderProgressPhotoPreview(pendingProgressPhotoData);
      } catch (error) {
        pendingProgressPhotoData = '';
        renderProgressPhotoPreview('');
        showToast('Erro ao carregar foto', error.message, 'warn');
      }
    }

    function saveProgressPhoto() {
      const date = document.getElementById('progress-photo-date')?.value || todayKey();
      const note = document.getElementById('progress-photo-note')?.value.trim() || '';
      if (!pendingProgressPhotoData) {
        showToast('Selecione uma foto', 'Escolha uma imagem antes de salvar.', 'warn');
        return;
      }
      const newPhoto = {
        id: uid(),
        date,
        note,
        image: pendingProgressPhotoData,
        createdAt: new Date().toISOString(),
      };
      progressPhotos.unshift(newPhoto);
      progressPhotos = getSortedProgressPhotos();
      try {
        save(STORAGE_KEYS.progressPhotos, progressPhotos);
      } catch (error) {
        progressPhotos = progressPhotos.filter(photo => photo.id !== newPhoto.id);
        showToast('Não foi possível salvar', 'O armazenamento local ficou sem espaço para essa foto.', 'warn');
        return;
      }
      closeModal('modal-progress-photo');
      pendingProgressPhotoData = '';
      showToast('Foto salva', 'Seu progresso do mês foi registrado.', 'success');
      refreshUI();
      renderFitnessPage();
      if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
    }

    function deleteProgressPhoto(id) {
      const photo = progressPhotos.find(item => item.id === id);
      if (!photo) return;
      showConfirm('Remover foto?', `A foto de ${new Date(`${photo.date}T00:00:00`).toLocaleDateString('pt-BR')} será apagada do armazenamento local.`, () => {
        progressPhotos = progressPhotos.filter(item => item.id !== id);
        save(STORAGE_KEYS.progressPhotos, progressPhotos);
        refreshUI();
        renderFitnessPage();
        if (document.getElementById('page-stats')?.classList.contains('active')) renderStats();
        showToast('Foto removida', 'O registro visual foi apagado.', 'warn');
      });
    }

    function renderProgressPhotoPanel() {
      const panel = document.getElementById('fitness-progress-photo-panel');
      if (!panel) return;
      const latest = getSortedProgressPhotos()[0];
      if (!latest) {
        panel.innerHTML = `
          <div class="progress-photo-upload">
            <div class="progress-photo-empty">
              Ainda não existe foto salva. Registre uma imagem por mês para acompanhar sua evolução visual.
            </div>
          </div>
        `;
        return;
      }
      const latestDate = new Date(`${latest.date}T00:00:00`).toLocaleDateString('pt-BR');
      const monthly = getMonthlyProgressData(3);
      panel.innerHTML = `
        <div class="progress-photo-card">
          <img src="${latest.image}" alt="Última foto de progresso" class="progress-photo-preview" />
          <div class="progress-photo-meta">
            <div>
              <div class="settings-title">Último registro</div>
              <div class="settings-copy">${latestDate} · ${formatMonthLabel(getMonthKey(`${latest.date}T00:00:00`))}</div>
            </div>
            <button class="btn btn-ghost" style="padding:8px 12px" onclick="deleteProgressPhoto('${latest.id}')">Remover</button>
          </div>
          ${latest.note ? `<div class="progress-photo-note">${escapeHtml(latest.note)}</div>` : ''}
          <div class="progress-month-inline">
            ${monthly.map(item => `<span class="tag">${item.label}</span>`).join('')}
          </div>
        </div>
      `;
    }

    function renderMonthlyProgress() {
      const grid = document.getElementById('monthly-progress-grid');
      if (!grid) return;
      const months = getMonthlyProgressData(12);
      if (!months.length) {
        grid.innerHTML = '<div class="empty-state" style="padding:20px 12px">Adicione uma foto de progresso ou registre peso e treinos para montar a linha do tempo mensal.</div>';
        return;
      }
      grid.innerHTML = `<div class="monthly-progress-grid">${months.map(item => {
        const deltaLabel = item.weightDelta === null
          ? 'Sem variação de peso'
          : item.weightDelta === 0
            ? 'Peso estável'
            : item.weightDelta > 0
              ? `+${item.weightDelta.toFixed(1)} kg`
              : `${item.weightDelta.toFixed(1)} kg`;
        const deltaTone = item.weightDelta === null ? 'var(--muted)' : item.weightDelta <= 0 ? 'var(--accent2)' : 'var(--warn)';
        return `
          <div class="month-card">
            ${item.photo
              ? `<img src="${item.photo.image}" alt="Foto de progresso de ${item.label}" class="month-card-image" />`
              : `<div class="month-card-placeholder">Sem foto</div>`}
            <div class="month-card-body">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
                <div>
                  <div class="settings-title">${item.label}</div>
                  <div class="settings-copy">${item.photoCount || 0} foto${item.photoCount === 1 ? '' : 's'} · ${item.activeDays} dias ativos</div>
                </div>
                ${item.photo ? `<button class="icon-btn" onclick="deleteProgressPhoto('${item.photo.id}')" aria-label="Remover foto do mês"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>` : ''}
              </div>
              <div class="month-stats">
                <div><strong>${item.tasksDone}</strong><span>Tarefas</span></div>
                <div><strong>${item.workoutDays}</strong><span>Treinos</span></div>
                <div><strong style="color:${deltaTone}">${deltaLabel}</strong><span>Peso</span></div>
              </div>
              ${item.photo?.note ? `<div class="progress-photo-note">${escapeHtml(item.photo.note)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}</div>`;
    }

    async function generateFitnessPlan() {
      if (!fitnessProfile) {
        showToast('Configure seu perfil primeiro!', 'Clique em Meu Perfil', 'warn');
        openFitnessProfile();
        return;
      }

      const config = getActiveAiConfig();
      const configError = getAiConfigError(config);
      if (configError) {
        showToast('Configure o motor de IA', configError, 'warn');
        return;
      }

      const btn = document.getElementById('fitness-ai-generate-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" style="width:14px;height:14px;margin-right:4px;animation:spin 1s linear infinite"></i>Gerando...'; lucide.createIcons(); }

      const goalLabels = { lose_fat:'perda de gordura', gain_muscle:'ganho muscular', maintain:'manutenção', endurance:'resistência', general:'saúde geral' };
      const equipLabels = { none:'sem equipamento (calistenia)', dumbbells:'halteres em casa', gym:'academia completa', resistance_bands:'elásticos/bandas' };
      const levelLabels = { beginner:'iniciante', intermediate:'intermediário', advanced:'avançado' };

      const bmi = (fitnessProfile.weight / ((fitnessProfile.height/100) ** 2)).toFixed(1);

      const prompt = `Crie um plano de treino personalizado para:
- Idade: ${fitnessProfile.age} anos | Sexo: ${fitnessProfile.sex === 'male' ? 'Masculino' : 'Feminino'}
- Altura: ${fitnessProfile.height}cm | Peso: ${fitnessProfile.weight}kg | IMC: ${bmi}
- Objetivo: ${goalLabels[fitnessProfile.goal]}
- Nível: ${levelLabels[fitnessProfile.level]}
- Dias de treino escolhidos: ${Array.isArray(fitnessProfile.days) ? fitnessProfile.days.join(', ') : fitnessProfile.days + ' dias/semana'}
- Equipamento: ${equipLabels[fitnessProfile.equipment]}
${fitnessProfile.notes ? `- Restrições: ${fitnessProfile.notes}` : ''}

Retorne JSON puro sem crases:
{
  "weeklyPlan": [
    {"day": "Segunda", "focus": "Peito e Tríceps", "rest": false, "exercises": [
      {
        "name": "Supino Reto",
        "sets": 3,
        "reps": "12",
        "rest": "60s",
        "videoUrl": "https://www.youtube.com/results?search_query=supino+reto+execucao+certa",
        "tip": "dica curta de execução",
        "muscles": ["Peitoral", "Tríceps", "Ombro anterior"],
        "howTo": ["Passo 1 detalhado", "Passo 2 detalhado", "Passo 3 detalhado"],
        "mistakes": ["Erro comum 1", "Erro comum 2"],
        "variation": "Variação mais fácil ou mais difícil"
      }
    ]},
    {"day": "Terça", "focus": "Descanso", "rest": true, "exercises": []}
  ],
  "todayWorkout": {"focus": "nome do foco", "exercises": []},
  "generalTips": ["dica 1", "dica 2", "dica 3"]
}
Crie exatamente 7 dias (Seg a Dom). Adapte ao nível e objetivo. Preencha howTo com 3-5 passos claros para cada exercício.`;

      try {
        const raw = await requestAiJson({ userPrompt: prompt });
        const parsed = parseAiJson(raw);
        if (!parsed) throw new Error('Não foi possível interpretar o JSON da IA.');
        const routine = loadFitnessRoutineState();
        routine.mode = 'ai';
        saveFitnessRoutineState();
        fitnessPlan = parsed;
        fitnessPlan.source = 'ai';
        delete fitnessPlan.presetId;
        fitnessPlan.generatedAt = new Date().toISOString();
        save(STORAGE_KEYS.fitnessPlan, fitnessPlan);

        grantXp(40, 'Plano de treino gerado!');
        unlockBadge('first_plan', 'Primeiro plano', 'Gerou seu primeiro plano de treino', '🏁');
        showToast('Plano gerado!', 'Seu treino personalizado está pronto.', 'success');
        renderFitnessPage();
      } catch(e) {
        showToast('Erro ao gerar plano', e.message, 'warn');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="sparkles" style="width:14px;height:14px;margin-right:4px"></i>Gerar com IA'; lucide.createIcons(); }
      }
    }

    function completeExercise(exName, xpAmount, options = {}) {
      const showModal = options.showModal !== false;
      const today = todayKey();
      if (!fitnessLogs[today]) fitnessLogs[today] = [];
      if (fitnessLogs[today].includes(exName)) return;
      fitnessLogs[today].push(exName);
      save(STORAGE_KEYS.fitnessLogs, fitnessLogs);

      // Update streak
      const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
      if (fitnessGameState.lastTrainingDate === yesterday || fitnessGameState.lastTrainingDate === today) {
        if (fitnessGameState.lastTrainingDate !== today) fitnessGameState.streak = (fitnessGameState.streak || 0) + 1;
      } else {
        fitnessGameState.streak = 1;
      }
      fitnessGameState.lastTrainingDate = today;
      save(STORAGE_KEYS.fitnessGameState, fitnessGameState);

      // Streak badges
      if (fitnessGameState.streak >= 7)  unlockBadge('streak_7',  'Semana inteira',   '7 dias consecutivos de treino', '🔥');
      if (fitnessGameState.streak >= 30) unlockBadge('streak_30', 'Mês implacável',   '30 dias consecutivos de treino', '⚡');

      // Count total exercises done
      const totalDone = Object.values(fitnessLogs).flat().length;
      if (totalDone >= 10)  unlockBadge('ex_10',  '10 exercícios',    'Completou 10 exercícios', '💪');
      if (totalDone >= 50)  unlockBadge('ex_50',  '50 exercícios',    'Completou 50 exercícios', '🏋️');
      if (totalDone >= 100) unlockBadge('ex_100', '100 exercícios',   'Completou 100 exercícios', '👑');
      const weekWorkoutDays = getWorkoutDaysInLast(7);
      if (weekWorkoutDays >= 4) unlockBadge('wk_4', 'Ritmo Semanal', 'Completou 4 dias de treino em 7 dias', 'WK');
      if (weekWorkoutDays >= 6) unlockBadge('wk_6', 'Semana Forte', 'Completou 6 dias de treino em 7 dias', 'WK+');

      // Grant unified XP silently (sem toast de XP nesta etapa)
      grantXp(xpAmount + 15);
      persistDaySnapshot(today);
      checkMissionRewards();
      evaluateAchievements();

      // Show celebration modal
      if (showModal) {
        document.getElementById('exdone-title').textContent = `${exName} concluído`;
        document.getElementById('exdone-body').textContent  = 'Ótimo trabalho! Continue assim.';
        const emojis = ['💪','🔥','🏆','🎯','⚡','🚀'];
        document.getElementById('exdone-emoji').textContent = emojis[Math.floor(Math.random()*emojis.length)];
        openModal('modal-exercise-done');
      }
      refreshUI();
    }

    let fitnessWeightChartInst = null;
    function renderFitnessPage() {
      if (!document.getElementById('page-fitness')?.classList.contains('active')) return;
      const routine = loadFitnessRoutineState();
      if (routine.mode === 'preset') {
        if (!routine.presetId) routine.presetId = FITNESS_PRESET_PLANS[0]?.id || '';
        const shouldApplyPreset = !fitnessPlan || fitnessPlan.source !== 'preset' || fitnessPlan.presetId !== routine.presetId;
        if (shouldApplyPreset) {
          const preset = getPresetPlanById(routine.presetId);
          if (preset) {
            fitnessPlan = buildPlanFromPreset(preset);
            save(STORAGE_KEYS.fitnessPlan, fitnessPlan);
          }
        }
      }
      hydrateRoutineUi();
      const selectableCard = document.getElementById('fitness-selectable-card');
      const showSelectableFallback = routine.mode === 'ai' && !fitnessPlan;
      if (selectableCard) selectableCard.hidden = !showSelectableFallback;
      const gamificationOn = isGamificationEnabled();
      const themeStyles = getComputedStyle(document.documentElement);
      const accent = themeStyles.getPropertyValue('--accent').trim() || '#7c6df7';
      const accentRgb = themeStyles.getPropertyValue('--accent-rgb').trim() || '124, 109, 247';
      const muted = themeStyles.getPropertyValue('--muted').trim() || '#6b6b88';
      const fitnessBanner = document.getElementById('fitness-game-banner');
      const fitnessBadgesCard = document.getElementById('fitness-badges-card');
      if (fitnessBanner) fitnessBanner.hidden = !gamificationOn;
      if (fitnessBadgesCard) fitnessBadgesCard.hidden = !gamificationOn;

      if (gamificationOn) {
        const prog = getLevelProgress();
        document.getElementById('fitness-avatar').textContent     = '🏋️';
        document.getElementById('fitness-rank-title').textContent = prog.title;
        document.getElementById('fitness-xp-label').textContent   = `${gameState.xp || 0} XP Coletivo`;
        document.getElementById('fitness-level-label').textContent = `Nível ${prog.level}`;
        document.getElementById('fitness-xp-next').textContent    = `${prog.current}/${prog.next} XP`;
        document.getElementById('fitness-xp-bar').style.width     = prog.pct + '%';
        document.getElementById('fitness-streak-label').textContent = `🔥 ${fitnessGameState.streak || 0} dias de treino consecutivos`;
        const weekGoal = Math.max(3, Math.min(6, Array.isArray(fitnessProfile?.days) ? (fitnessProfile.days.length || 4) : 4));
        const weekDone = getWorkoutDaysInLast(7);
        const weekGoalLabel = document.getElementById('fitness-week-goal-label');
        if (weekGoalLabel) weekGoalLabel.textContent = `Meta semanal: ${Math.min(weekDone, weekGoal)}/${weekGoal} treinos`;
      }

      // Profile display
      const profileDiv = document.getElementById('fitness-profile-display');
      if (fitnessProfile) {
        const bmi = (fitnessProfile.weight / ((fitnessProfile.height/100)**2)).toFixed(1);
        const bmiLabel = bmi < 18.5 ? 'Abaixo do peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidade';
        const goalEmoji = { lose_fat:'🔥', gain_muscle:'💪', maintain:'⚖️', endurance:'🏃', general:'❤️' };
        profileDiv.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${fitnessProfile.age}</div><div class="stat-label">Idade</div></div>
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${fitnessProfile.height}cm</div><div class="stat-label">Altura</div></div>
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${fitnessProfile.weight}kg</div><div class="stat-label">Peso</div></div>
            <div class="stat-box"><div class="stat-number" style="font-size:20px">${bmi}</div><div class="stat-label">IMC · ${bmiLabel}</div></div>
          </div>
          <div style="margin-top:12px;font-size:13px;color:var(--muted)">
            ${goalEmoji[fitnessProfile.goal]} Objetivo: <b style="color:var(--text)">${{lose_fat:'Perder gordura',gain_muscle:'Ganhar músculo',maintain:'Manter forma',endurance:'Resistência',general:'Saúde geral'}[fitnessProfile.goal]}</b>
            &nbsp;·&nbsp; ${Array.isArray(fitnessProfile.days) ? fitnessProfile.days.join(', ') : fitnessProfile.days + '×/sem'}
          </div>`;
      } else if (profileDiv) {
        profileDiv.innerHTML = '<p class="text-sm text-muted">Nenhum perfil configurado ainda.<br>Clique em <b>Meu Perfil</b> para começar.</p>';
      }

      renderProgressPhotoPanel();

      // Weight chart
      const weightWrap = document.getElementById('fitness-weight-chart-wrap');
      if (weightWrap) {
        if (fitnessWeightChartInst) {
          fitnessWeightChartInst.destroy();
          fitnessWeightChartInst = null;
        }
        if (fitnessWeightLog.length >= 2) {
          weightWrap.innerHTML = '<canvas id="fitness-weight-chart"></canvas>';
          const wctx = document.getElementById('fitness-weight-chart')?.getContext('2d');
          if (wctx) {
            fitnessWeightChartInst = new Chart(wctx, {
              type: 'line',
              data: {
                labels: fitnessWeightLog.map(e => e.date.slice(5)),
                datasets: [{ data: fitnessWeightLog.map(e => e.weight), borderColor: accent, backgroundColor: `rgba(${accentRgb},0.1)`, tension: 0.4, pointRadius: 4, fill: true }]
              },
              options: { plugins:{ legend:{ display:false } }, scales: { x:{ticks:{color:muted,font:{size:10}}}, y:{ticks:{color:muted,font:{size:10}}} }, responsive:true, maintainAspectRatio:false }
            });
          }
        } else {
          weightWrap.innerHTML = '<p class="text-sm text-muted" style="padding:20px 0">Registre ao menos 2 pesos para ver o gráfico.</p>';
        }
      }

      // Today's workout
      const todayDiv = document.getElementById('fitness-today-plan');
      const today = todayKey();
      const weekDiv = document.getElementById('fitness-weekly-plan');
      const planTag = document.getElementById('fitness-plan-tag');
      const doneToday = fitnessLogs[today] || [];

      if (routine.mode === 'none') {
        if (todayDiv) {
          todayDiv.innerHTML = `<div class="empty-state"><p>Modo sem exercícios ativo.<br>Ative IA ou plano predefinido para ver os treinos.</p></div>`;
        }
        if (weekDiv) {
          weekDiv.innerHTML = '<p class="text-sm text-muted">Sem plano semanal no modo sem exercícios.</p>';
        }
        if (planTag) planTag.style.display = 'none';
      } else if (fitnessPlan) {
        const todayPlan = findTodayWorkout(fitnessPlan);

        if (!todayPlan || todayPlan.rest) {
          todayDiv.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">
            <div style="font-size:40px;margin-bottom:8px">🛌</div>
            <div style="font-weight:600">Dia de Descanso</div>
            <div style="font-size:12px;margin-top:4px">Recuperação é parte do treino!</div>
          </div>`;
        } else {
          const exList = (todayPlan.exercises || []).map((ex, exIdx) => {
            const done = doneToday.includes(ex.name);
            return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;background:${done?'rgba(var(--success-rgb),0.08)':'var(--surface2)'};border:1px solid ${done?'rgba(var(--success-rgb),0.2)':'var(--border)'};margin-bottom:8px;transition:all 0.2s">
              <button onclick="${done ? '' : `completeExercise('${ex.name.replace(/'/g,"\\'")}', 25)`}" style="width:28px;height:28px;border-radius:50%;border:2px solid ${done?'var(--accent2)':'var(--border)'};background:${done?'var(--accent2)':'transparent'};cursor:${done?'default':'pointer'};flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;transition:all 0.2s">
                ${done ? '✓' : ''}
              </button>
              <div style="flex:1" >
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <div style="font-weight:600;font-size:14px;${done?'text-decoration:line-through;opacity:0.5':''}">${ex.name}</div>
                </div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px">${ex.sets} séries x ${ex.reps} reps - descanso ${ex.rest}</div>
                ${ex.muscles?.length ? `<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">${ex.muscles.slice(0,3).map(m=>`<span style="font-size:10px;background:rgba(var(--accent-rgb),0.1);color:var(--accent);border-radius:10px;padding:2px 7px">${m}</span>`).join('')}</div>` : ''}
              </div>
            </div>`;
          }).join('');
          todayDiv.innerHTML = `<div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:10px">🎯 ${todayPlan.focus || 'Treino de Hoje'}</div>${exList}`;
        }
      }

      // Weekly plan
      if (routine.mode !== 'none' && fitnessPlan?.weeklyPlan) {
        if (planTag) {
          planTag.style.display = 'inline-block';
          planTag.textContent = routine.mode === 'preset' || fitnessPlan.source === 'preset' ? 'Predefinido' : 'IA';
        }
        weekDiv.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">` +
          fitnessPlan.weeklyPlan.map(d => `
            <div style="background:${d.rest?'var(--surface2)':'rgba(var(--accent-rgb),0.08)'};border:1px solid ${d.rest?'var(--border)':'rgba(var(--accent-rgb),0.2)'};border-radius:12px;padding:12px;text-align:center">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${d.day}</div>
              <div style="font-size:13px;font-weight:700;color:${d.rest?'var(--muted)':'var(--text)'}">${d.rest ? '🛌 Descanso' : d.focus}</div>
              ${!d.rest ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">${d.exercises?.length || 0} exercícios</div>` : ''}
            </div>`).join('') + '</div>';

        if (fitnessPlan.generalTips?.length) {
          weekDiv.innerHTML += `<div style="margin-top:16px;padding:12px;background:rgba(var(--success-rgb),0.08);border:1px solid rgba(var(--success-rgb),0.2);border-radius:10px">
            <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">Dicas do plano</div>
            ${fitnessPlan.generalTips.map(t => `<div style="font-size:12px;color:var(--muted);margin-bottom:4px">- ${t}</div>`).join('')}
          </div>`;
        }
      } else if (routine.mode !== 'none') {
        if (todayDiv && !fitnessPlan) {
          todayDiv.innerHTML = `<div class="empty-state"><p>Nenhum treino disponível.<br>${routine.mode === 'ai' ? 'Configure seu perfil e clique em Gerar com IA.' : 'Selecione um plano predefinido para começar.'}</p></div>`;
        }
        if (weekDiv) {
          weekDiv.innerHTML = `<p class="text-sm text-muted">${routine.mode === 'ai' ? 'Gere um plano com IA para ver sua semana de treinos.' : 'Selecione um preset para montar seu plano semanal.'}</p>`;
        }
        if (planTag) planTag.style.display = 'none';
      }

      if (showSelectableFallback) {
        renderSelectableExercises();
      }

      // Badges
      const badgesDiv = document.getElementById('fitness-badges');
      if (gamificationOn && (fitnessGameState.badges || []).length > 0) {
        badgesDiv.innerHTML = fitnessGameState.badges.map(b => `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">${b.icon}</span>
            <div><div style="font-size:13px;font-weight:600">${b.title}</div><div style="font-size:11px;color:var(--muted)">${b.desc}</div></div>
          </div>`).join('');
      } else if (gamificationOn && badgesDiv) {
        badgesDiv.innerHTML = '<p class="text-sm text-muted">Complete treinos para desbloquear conquistas.</p>';
      } else if (badgesDiv) {
        badgesDiv.innerHTML = '<p class="text-sm text-muted">Ative a gamificação nas configurações para acompanhar conquistas fitness.</p>';
      }

      lucide.createIcons();
    }


