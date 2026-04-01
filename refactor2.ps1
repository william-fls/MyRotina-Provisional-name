$path = "c:\Users\willi\OneDrive\Desktop\MyRotina-Provisional-name\Rotina.html"
$content = Get-Content -Raw -Path $path -Encoding UTF8

# 1. REMOVE GAME-CARD FROM DASHBOARD
# Match the start of game-card to the end of game-card
$content = $content -replace '(?s)<div class="card game-card">.*?<div id="game-achievements" class="achievement-list"></div>\s*</div>', ''

# Change the grid-2 of Dashboard that had the game card and Ritmo Automatico
# Since we removed game-card, Ritmo Automatico is alone in grid-2. We can make it grid-1 or leave it.
# It doesn't hurt to have a single element take up half the grid, but let's change 'grid-2 mb-4' surrounding 'Ritmo Automático' to 'mb-4' if possible.
# Actually, the overview cards above it are grid-3. Ritmo Automático can just be full width.
$content = $content -replace '(?s)<div class="grid-2 mb-4">(.*?)<div class="card">\s*<div class="section-title">Ritmo Automático</div>', '<div class="mb-4">$1<div class="card"><div class="section-title">Ritmo Automático</div>'

# 2. ADD MISSIONS PAGE
$pageMissionsHTML = @'
    <!-- ==================== MISSIONS ==================== -->
    <section class="page" id="page-missions">
      <div class="dashboard-hero mb-4">
        <div>
          <h1 class="page-title" style="margin-bottom:4px">Missões e Conquistas 🛡️</h1>
          <p class="text-sm text-muted">Mantenha a consistência, ganhe XP e desbloqueie novas recompensas.</p>
        </div>
      </div>
      
      <div class="grid-2 mb-4">
        <div class="card game-card">
          <div class="flex items-center justify-between mb-3">
            <div class="section-title" style="margin-bottom:0">Seu Perfil</div>
            <span class="tag" id="game-rank-tag">Lv 1</span>
          </div>
          <div class="grid-3 mb-3">
            <div class="stat-box">
              <div class="stat-number" id="game-level">1</div>
              <div class="stat-label">Nível</div>
            </div>
            <div class="stat-box">
              <div class="stat-number" id="game-streak">0d</div>
              <div class="stat-label">Streak</div>
            </div>
            <div class="stat-box">
              <div class="stat-number" id="game-badges-count">0</div>
              <div class="stat-label">Conquistas</div>
            </div>
          </div>
          <div class="section-title" style="margin-bottom:8px">Progresso</div>
          <div class="flex items-center justify-between gap-3 mb-3">
            <span id="game-rank-title" class="text-sm font-bold">Aprendiz</span>
            <span id="game-xp" class="mono text-sm text-muted">0/120 XP</span>
          </div>
          <div class="progress-bar mb-2">
            <div class="progress-fill" id="game-level-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2));width:0%"></div>
          </div>
          <p id="game-next-level" class="text-sm text-muted mt-2 mb-2"></p>
        </div>
        
        <div class="card">
           <div class="section-title" style="margin-bottom:16px">Missões de Hoje</div>
           <p class="text-sm text-muted mb-4">Cumpra essas metas diárias para ganhar bônus de XP.</p>
           <div id="game-missions" class="mission-list"></div>
        </div>
      </div>

      <div class="card mb-4">
         <div class="section-title" style="margin-bottom:16px">Baú de Conquistas</div>
         <div id="game-achievements" class="achievement-list"></div>
      </div>
    </section>

'@

$content = $content -replace '(?s)<!-- ==================== TASKS ==================== -->\s*<section class="page" id="page-tasks">', "$pageMissionsHTML`n`n    <!-- ==================== TASKS ==================== -->`n    <section class=`"page`" id=`"page-tasks`">"

# 3. SIDEBAR CHANGES
$missionsSidebar = @'
    <a class="nav-item" data-page="missions" onclick="navigate('missions')">
      <i data-lucide="crosshair" style="width:20px;height:20px;flex-shrink:0"></i>
      <span class="nav-label">Missões</span>
    </a>
'@
$content = $content -replace '(?s)(<a class="nav-item"[^>]*data-page="tasks".*?</a>)', "`$1`n$missionsSidebar"
$content = $content -replace '(?s)<a class="nav-item"[^>]*data-page="habits".*?</a>', ""

# 4. FIX "Hábitos de Hoje" in Dashboard Recent Tasks
$content = $content.Replace('Hábitos de Hoje', 'Diárias Recorrentes')

# 5. REMODEL MISSIONS JAVASCRIPT
$newMissionsLogic = @'
function getDailyMissions(today) {
  const dailyTasks = tasks.filter(t => t.repeatDaily);
  const doneHabitsToday = dailyTasks.filter(t => (dailyTaskLogs[today] || []).includes(t.id)).length;
  
  const doneTasksToday = taskStats[today]?.done || 0;
  
  // Total daily tasks for a mission
  const allHabitsDone = dailyTasks.length > 0 && dailyTasks.every(t => (dailyTaskLogs[today] || []).includes(t.id));

  return [
    {
      id: 'mission_dailies',
      label: 'Disciplina Diária (Complete 3 diárias)',
      done: doneHabitsToday >= 3,
      xp: 25,
      type: 'daily',
      progress: Math.min(doneHabitsToday, 3) + '/3'
    },
    {
      id: 'mission_tasks',
      label: 'Foco Total (Cumpra 3 tarefas pontuais)',
      done: doneTasksToday >= 3,
      xp: 20,
      type: 'daily',
      progress: Math.min(doneTasksToday, 3) + '/3'
    },
    {
      id: 'mission_perfection',
      label: 'Dia Perfeito (Gabarite as recorrentes)',
      done: allHabitsDone && dailyTasks.length > 0,
      xp: 50,
      type: 'daily',
      progress: allHabitsDone ? '100%' : '0%'
    }
  ];
}
'@

$content = $content -replace '(?s)function getDailyMissions\(today\) \{.*?\n\}', $newMissionsLogic

# 6. ENHANCE MISSIONS RENDER JAVASCRIPT FOR UI
# Modifying renderGamePanel to show nice labels
$newMissionsRender = @'
    const ml = document.getElementById('game-missions');
    if (ml) {
      if (missions.length === 0) {
        ml.innerHTML = '<div class="empty-state"><p>Nenhuma missão hoje.</p></div>';
      } else {
        ml.innerHTML = missions.map(m => {
          const isClaimed = (gameState.missionsClaimed[today] || []).includes(m.id);
          const canClaim = m.done && !isClaimed;
          let btnHtml = '';
          if (isClaimed) {
             btnHtml = `<span class="badge badge-low" style="background:rgba(92,230,184,0.1);color:var(--success)"><i data-lucide="check" style="width:12px;height:12px;display:inline-block"></i> Concluída</span>`;
          } else if (canClaim) {
             btnHtml = `<button class="btn btn-primary" style="padding:4px 10px;font-size:11px" onclick="claimMission('${m.id}')">Resgatar +${m.xp} XP</button>`;
          } else {
             btnHtml = `<span class="text-sm text-muted">${m.progress}</span>`;
          }
          return `
            <div class="mission-row ${isClaimed ? 'done' : ''}">
              <div class="flex items-center justify-between mb-2">
                <span class="mission-label" style="${isClaimed ? 'text-decoration:line-through;opacity:0.6' : ''}">${m.label}</span>
                <span class="text-sm text-accent">+${m.xp} XP</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Missão ${m.type === 'daily' ? 'Diária' : 'Especial'}</span>
                ${btnHtml}
              </div>
            </div>`;
        }).join('');
      }
    }
'@

$content = $content -replace '(?s)const ml = document\.getElementById\(''game-missions''\);.*?\}\s*\n\s*\}', "$newMissionsRender"

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Output "Rotina JS e HTML atualizados para missoes exclusivas."
