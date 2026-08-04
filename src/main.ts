// src/main.ts - Complete Game with Game State Management
import { MapGenerator } from './world/MapGenerator';
import { Player } from './entities/Player';
import { Predator } from './entities/Predator';
import { GameRenderer } from './ui/DebugCanvas';
import { SoundEngine } from './audio/SoundEngine';
import { GameState } from './GameState';

console.log('🎮 Echo Locator - Final Version');

// --- 1. Create the GameState manager ---
const gameState = new GameState();

// --- 2. Game variables ---
let map: MapGenerator;
let player: Player;
let predator: Predator;
let soundEngine: SoundEngine;
let renderer: GameRenderer;
let canvas: HTMLCanvasElement;
let predatorInterval: ReturnType<typeof setInterval> | null = null;

// --- 3. Initialize/Restart the game ---
function initGame(): void {
  console.log('🔄 Initializing game...');

  // Clear ALL existing callbacks before setting up new ones
  gameState.clearCallbacks();

  if (predatorInterval) {
    clearInterval(predatorInterval);
    predatorInterval = null;
  }

  gameState.reset();

  // --- Create map ---
  map = new MapGenerator(10, 10);

  // --- Find player start position ---
  let startRow = 5;
  let startCol = 5;
  let attempts = 0;
  while (!map.isWalkable(startRow, startCol) && attempts < 50) {
    startRow = Math.floor(Math.random() * 6) + 2;
    startCol = Math.floor(Math.random() * 6) + 2;
    attempts++;
  }
  if (!map.isWalkable(startRow, startCol)) {
    for (let r = 1; r < 9; r++) {
      for (let c = 1; c < 9; c++) {
        if (map.isWalkable(r, c)) {
          startRow = r;
          startCol = c;
          break;
        }
      }
      if (map.isWalkable(startRow, startCol)) break;
    }
  }
  console.log(`Player starts at Row ${startRow}, Col ${startCol}`);

  // --- Place exit far from player ---
  const corners = [
    { row: 0, col: 0 },
    { row: 0, col: map.cols - 1 },
    { row: map.rows - 1, col: 0 },
    { row: map.rows - 1, col: map.cols - 1 }
  ];

  let farthestCorner = corners[0];
  let maxDistance = -1;

  for (const corner of corners) {
    if (map.isWalkable(corner.row, corner.col)) {
      const distance = Math.abs(corner.row - startRow) + Math.abs(corner.col - startCol);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestCorner = corner;
      }
    }
  }

  if (maxDistance === -1) {
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if ((r === 0 || r === map.rows - 1 || c === 0 || c === map.cols - 1) && map.isWalkable(r, c)) {
          const distance = Math.abs(r - startRow) + Math.abs(c - startCol);
          if (distance > maxDistance) {
            maxDistance = distance;
            farthestCorner = { row: r, col: c };
          }
        }
      }
    }
  }

  if (map.exitRow >= 0 && map.exitCol >= 0) {
    map.grid[map.exitRow][map.exitCol] = '.';
  }
  map.exitRow = farthestCorner.row;
  map.exitCol = farthestCorner.col;
  map.grid[map.exitRow][map.exitCol] = 'E';
  console.log(`Exit placed at Row ${map.exitRow}, Col ${map.exitCol}`);

  // --- Create player ---
  player = new Player(startRow, startCol, map);

  // --- Spawn predator in opposite corner ---
  let predStartRow = 0;
  let predStartCol = 0;
  let predDistance = -1;
  for (const corner of corners) {
    const dist = Math.abs(corner.row - startRow) + Math.abs(corner.col - startCol);
    if (map.isWalkable(corner.row, corner.col) && dist > predDistance) {
      predDistance = dist;
      predStartRow = corner.row;
      predStartCol = corner.col;
    }
  }
  if (predDistance === -1) {
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.isWalkable(r, c) && !map.isExit(r, c)) {
          const dist = Math.abs(r - startRow) + Math.abs(c - startCol);
          if (dist > predDistance) {
            predDistance = dist;
            predStartRow = r;
            predStartCol = c;
          }
        }
      }
    }
  }
  predator = new Predator(predStartRow, predStartCol, map, player);
  console.log(`Predator starts at Row ${predator.row}, Col ${predator.col}`);

  // --- Create sound engine ---
  soundEngine = new SoundEngine(map, player);

  // --- Setup canvas ---
  if (!canvas) {
    canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'gameCanvas';
      document.body.appendChild(canvas);
    }
  }

  renderer = new GameRenderer(canvas, 50);
  setupUI();
  renderGame();
  startPredatorAI();

  // --- Register game state callbacks ---
  gameState.onWin(() => {
    soundEngine.playWinSound();
    renderGame();
  });

  gameState.onLose(() => {
    soundEngine.playLoseSound();
    renderGame();
  });

  gameState.onRestart(() => {
    initGame();
  });

  console.log('✅ Game initialized! Click the page to unlock audio.');
}

// --- 4. UI Setup ---
function setupUI(): void {
  document.body.style.margin = '0';
  document.body.style.padding = '20px';
  document.body.style.backgroundColor = '#0a0a1a';
  document.body.style.display = 'flex';
  document.body.style.justifyContent = 'center';
  document.body.style.alignItems = 'center';
  document.body.style.minHeight = '100vh';
  document.body.style.flexDirection = 'column';

  if (!document.getElementById('gameInstructions')) {
    const instructions = document.createElement('div');
    instructions.id = 'gameInstructions';
    instructions.style.color = '#aaa';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '18px';
    instructions.style.marginBottom = '20px';
    instructions.style.textAlign = 'center';
    instructions.innerHTML = `
      <strong style="color:#fff;">🎮 Echo Locator</strong><br>
      Use <strong style="color:#00bfff;">W A S D</strong> to move<br>
      Press <strong style="color:#ffaa00;">SPACEBAR</strong> to ping 🔊<br>
      <span style="color:#ff4444;">🔴 Predator</span> <span style="color:#666;">|</span> 
      <span style="color:#00bfff;">🟦 Player</span> <span style="color:#666;">|</span> 
      <span style="color:#00ff00;">🟩 Exit</span><br>
      <span style="color:#ff6666;">⚠️ Pings attract the predator! Use them wisely.</span><br>
      <span style="color:#666; font-size:14px;">Press <strong style="color:#fff;">R</strong> to restart anytime</span>
    `;
    document.body.prepend(instructions);
  }
}

// --- 5. Render function ---
function renderGame(): void {
  const status = gameState.getStatus();
  renderer.render(map, player, predator, status);
}

// --- 6. Predator AI Loop ---
function startPredatorAI(): void {
  if (predatorInterval) {
    clearInterval(predatorInterval);
  }
  predatorInterval = setInterval(() => {
    if (gameState.isGameOver()) return;

    predator.update();

    if (predator.hasCaughtPlayer()) {
      gameState.setLose();
      if (predatorInterval) clearInterval(predatorInterval);
      renderGame();
      return;
    }

    renderGame();
  }, 600);
}

// --- 7. Start the game ---
initGame();

// --- 8. Click to unlock audio ---
document.addEventListener('click', () => {
  if (soundEngine) {
    soundEngine.unlockAudio();
    console.log('🔊 Click detected - audio unlocked!');
  }
}, { once: true });

// --- 9. Keyboard controls ---
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'r'].includes(key) ||
      e.key === ' ' || e.key === 'r' || e.key.startsWith('Arrow')) {
    e.preventDefault();
  }

  // --- R key: Restart ---
  if (key === 'r') {
    console.log('🔄 Restart requested...');
    gameState.reset();
    return;
  }

  if (gameState.isGameOver()) {
    return;
  }

  // --- SPACEBAR: Sonar Ping ---
  if (key === ' ' || e.key === ' ') {
    if (soundEngine && soundEngine.isReady()) {
      const pos = player.getPosition();
      soundEngine.ping();
      predator.setPingLocation(pos.row, pos.col);

      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100%';
      flash.style.height = '100%';
      flash.style.backgroundColor = 'rgba(0, 200, 255, 0.15)';
      flash.style.pointerEvents = 'none';
      flash.style.transition = 'opacity 0.3s';
      document.body.appendChild(flash);
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 300);
      }, 50);
    } else {
      console.warn('⚠️ Click the page first to unlock audio!');
    }
    return;
  }

  // --- Movement keys ---
  let moved = false;
  switch (key) {
    case 'w':
    case 'arrowup':
      moved = player.move('up');
      break;
    case 's':
    case 'arrowdown':
      moved = player.move('down');
      break;
    case 'a':
    case 'arrowleft':
      moved = player.move('left');
      break;
    case 'd':
    case 'arrowright':
      moved = player.move('right');
      break;
    default:
      return;
  }

  if (moved) {
    console.log(`Moved to Row ${player.row}, Col ${player.col}`);
    renderGame();
  }

  if (player.isAtExit()) {
    gameState.setWin();
    if (predatorInterval) clearInterval(predatorInterval);
    renderGame();
  }
});

console.log('✅ Echo Locator is fully ready!');
console.log('🎮 Use WASD to move, SPACEBAR to ping, R to restart.');