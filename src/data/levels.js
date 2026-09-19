// src/data/levels.js
// 70 level layouts across 7 decades for Allan's Birthday Tanks

import { MILESTONES, WORLDS } from './milestones.js';

// Grid: 12 columns x 16 rows. 
// 0 = open, 1 = indestructible stone wall, 2 = destructible gift box, 3 = water hazard

function createBorderedGrid() {
  const grid = [];
  for (let r = 0; r < 16; r++) {
    const row = [];
    for (let c = 0; c < 12; c++) {
      if (r === 0 || r === 15 || c === 0 || c === 11) {
        row.push(1); // Border wall
      } else {
        row.push(0);
      }
    }
    grid.push(row);
  }
  return grid;
}

// Hand-crafted terrain layouts for variety
const TEMPLATES = [
  // 0: Open field with a few blocks
  (grid) => {
    grid[4][3] = 2; grid[4][4] = 2; grid[4][7] = 2; grid[4][8] = 2;
    grid[8][5] = 1; grid[8][6] = 1;
    grid[11][3] = 2; grid[11][8] = 2;
  },
  // 1: Center pillar with cross bunkers
  (grid) => {
    grid[7][5] = 1; grid[7][6] = 1; grid[8][5] = 1; grid[8][6] = 1;
    grid[4][3] = 1; grid[4][8] = 1;
    grid[11][3] = 2; grid[11][8] = 2;
    grid[5][5] = 2; grid[10][6] = 2;
  },
  // 2: Water canal / lake hazard
  (grid) => {
    grid[7][1] = 3; grid[7][2] = 3; grid[7][3] = 3;
    grid[7][8] = 3; grid[7][9] = 3; grid[7][10] = 3;
    grid[4][5] = 2; grid[4][6] = 2;
    grid[10][5] = 2; grid[10][6] = 2;
  },
  // 3: Tactical corridor maze
  (grid) => {
    for (let c = 2; c <= 9; c += 2) {
      grid[5][c] = 1;
      grid[9][c + 1] = 1;
    }
    grid[7][3] = 2; grid[7][8] = 2;
  },
  // 4: Fortified birthday gift crates
  (grid) => {
    grid[3][3] = 2; grid[3][4] = 2; grid[3][7] = 2; grid[3][8] = 2;
    grid[6][5] = 2; grid[6][6] = 2;
    grid[9][3] = 2; grid[9][4] = 2; grid[9][7] = 2; grid[9][8] = 2;
    grid[6][2] = 1; grid[6][9] = 1;
  },
  // 5: Diagonal fortress
  (grid) => {
    grid[4][3] = 1; grid[5][4] = 1; grid[6][5] = 2;
    grid[9][8] = 1; grid[10][7] = 1; grid[8][6] = 2;
    grid[7][2] = 3; grid[7][9] = 3;
  },
  // 6: Grand arena (Boss / milestone level)
  (grid) => {
    grid[4][3] = 1; grid[4][8] = 1;
    grid[11][3] = 1; grid[11][8] = 1;
    grid[7][4] = 2; grid[7][7] = 2;
    grid[5][5] = 1; grid[5][6] = 1;
    grid[9][5] = 1; grid[9][6] = 1;
  }
];

export const LEVELS = [];

for (let i = 1; i <= 70; i++) {
  const worldIndex = Math.min(Math.floor((i - 1) / 10), 6);
  const world = WORLDS[worldIndex];
  const milestone = MILESTONES[i] || { year: 1956 + (i - 1), title: `Level ${i}` };

  const grid = createBorderedGrid();
  const templateFn = TEMPLATES[(i - 1) % TEMPLATES.length];
  templateFn(grid);

  // Determine enemy spawns based on level progression & world
  const enemies = [];
  const enemyType = world.enemyType;

  if (i === 70) {
    // Level 70: Final Boss — The 70!
    enemies.push({ type: 'boss', x: 6, y: 3 });
    enemies.push({ type: 'candle', x: 2, y: 2 });
    enemies.push({ type: 'candle', x: 9, y: 2 });
  } else {
    // Standard waves: 1 to 4 enemies
    const enemyCount = Math.min(1 + Math.floor((i - 1) / 12), 4);
    
    // Spawn positions
    const spawns = [
      { x: 6, y: 3 },
      { x: 2, y: 4 },
      { x: 9, y: 4 },
      { x: 6, y: 7 }
    ];

    for (let e = 0; e < enemyCount; e++) {
      let type = enemyType;
      // Occasionally mix in candles or earlier world enemies for tactical variety
      if (e > 0 && Math.random() > 0.4) {
        const earlierTypes = ['candle', 'golf', 'puck'];
        type = earlierTypes[Math.floor(Math.random() * earlierTypes.length)];
      }
      const pt = spawns[e % spawns.length];
      grid[pt.y][pt.x] = 0; // Ensure spawn is clear
      enemies.push({ type, x: pt.x, y: pt.y });
    }
  }

  // Player start position (bottom center)
  const playerStart = { x: 6, y: 13 };
  grid[playerStart.y][playerStart.x] = 0;
  grid[playerStart.y - 1][playerStart.x] = 0;

  LEVELS.push({
    levelNum: i,
    worldId: world.id,
    worldName: world.name,
    decade: world.decade,
    year: milestone.year,
    title: milestone.title,
    themeColor: world.themeColor,
    bgColor: world.bgColor,
    grid,
    playerStart,
    enemies,
    bounceCount: i > 30 ? 2 : 1,
    minesAllowed: 2
  });
}
