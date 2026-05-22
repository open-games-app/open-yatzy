import { YatzyEngine, ScoringCategory } from './engine.js';
import { DiceComponent } from './dice.js';
import { SocialPlatform } from './social.js';
import { audio } from './audio.js';

// Setup elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const btnRoll = document.getElementById('btn-roll');
const btnReset = document.getElementById('btn-reset');
const btnLogin = document.getElementById('btn-login');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const drawer = document.getElementById('leaderboard-drawer');
const drawerClose = document.getElementById('drawer-close');
const leaderboardList = document.getElementById('leaderboard-list');
const userDisplay = document.getElementById('user-display');
const rollsRemainingText = document.getElementById('rolls-remaining');
const statusDescText = document.getElementById('status-desc');
const tableContainer = document.getElementById('scorecard-table-container');

// Modal Elements
const modal = document.getElementById('gameover-modal');

// Instantiate state classes
const engine = new YatzyEngine();
const social = new SocialPlatform();
const diceComponents = [];

// Physics / Loop timer variables
let lastTime = performance.now();
const diceSize = 75;

// Multiplayer setup state
let selectedPlayerCount = 2;
let isDiceRolling = false;

// Category labels
const categoryLabels = {
  [ScoringCategory.ONES]: 'Ones',
  [ScoringCategory.TWOS]: 'Twos',
  [ScoringCategory.THREES]: 'Threes',
  [ScoringCategory.FOURS]: 'Fours',
  [ScoringCategory.FIVES]: 'Fives',
  [ScoringCategory.SIXES]: 'Sixes',
  [ScoringCategory.THREE_OF_A_KIND]: 'Three of a Kind',
  [ScoringCategory.FOUR_OF_A_KIND]: 'Four of a Kind',
  [ScoringCategory.FULL_HOUSE]: 'Full House',
  [ScoringCategory.SMALL_STRAIGHT]: 'Small Straight',
  [ScoringCategory.LARGE_STRAIGHT]: 'Large Straight',
  [ScoringCategory.YATZY]: 'Yatzy!',
  [ScoringCategory.CHANCE]: 'Chance'
};

const categoryInstructions = {
  [ScoringCategory.ONES]: 'Score sum of 1s',
  [ScoringCategory.TWOS]: 'Score sum of 2s',
  [ScoringCategory.THREES]: 'Score sum of 3s',
  [ScoringCategory.FOURS]: 'Score sum of 4s',
  [ScoringCategory.FIVES]: 'Score sum of 5s',
  [ScoringCategory.SIXES]: 'Score sum of 6s',
  [ScoringCategory.THREE_OF_A_KIND]: 'Sum if 3+ matching',
  [ScoringCategory.FOUR_OF_A_KIND]: 'Sum if 4+ matching',
  [ScoringCategory.FULL_HOUSE]: '3 of kind + pair (25)',
  [ScoringCategory.SMALL_STRAIGHT]: 'Sequence of 4 (30)',
  [ScoringCategory.LARGE_STRAIGHT]: 'Sequence of 5 (40)',
  [ScoringCategory.YATZY]: '5 matching (50)',
  [ScoringCategory.CHANCE]: 'Sum of all 5 dice'
};

const categoryIcons = {
  [ScoringCategory.ONES]: 'looks_one',
  [ScoringCategory.TWOS]: 'looks_two',
  [ScoringCategory.THREES]: 'looks_3',
  [ScoringCategory.FOURS]: 'looks_4',
  [ScoringCategory.FIVES]: 'looks_5',
  [ScoringCategory.SIXES]: 'looks_6',
  [ScoringCategory.THREE_OF_A_KIND]: 'filter_3',
  [ScoringCategory.FOUR_OF_A_KIND]: 'filter_4',
  [ScoringCategory.FULL_HOUSE]: 'home',
  [ScoringCategory.SMALL_STRAIGHT]: 'linear_scale',
  [ScoringCategory.LARGE_STRAIGHT]: 'forward',
  [ScoringCategory.YATZY]: 'emoji_events',
  [ScoringCategory.CHANCE]: 'help_outline'
};

const upperCategories = [
  ScoringCategory.ONES,
  ScoringCategory.TWOS,
  ScoringCategory.THREES,
  ScoringCategory.FOURS,
  ScoringCategory.FIVES,
  ScoringCategory.SIXES
];

const lowerCategories = [
  ScoringCategory.THREE_OF_A_KIND,
  ScoringCategory.FOUR_OF_A_KIND,
  ScoringCategory.FULL_HOUSE,
  ScoringCategory.SMALL_STRAIGHT,
  ScoringCategory.LARGE_STRAIGHT,
  ScoringCategory.YATZY,
  ScoringCategory.CHANCE
];

// Theme Icon Sync
function updateThemeToggleIcons(theme) {
  const iconName = theme === 'light' ? 'dark_mode' : 'light_mode';
  const setupIcon = document.querySelector('#btn-theme-toggle-setup .material-symbols-outlined');
  const gameIcon = document.querySelector('#btn-theme-toggle-game .material-symbols-outlined');
  if (setupIcon) setupIcon.innerText = iconName;
  if (gameIcon) gameIcon.innerText = iconName;
}

// Initialization
function init() {
  selectedPlayerCount = 2;

  // Bind exit tab button
  const tabExit = document.getElementById('tab-exit');
  if (tabExit) {
    tabExit.addEventListener('click', () => {
      showCustomDialog({
        title: 'Exit Match?',
        message: 'Are you sure you want to exit the current match? Your progress will be saved.',
        icon: '🚪',
        showCancel: true,
        yesText: 'Exit',
        noText: 'Cancel',
        onConfirm: () => {
          saveGameState();
          document.getElementById('game-screen').style.display = 'none';
          document.getElementById('setup-screen').style.display = 'flex';
          document.body.classList.add('setup-active');
        }
      });
    });
  }

  // Set up social SDK
  social.initialize().then(() => {
    updateSocialHeader();
    refreshLeaderboard();
  });

  // Set up social SDK
  social.initialize().then(() => {
    updateSocialHeader();
    refreshLeaderboard();
  });

  // Bind main window events
  window.addEventListener('resize', onResize);
  canvas.addEventListener('pointerdown', onCanvasPointerDown);

  // Bind controls
  btnRoll.addEventListener('click', rollDice);
  btnReset.addEventListener('click', resetGame);
  if (btnLogin) btnLogin.addEventListener('click', loginSocial);
  btnLeaderboard.addEventListener('click', openLeaderboard);
  drawerClose.addEventListener('click', closeLeaderboard);

  // Back to setup screen
  document.getElementById('btn-back').addEventListener('click', () => {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'flex';
    document.body.classList.add('setup-active');
  });

  // Start match
  document.getElementById('btn-start').addEventListener('click', () => {
    const names = [];
    for (let i = 1; i <= selectedPlayerCount; i++) {
      const val = document.getElementById(`input-p${i}`).value.trim();
      names.push(val !== '' ? val : `Player ${i}`);
    }

    engine.setupPlayers(selectedPlayerCount, names);
    localStorage.removeItem('saved_yatzy_match');
    const resumeSection = document.getElementById('resume-section');
    if (resumeSection) resumeSection.style.display = 'none';

    // Swap views
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    document.body.classList.remove('setup-active');

    // Refresh layout and sizes
    resizeCanvas();
    setupDice();
    updateUI();
  });

  // Resume match
  const btnResume = document.getElementById('btn-resume');
  const resumeSection = document.getElementById('resume-section');
  if (localStorage.getItem('saved_yatzy_match')) {
    resumeSection.style.display = 'block';
  }
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      const loaded = loadGameState();
      if (loaded) {
        // Swap views
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'flex';
        document.body.classList.remove('setup-active');
        
        // Refresh layout
        resizeCanvas();
        setupDice();
        
        // Set visual holds and values on the loaded dice
        diceComponents.forEach((die, i) => {
          die.visualValue = engine.diceValues[i];
          die.targetValue = engine.diceValues[i];
          die.held = engine.heldDice[i];
        });
        
        updateUI();
      }
    });
  }

  // Rules Modal bindings
  const rulesModal = document.getElementById('rules-modal');
  const btnRulesSetup = document.getElementById('btn-rules-setup');
  const btnRulesGame = document.getElementById('btn-rules');
  const btnCloseRules = document.getElementById('btn-close-rules');
  const btnCloseRulesBottom = document.getElementById('btn-close-rules-bottom');

  const openRules = () => {
    rulesModal.classList.add('open');
  };
  const closeRules = () => {
    rulesModal.classList.remove('open');
  };

  if (btnRulesSetup) btnRulesSetup.addEventListener('click', openRules);
  if (btnRulesGame) btnRulesGame.addEventListener('click', openRules);
  if (btnCloseRules) btnCloseRules.addEventListener('click', closeRules);
  if (btnCloseRulesBottom) btnCloseRulesBottom.addEventListener('click', closeRules);

  // Confirm turn handoff
  const btnHandoffConfirm = document.getElementById('btn-handoff-confirm');
  if (btnHandoffConfirm) {
    btnHandoffConfirm.addEventListener('click', () => {
      document.getElementById('handoff-modal').classList.remove('open');
      updateUI();
    });
  }

  // Filter player name event listener
  const filterInput = document.getElementById('filter-player-name');
  if (filterInput) {
    filterInput.addEventListener('input', refreshLeaderboard);
  }

  // Table category click event delegation
  tableContainer.addEventListener('click', (e) => {
    const row = e.target.closest('.category-row.clickable');
    if (row) {
      const category = row.dataset.category;
      selectCategory(category);
    }
  });

  // Start with Setup screen
  document.getElementById('setup-screen').style.display = 'flex';
  document.getElementById('game-screen').style.display = 'none';
  document.body.classList.add('setup-active');

  // Start animation loop
  requestAnimationFrame(loop);
}

// Game state saving / resuming
function saveGameState() {
  if (engine.isGameOver) {
    localStorage.removeItem('saved_yatzy_match');
    return;
  }
  const state = {
    playerCount: engine.playerCount,
    playerNames: engine.playerNames,
    activePlayerIndex: engine.activePlayerIndex,
    scorecards: engine.scorecards,
    diceValues: engine.diceValues,
    heldDice: engine.heldDice,
    rollsRemaining: engine.rollsRemaining,
    isGameOver: engine.isGameOver
  };
  localStorage.setItem('saved_yatzy_match', JSON.stringify(state));
}

function saveMatchToHistory(p1, p2, s1, s2) {
  try {
    const history = JSON.parse(localStorage.getItem('yatzy_match_history') || '[]');
    let winner = '';
    let defeatedOpponent = '';
    let winnerScore = 0;
    let margin = 0;
    
    if (s1 > s2) {
      winner = p1;
      defeatedOpponent = p2;
      winnerScore = s1;
      margin = s1 - s2;
    } else if (s2 > s1) {
      winner = p2;
      defeatedOpponent = p1;
      winnerScore = s2;
      margin = s2 - s1;
    } else {
      winner = 'Draw';
      winnerScore = s1;
      margin = 0;
    }

    history.push({
      player1: p1,
      player2: p2,
      score1: s1,
      score2: s2,
      winner: winner,
      winnerScore: winnerScore,
      defeatedOpponent: defeatedOpponent,
      margin: margin,
      timestamp: Date.now()
    });

    localStorage.setItem('yatzy_match_history', JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save match history:', e);
  }
}

function loadGameState() {
  const serialized = localStorage.getItem('saved_yatzy_match');
  if (!serialized) return false;
  try {
    const state = JSON.parse(serialized);
    if (!state || state.isGameOver) return false;

    engine.playerCount = state.playerCount;
    engine.playerNames = state.playerNames;
    engine.activePlayerIndex = state.activePlayerIndex;
    engine.scorecards = state.scorecards;
    engine.diceValues = state.diceValues;
    engine.heldDice = state.heldDice;
    engine.rollsRemaining = state.rollsRemaining;
    engine.isGameOver = state.isGameOver;

    selectedPlayerCount = state.playerCount;

    return true;
  } catch (e) {
    console.error("Error loading game state:", e);
    return false;
  }
}

// Name inputs updated in HTML, no-op helper

// Responsive layout adjusting
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  ctx.scale(dpr, dpr);
}

function setupDice() {
  diceComponents.length = 0;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;

  const spacing = rect.width / 6;
  const centerY = rect.height / 2;
  const dynamicDiceSize = Math.min(75, rect.width / 6.5, rect.height * 0.7);

  for (let i = 0; i < 5; i++) {
    const x = spacing * (i + 1);
    const y = centerY;

    const die = new DiceComponent(i, x, y, dynamicDiceSize, () => {
      if (engine.rollsRemaining === 3 || engine.rollsRemaining < 0 || engine.isGameOver || isDiceRolling) return;
      const succeeded = engine.toggleHold(i);
      if (succeeded) {
        die.held = engine.heldDice[i];
        die.triggerTapBounce();
        audio.playClick();
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
        saveGameState();
        updateUI();
      }
    });

    die.visualValue = engine.diceValues[i];
    die.held = engine.heldDice[i];
    diceComponents.push(die);
  }
}

function onResize() {
  resizeCanvas();

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;

  const spacing = rect.width / 6;
  const centerY = rect.height / 2;
  const dynamicDiceSize = Math.min(75, rect.width / 6.5, rect.height * 0.7);

  diceComponents.forEach((die, i) => {
    die.x = spacing * (i + 1);
    die.y = centerY;
    die.size = dynamicDiceSize;
  });
}

// Input routing
function onCanvasPointerDown(e) {
  const rect = canvas.getBoundingClientRect();
  let mx = e.clientX - rect.left;
  let my = e.clientY - rect.top;
  
  // Invert touch coordinates for Player 2 (board is rotated 180 degrees)
  if (engine.activePlayerIndex === 1) {
    mx = rect.width - mx;
    my = rect.height - my;
  }
  handleTap(mx, my);
}

function handleTap(mx, my) {
  diceComponents.forEach(die => {
    if (die.isTapped(mx, my)) {
      die.onTap();
    }
  });
}

// Actions
function rollDice() {
  if (engine.rollsRemaining > 0 && !engine.isGameOver && !isDiceRolling) {
    isDiceRolling = true;
    engine.rollDice();

    audio.playRoll();
    if (navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }

    // Sync components and trigger rolls
    diceComponents.forEach((die, i) => {
      die.held = engine.heldDice[i];
      if (!die.held || engine.rollsRemaining === 2) {
        die.roll(engine.diceValues[i]);
      }
    });

    saveGameState();
    updateUI();
  }
}

function selectCategory(category) {
  if (engine.rollsRemaining === 3) {
    showCustomDialog({
      title: 'Roll First!',
      message: 'Roll the dice first before choosing a category!',
      icon: '🎲',
      showCancel: false,
      yesText: 'Got it'
    });
    return;
  }
  if (isDiceRolling) {
    return;
  }

  const succeeded = engine.selectCategory(category);
  if (succeeded) {
    audio.playScore();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Reset visual die statuses
    diceComponents.forEach(die => {
      die.held = false;
      die.visualValue = 1;
      die.targetValue = 1;
      die.angle = 0;
      die.scaleFactor = 1.0;
    });

    if (engine.isGameOver) {
      localStorage.removeItem('saved_yatzy_match');
      const resumeSection = document.getElementById('resume-section');
      if (resumeSection) resumeSection.style.display = 'none';

      audio.playGameOver();

      // Save completed match to local history
      if (engine.playerCount >= 2) {
        const p1 = engine.playerNames[0];
        const p2 = engine.playerNames[1];
        const s1 = engine.getTotalScore(0);
        const s2 = engine.getTotalScore(1);
        saveMatchToHistory(p1, p2, s1, s2);
      }

      let maxScore = 0;
      for (let i = 0; i < engine.playerCount; i++) {
        const score = engine.getTotalScore(i);
        if (score > maxScore) maxScore = score;
      }
      social.submitScore(maxScore).then(() => {
        refreshLeaderboard();
        showGameOver();
      });
    } else {
      saveGameState();
      updateUI();
    }
  }
}

function resetGame() {
  showCustomDialog({
    title: 'Reset Match?',
    message: 'Are you sure you want to reset the current match? Your progress will be lost.',
    icon: '🔄',
    showCancel: true,
    yesText: 'Reset',
    noText: 'Cancel',
    onConfirm: () => {
      engine.resetGame();
      localStorage.removeItem('saved_yatzy_match');
      const resumeSection = document.getElementById('resume-section');
      if (resumeSection) resumeSection.style.display = 'none';

      // Clear visual die holds
      diceComponents.forEach(die => {
        die.held = false;
        die.visualValue = 1;
        die.targetValue = 1;
        die.angle = 0;
        die.scaleFactor = 1.0;
      });

      modal.classList.remove('open');
      updateUI();
    }
  });
}

function showHandoffModal(playerName) {
  const handoffModal = document.getElementById('handoff-modal');
  const handoffPlayerName = document.getElementById('handoff-player-name');
  handoffPlayerName.innerText = playerName;
  handoffModal.classList.add('open');
}

function showGameOver() {
  const playerRankings = [];
  for (let i = 0; i < engine.playerCount; i++) {
    playerRankings.push({
      name: engine.playerNames[i],
      score: engine.getTotalScore(i)
    });
  }
  playerRankings.sort((a, b) => b.score - a.score);

  const modalContent = modal.querySelector('.modal-content');

  let rankingsHtml = `
    <div class="modal-title">🏆 Match Completed!</div>
    <div style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 8px;">Final standings:</div>
    <div class="ranking-container">
  `;

  playerRankings.forEach((player, index) => {
    let rankEmoji = `${index + 1}.`;
    if (index === 0) rankEmoji = '🥇';
    else if (index === 1) rankEmoji = '🥈';
    else if (index === 2) rankEmoji = '🥉';

    const isWinner = index === 0;
    rankingsHtml += `
      <div class="ranking-item ${isWinner ? 'winner' : ''}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${rankEmoji}</span>
          <span>${player.name}</span>
        </div>
        <span>${player.score} pts</span>
      </div>
    `;
  });

  rankingsHtml += `
    </div>
    <button id="modal-restart" class="btn-roll" style="width: auto; margin-top: 10px;">
      Back to Menu
    </button>
  `;

  modalContent.innerHTML = rankingsHtml;

  document.getElementById('modal-restart').addEventListener('click', () => {
    modal.classList.remove('open');
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'flex';
    document.body.classList.add('setup-active');
  });

  modal.classList.add('open');
}

// UI Updating
function updateUI() {
  const activeIdx = engine.activePlayerIndex;
  const activePlayerName = engine.playerNames[activeIdx];
  document.getElementById('active-player-name').innerText = `TURN: ${activePlayerName.toUpperCase()}`;

  rollsRemainingText.innerText = `ROLLS REMAINING: ${engine.rollsRemaining}/3`;

  if (engine.rollsRemaining === 3) {
    statusDescText.innerText = "Roll dice to begin!";
  } else if (engine.rollsRemaining === 0) {
    statusDescText.innerText = "Select score category";
  } else {
    statusDescText.innerText = "Tap to hold, roll again!";
  }

  // Roll button state & dynamic color
  btnRoll.disabled = (engine.rollsRemaining === 0 || engine.isGameOver || isDiceRolling);
  const activeColor = activeIdx === 0 ? 'var(--color-accent-indigo)' : 'var(--color-accent-secondary)';
  btnRoll.style.background = activeColor;
  btnRoll.style.borderColor = 'var(--color-accent-gold)';

  // Toggle p2-turn class for Player 2 turn background
  if (activeIdx === 1) {
    document.body.classList.add('p2-turn');
  } else {
    document.body.classList.remove('p2-turn');
  }

  // Rotate game board card for Player 2
  const boardCard = document.getElementById('game-board-card');
  if (boardCard) {
    if (activeIdx === 1) {
      boardCard.classList.add('rotated');
    } else {
      boardCard.classList.remove('rotated');
    }
  }

  // Update dynamic round/scores tab
  const tabRound = document.getElementById('tab-round');
  if (tabRound) {
    const p1Score = engine.getTotalScore(0);
    const p2Score = engine.getTotalScore(1);
    const activeColorDot = activeIdx === 0 ? 'var(--color-accent-indigo)' : 'var(--color-accent-secondary)';
    tabRound.innerHTML = `${p2Score}<span class="score-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${activeColorDot}; margin: 0 4px; vertical-align: middle;"></span>${p1Score}`;
  }

  // Render dynamic scorecard table
  renderScorecard();
}

function renderScorecard() {
  const activeIdx = engine.activePlayerIndex;
  const hasRolled = engine.rollsRemaining < 3;

  let html = `<table class="scorecard-table"><tbody>`;

  // 1. Upper Section Categories
  upperCategories.forEach(cat => {
    html += renderCategoryRow(cat, activeIdx, hasRolled);
  });

  // 2. Upper Section Summaries
  html += `
    <tr class="summary-row-tr">
      <td class="category-cell summary-label">Subtotal</td>
      <td class="player-cell p2-cell filled summary-val">${engine.getUpperSectionSum(1)}</td>
      <td class="player-cell p1-cell filled summary-val">${engine.getUpperSectionSum(0)}</td>
    </tr>
    <tr class="summary-row-tr">
      <td class="category-cell summary-label">Bonus (+35)</td>
      <td class="player-cell p2-cell filled summary-val">+${engine.getUpperSectionBonus(1)}</td>
      <td class="player-cell p1-cell filled summary-val">+${engine.getUpperSectionBonus(0)}</td>
    </tr>
  `;

  // 3. Lower Section Categories
  lowerCategories.forEach(cat => {
    html += renderCategoryRow(cat, activeIdx, hasRolled);
  });

  // 4. Grand Total Summary
  html += `
    <tr class="summary-row-tr grand-total">
      <td class="category-cell summary-label">GRAND TOTAL</td>
      <td class="player-cell p2-cell filled summary-val grand-val">${engine.getTotalScore(1)}</td>
      <td class="player-cell p1-cell filled summary-val grand-val">${engine.getTotalScore(0)}</td>
    </tr>
  `;

  html += `</tbody></table>`;

  tableContainer.innerHTML = `
    <div class="scorecard-table-wrapper">
      ${html}
    </div>
  `;
}

function renderCategoryRow(cat, activeIdx, hasRolled) {
  const isP1Filled = engine.scorecards[0][cat] !== null;
  const isP2Filled = engine.scorecards[1][cat] !== null;
  
  const isActiveP1 = activeIdx === 0;
  const isActiveP2 = activeIdx === 1;
  
  const isFilled = activeIdx === 0 ? isP1Filled : isP2Filled;
  const isClickable = !isFilled && !engine.isGameOver && !isDiceRolling;
  const showPreview = hasRolled && !isDiceRolling;

  // Category symbol/icon column
  const symbolHtml = getCategorySymbol(cat);

  // Player 2 Cell (Index 1)
  let p2CellHtml = '';
  const p2Score = engine.scorecards[1][cat];
  if (p2Score !== null) {
    p2CellHtml = `<td class="player-cell p2-cell filled"><span class="cell-value">${p2Score}</span></td>`;
  } else if (isActiveP2 && showPreview) {
    const preview = engine.calculateScore(cat, engine.diceValues);
    p2CellHtml = `<td class="player-cell p2-cell preview"><span class="cell-value">${preview}</span></td>`;
  } else {
    p2CellHtml = `<td class="player-cell p2-cell empty"><span class="cell-value">-</span></td>`;
  }

  // Player 1 Cell (Index 0)
  let p1CellHtml = '';
  const p1Score = engine.scorecards[0][cat];
  if (p1Score !== null) {
    p1CellHtml = `<td class="player-cell p1-cell filled"><span class="cell-value">${p1Score}</span></td>`;
  } else if (isActiveP1 && showPreview) {
    const preview = engine.calculateScore(cat, engine.diceValues);
    p1CellHtml = `<td class="player-cell p1-cell preview"><span class="cell-value">${preview}</span></td>`;
  } else {
    p1CellHtml = `<td class="player-cell p1-cell empty"><span class="cell-value">-</span></td>`;
  }

  const rowClass = `category-row ${isClickable ? 'clickable' : ''} ${isClickable && showPreview ? 'active-roll' : ''}`;
  
  return `
    <tr class="${rowClass}" data-category="${cat}">
      <td class="category-cell">${symbolHtml}</td>
      ${p2CellHtml}
      ${p1CellHtml}
    </tr>
  `;
}

function getCategorySymbol(cat) {
  switch (cat) {
    case ScoringCategory.ONES:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`;
    case ScoringCategory.TWOS:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="currentColor"/></svg>`;
    case ScoringCategory.THREES:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="7" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="17" cy="17" r="2" fill="currentColor"/></svg>`;
    case ScoringCategory.FOURS:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="8" r="2" fill="currentColor"/><circle cx="8" cy="16" r="2" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="currentColor"/></svg>`;
    case ScoringCategory.FIVES:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="7" r="2" fill="currentColor"/><circle cx="17" cy="7" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="7" cy="17" r="2" fill="currentColor"/><circle cx="17" cy="17" r="2" fill="currentColor"/></svg>`;
    case ScoringCategory.SIXES:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="7" r="2" fill="currentColor"/><circle cx="8" cy="12" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="17" r="2" fill="currentColor"/><circle cx="16" cy="17" r="2" fill="currentColor"/></svg>`;
    case ScoringCategory.THREE_OF_A_KIND:
      return `<svg viewBox="0 0 54 18" class="svg-cat-icon-wide"><rect x="2" y="3" width="12" height="12" rx="1" fill="currentColor"/><rect x="20" y="3" width="12" height="12" rx="1" fill="currentColor"/><rect x="38" y="3" width="12" height="12" rx="1" fill="currentColor"/></svg>`;
    case ScoringCategory.FOUR_OF_A_KIND:
      return `<svg viewBox="0 0 72 18" class="svg-cat-icon-wide"><circle cx="8" cy="9" r="5" fill="currentColor"/><circle cx="26" cy="9" r="5" fill="currentColor"/><circle cx="44" cy="9" r="5" fill="currentColor"/><circle cx="62" cy="9" r="5" fill="currentColor"/></svg>`;
    case ScoringCategory.FULL_HOUSE:
      return `<svg viewBox="0 0 90 18" class="svg-cat-icon-wide"><path d="M 10 3 L 16 9 L 10 15 L 4 9 Z" fill="currentColor"/><path d="M 28 3 L 34 9 L 28 15 L 22 9 Z" fill="currentColor"/><path d="M 46 3 L 52 9 L 46 15 L 40 9 Z" fill="currentColor"/><circle cx="68" cy="9" r="5" fill="currentColor"/><circle cx="86" cy="9" r="5" fill="currentColor"/></svg>`;
    case ScoringCategory.SMALL_STRAIGHT:
      return `<svg viewBox="0 0 72 18" class="svg-cat-icon-wide"><rect x="3" y="4" width="10" height="10" rx="1" fill="currentColor"/><path d="M 26 3 L 32 9 L 26 15 L 20 9 Z" fill="currentColor"/><circle cx="44" cy="9" r="5" fill="currentColor"/><path d="M 62 3 L 68 14 L 56 14 Z" fill="currentColor"/></svg>`;
    case ScoringCategory.LARGE_STRAIGHT:
      return `<svg viewBox="0 0 90 18" class="svg-cat-icon-wide"><rect x="3" y="4" width="10" height="10" rx="1" fill="currentColor"/><path d="M 26 3 L 32 9 L 26 15 L 20 9 Z" fill="currentColor"/><circle cx="44" cy="9" r="5" fill="currentColor"/><path d="M 62 3 L 68 14 L 56 14 Z" fill="currentColor"/><path d="M 80 2 L 82 7 L 87 7 L 83 10 L 85 15 L 80 12 L 75 15 L 77 10 L 73 7 L 78 7 Z" fill="currentColor"/></svg>`;
    case ScoringCategory.YATZY:
      return `<svg viewBox="0 0 90 18" class="svg-cat-icon-wide"><path d="M 10 2 L 12 7 L 17 7 L 13 10 L 15 15 L 10 12 L 5 15 L 7 10 L 3 7 L 8 7 Z" fill="currentColor"/><path d="M 28 2 L 30 7 L 35 7 L 31 10 L 33 15 L 28 12 L 23 15 L 25 10 L 21 7 L 26 7 Z" fill="currentColor"/><path d="M 46 2 L 48 7 L 53 7 L 49 10 L 51 15 L 46 12 L 41 15 L 43 10 L 39 7 L 44 7 Z" fill="currentColor"/><path d="M 68 2 L 70 7 L 75 7 L 71 10 L 73 15 L 68 12 L 63 15 L 65 10 L 61 7 L 66 7 Z" fill="currentColor"/><path d="M 86 2 L 88 7 L 93 7 L 89 10 L 91 15 L 86 12 L 81 15 L 83 10 L 79 7 L 84 7 Z" fill="currentColor"/></svg>`;
    case ScoringCategory.CHANCE:
      return `<svg viewBox="0 0 24 24" class="svg-cat-icon"><text x="12" y="18" font-family="'Outfit', sans-serif" font-size="16" font-weight="bold" fill="currentColor" text-anchor="middle">?</text></svg>`;
    default:
      return '';
  }
}

// Social Platform Sync
function updateSocialHeader() {
  if (social.currentUser) {
    if (btnLogin) btnLogin.style.display = 'none';
    userDisplay.style.display = 'inline';
    userDisplay.innerText = social.currentUser.displayName;
  } else {
    if (btnLogin) btnLogin.style.display = 'inline';
    userDisplay.style.display = 'none';
  }
}

function loginSocial() {
  social.login().then(user => {
    if (user) {
      updateSocialHeader();
      let maxScore = 0;
      for (let i = 0; i < engine.playerCount; i++) {
        const score = engine.getTotalScore(i);
        if (score > maxScore) maxScore = score;
      }
      social.submitScore(maxScore).then(() => {
        refreshLeaderboard();
      });
    }
  });
}

function openLeaderboard() {
  refreshLeaderboard();
  drawer.classList.add('open');
}

function closeLeaderboard() {
  drawer.classList.remove('open');
}

function refreshLeaderboard() {
  const filterInput = document.getElementById('filter-player-name');
  const filterVal = filterInput ? filterInput.value.trim().toLowerCase() : '';
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('yatzy_match_history') || '[]');
  } catch (e) {
    console.error('Failed to load match history:', e);
  }

  // Sort descending by timestamp (newest first)
  history.sort((a, b) => b.timestamp - a.timestamp);

  const filterStatsDiv = document.getElementById('filter-stats');
  if (filterVal && filterStatsDiv) {
    // Calculate stats
    let wins = 0;
    let losses = 0;
    let draws = 0;

    history.forEach(match => {
      const p1 = (match.player1 || '').toLowerCase();
      const p2 = (match.player2 || '').toLowerCase();
      const winner = (match.winner || '').toLowerCase();

      if (p1.includes(filterVal) || p2.includes(filterVal)) {
        if (winner === 'draw') {
          draws++;
        } else if (winner.includes(filterVal)) {
          wins++;
        } else {
          losses++;
        }
      }
    });

    const statsWinsElem = document.getElementById('stats-wins');
    const statsLossesElem = document.getElementById('stats-losses');
    const statsDrawsElem = document.getElementById('stats-draws');
    if (statsWinsElem) statsWinsElem.innerText = wins;
    if (statsLossesElem) statsLossesElem.innerText = losses;
    if (statsDrawsElem) statsDrawsElem.innerText = draws;
    filterStatsDiv.style.display = 'flex';
  } else if (filterStatsDiv) {
    filterStatsDiv.style.display = 'none';
  }

  leaderboardList.innerHTML = '';

  // Filter list
  const filteredHistory = history.filter(match => {
    if (!filterVal) return true;
    const p1 = (match.player1 || '').toLowerCase();
    const p2 = (match.player2 || '').toLowerCase();
    return p1.includes(filterVal) || p2.includes(filterVal);
  });

  if (filteredHistory.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.color = '#64748b';
    emptyMsg.style.padding = '30px 16px';
    emptyMsg.style.fontSize = '14px';
    emptyMsg.innerText = 'No matches found.';
    leaderboardList.appendChild(emptyMsg);
    return;
  }

  filteredHistory.forEach(match => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'stretch';
    item.style.gap = '4px';
    item.style.padding = '12px';
    item.style.borderBottom = '1px solid #E2E8F0';

    let text = '';
    if (match.winner === 'Draw') {
      text = `<strong>Draw:</strong> ${match.player1} & ${match.player2} tied at ${match.winnerScore} pts`;
    } else {
      text = `🏆 <strong>${match.winner}</strong> won with <strong>${match.winnerScore} pts</strong>, defeating ${match.defeatedOpponent} by <strong>${match.margin} pts</strong>`;
    }

    const dateStr = match.timestamp 
      ? new Date(match.timestamp).toLocaleDateString() + ' ' + new Date(match.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      : '';

    item.innerHTML = `
      <div style="font-size: 13px; color: #0F172A; line-height: 1.4;">${text}</div>
      <div style="font-size: 10px; color: #64748b; text-align: right; margin-top: 2px;">
        ${dateStr}
      </div>
    `;
    leaderboardList.appendChild(item);
  });
}

// Animation loop
function loop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  // Clear canvas
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Update and draw dice components
    const unrolled = engine.rollsRemaining === 3;
    diceComponents.forEach(die => {
      die.update(dt);
      die.draw(ctx, unrolled);
    });
  }

  // Check if dice completed rolling
  const currentlyRolling = diceComponents.some(die => die.rollTimer > 0);
  if (isDiceRolling && !currentlyRolling) {
    isDiceRolling = false;
    updateUI(); // Re-render to show previews and enable clicks now that roll is revealed!
  }

  requestAnimationFrame(loop);
}

function showCustomDialog({ title, message, icon = '⚠️', showCancel = true, yesText = 'Yes', noText = 'No', onConfirm, onCancel }) {
  const modal = document.getElementById('custom-dialog-modal');
  const titleEl = document.getElementById('custom-dialog-title');
  const msgEl = document.getElementById('custom-dialog-message');
  const iconEl = document.getElementById('custom-dialog-icon');
  const btnYes = document.getElementById('custom-dialog-yes');
  const btnNo = document.getElementById('custom-dialog-no');
  const btnClose = document.getElementById('custom-dialog-close');

  titleEl.innerText = title;
  msgEl.innerHTML = message;
  iconEl.innerText = icon;
  btnYes.innerText = yesText;
  btnNo.innerText = noText;

  if (showCancel) {
    btnNo.style.display = 'block';
  } else {
    btnNo.style.display = 'none';
  }

  // Clear previous listeners
  const newBtnYes = btnYes.cloneNode(true);
  const newBtnNo = btnNo.cloneNode(true);
  const newBtnClose = btnClose.cloneNode(true);

  btnYes.parentNode.replaceChild(newBtnYes, btnYes);
  btnNo.parentNode.replaceChild(newBtnNo, btnNo);
  btnClose.parentNode.replaceChild(newBtnClose, btnClose);

  const closeModal = () => {
    modal.classList.remove('open');
  };

  newBtnYes.addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });

  newBtnNo.addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });

  newBtnClose.addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });

  modal.classList.add('open');
}

// Launch application
init();
