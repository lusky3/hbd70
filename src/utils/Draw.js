// src/utils/Draw.js
// Procedural Canvas drawing helpers to generate sprites without external asset loading

export function generateTextures(scene) {
  generateMotorcycleTexture(scene);
  generateTurretTexture(scene);
  generateCandleTexture(scene);
  generateGolfTexture(scene);
  generatePuckTexture(scene);
  generateBoatTexture(scene);
  generateSnowmobileTexture(scene);
  generateBikerTexture(scene);
  generateBossTexture(scene);
  generateBulletTexture(scene);
  generateMineTexture(scene);
  generateWallTexture(scene);
  generateGiftBoxTexture(scene);
  generateWaterTexture(scene);
  generateConfettiTexture(scene);
}

function generateMotorcycleTexture(scene) {
  if (scene.textures.exists('motorcycle')) return;
  const canvas = scene.textures.createCanvas('motorcycle', 32, 32);
  const ctx = canvas.getContext();

  // Draw Allan's Cruiser Motorcycle (top-down / semi-isometric profile)
  // Wheels (front & rear)
  ctx.fillStyle = '#111';
  ctx.fillRect(4, 12, 6, 8);  // rear tire
  ctx.fillRect(22, 12, 6, 8); // front tire

  // Chrome rims / hubs
  ctx.fillStyle = '#ccc';
  ctx.fillRect(6, 14, 2, 4);
  ctx.fillRect(24, 14, 2, 4);

  // Frame / Engine block
  ctx.fillStyle = '#444';
  ctx.fillRect(10, 10, 12, 12);

  // Chrome exhaust pipes
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(8, 20, 10, 3);
  ctx.fillRect(8, 9, 10, 3);

  // Gas Tank & Bodywork (Classic Midnight Blue or Rich Red)
  ctx.fillStyle = '#1a56db';
  ctx.beginPath();
  ctx.ellipse(16, 16, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Seat
  ctx.fillStyle = '#222';
  ctx.fillRect(11, 13, 5, 6);

  // Handlebars
  ctx.fillStyle = '#bbb';
  ctx.fillRect(21, 6, 3, 20);

  canvas.refresh();
}

function generateTurretTexture(scene) {
  if (scene.textures.exists('turret')) return;
  const canvas = scene.textures.createCanvas('turret', 32, 32);
  const ctx = canvas.getContext();

  // Headlight / Front Fork Aiming Cannon
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(16, 16, 4, 0, Math.PI * 2);
  ctx.fill();

  // High-intensity headlight beam barrel
  ctx.fillStyle = '#fff';
  ctx.fillRect(16, 14, 12, 4);

  // Gold bezel
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 14, 12, 4);

  canvas.refresh();
}

function generateCandleTexture(scene) {
  if (scene.textures.exists('candle')) return;
  const canvas = scene.textures.createCanvas('candle', 32, 32);
  const ctx = canvas.getContext();

  // Birthday Candle Tank (Stationary scout)
  // Candle base / wax body
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(8, 8, 16, 16);
  // Stripes on candle
  ctx.fillStyle = '#fff';
  ctx.fillRect(8, 11, 16, 3);
  ctx.fillRect(8, 18, 16, 3);

  // Wick & Glowing Flame
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(16, 16, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4500';
  ctx.beginPath();
  ctx.arc(16, 16, 3, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

function generateGolfTexture(scene) {
  if (scene.textures.exists('golf')) return;
  const canvas = scene.textures.createCanvas('golf', 32, 32);
  const ctx = canvas.getContext();

  // Golf Ball Tank
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dimples
  ctx.fillStyle = '#e0e0e0';
  const dimples = [[12, 10], [20, 10], [16, 15], [11, 19], [21, 19]];
  dimples.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Small silver turret
  ctx.fillStyle = '#888';
  ctx.fillRect(16, 14, 10, 4);

  canvas.refresh();
}

function generatePuckTexture(scene) {
  if (scene.textures.exists('puck')) return;
  const canvas = scene.textures.createCanvas('puck', 32, 32);
  const ctx = canvas.getContext();

  // Hockey Puck Tank (Fast sliding)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(16, 16, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hockey tape texture
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(8, 14, 16, 4);

  // Heavy cannon
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(16, 14, 12, 4);

  canvas.refresh();
}

function generateBoatTexture(scene) {
  if (scene.textures.exists('boat')) return;
  const canvas = scene.textures.createCanvas('boat', 32, 32);
  const ctx = canvas.getContext();

  // Cottage Speedboat Tank
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(28, 16);
  ctx.lineTo(8, 7);
  ctx.lineTo(6, 25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Deck & Outboard motor
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(12, 12, 8, 8);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(4, 13, 4, 6);

  canvas.refresh();
}

function generateSnowmobileTexture(scene) {
  if (scene.textures.exists('snowmobile')) return;
  const canvas = scene.textures.createCanvas('snowmobile', 32, 32);
  const ctx = canvas.getContext();

  // Snowmobile Tank (Fast erratic)
  // Skis
  ctx.fillStyle = '#000';
  ctx.fillRect(20, 5, 8, 3);
  ctx.fillRect(20, 24, 8, 3);

  // Body & Cowling
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(26, 16);
  ctx.lineTo(8, 8);
  ctx.lineTo(6, 24);
  ctx.closePath();
  ctx.fill();

  // Windshield
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(14, 11, 5, 10);

  canvas.refresh();
}

function generateBikerTexture(scene) {
  if (scene.textures.exists('biker')) return;
  const canvas = scene.textures.createCanvas('biker', 32, 32);
  const ctx = canvas.getContext();

  // Rival Biker Tank (Heavy chopper)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(4, 11, 6, 10);
  ctx.fillRect(22, 11, 6, 10);

  ctx.fillStyle = '#dc2626'; // Flame red tank
  ctx.beginPath();
  ctx.ellipse(15, 16, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(20, 4, 3, 24); // Ape hanger handlebars

  canvas.refresh();
}

function generateBossTexture(scene) {
  if (scene.textures.exists('boss')) return;
  const canvas = scene.textures.createCanvas('boss', 54, 54);
  const ctx = canvas.getContext();

  // The 70 Boss! Giant golden tank with "70" emblazoned
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(6, 6, 42, 42);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 42, 42);

  // Heavy twin treads
  ctx.fillStyle = '#000';
  ctx.fillRect(2, 4, 8, 46);
  ctx.fillRect(44, 4, 8, 46);

  // Triple Cannons
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(24, 2, 6, 16);
  ctx.fillRect(14, 4, 4, 12);
  ctx.fillRect(36, 4, 4, 12);

  // "70" Emblem in center
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('70', 27, 28);

  canvas.refresh();
}

function generateBulletTexture(scene) {
  if (scene.textures.exists('bullet')) return;
  const canvas = scene.textures.createCanvas('bullet', 12, 12);
  const ctx = canvas.getContext();

  // Bouncing party popper cork shell
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(6, 6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff4500';
  ctx.beginPath();
  ctx.arc(6, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

function generateMineTexture(scene) {
  if (scene.textures.exists('mine')) return;
  const canvas = scene.textures.createCanvas('mine', 20, 20);
  const ctx = canvas.getContext();

  // Party Cracker Mine
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(10, 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fuse spark
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(10, 10, 3, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

function generateWallTexture(scene) {
  if (scene.textures.exists('wall_indestructible')) return;
  const canvas = scene.textures.createCanvas('wall_indestructible', 32, 32);
  const ctx = canvas.getContext();

  // Solid Stone / Cake Brick Wall
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 32, 32);

  // Brick lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 30, 30);
  ctx.beginPath();
  ctx.moveTo(0, 16); ctx.lineTo(32, 16);
  ctx.moveTo(16, 0); ctx.lineTo(16, 16);
  ctx.moveTo(8, 16); ctx.lineTo(8, 32);
  ctx.moveTo(24, 16); ctx.lineTo(24, 32);
  ctx.stroke();

  canvas.refresh();
}

function generateGiftBoxTexture(scene) {
  if (scene.textures.exists('block_destructible')) return;
  const canvas = scene.textures.createCanvas('block_destructible', 32, 32);
  const ctx = canvas.getContext();

  // Wrapped Birthday Gift Box (Destructible)
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(2, 2, 28, 28);

  // Golden ribbon
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(13, 2, 6, 28);
  ctx.fillRect(2, 13, 28, 6);

  // Bow
  ctx.beginPath();
  ctx.arc(16, 16, 5, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

function generateWaterTexture(scene) {
  if (scene.textures.exists('hazard_water')) return;
  const canvas = scene.textures.createCanvas('hazard_water', 32, 32);
  const ctx = canvas.getContext();

  // Lake / Water Hazard
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 32, 32);

  // Wave highlights
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(8, 10, 6, 0, Math.PI);
  ctx.arc(24, 22, 6, 0, Math.PI);
  ctx.stroke();

  canvas.refresh();
}

function generateConfettiTexture(scene) {
  if (scene.textures.exists('confetti')) return;
  const canvas = scene.textures.createCanvas('confetti', 8, 8);
  const ctx = canvas.getContext();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 8, 8);

  canvas.refresh();
}
