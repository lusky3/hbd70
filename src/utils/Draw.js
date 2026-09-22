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
  generateBossCandleTexture(scene);
  generateBossGolfTexture(scene);
  generateBossPuckTexture(scene);
  generateBossBoatTexture(scene);
  generateBossSnowmobileTexture(scene);
  generateBossBikerTexture(scene);
  generateBulletTexture(scene);
  generateMineTexture(scene);
  generateWallTexture(scene);
  generateGiftBoxTexture(scene);
  generateWaterTexture(scene);
  generateConfettiTexture(scene);
  generatePongTextures(scene);
  generateInvaderTextures(scene);
  generateAsteroidTextures(scene);
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

  // Also register alias 'boss_70'
  if (!scene.textures.exists('boss_70')) {
    const canvas70 = scene.textures.createCanvas('boss_70', 54, 54);
    const ctx70 = canvas70.getContext();
    ctx70.drawImage(canvas.getCanvas(), 0, 0);
    canvas70.refresh();
  }
}

function generateBossCandleTexture(scene) {
  if (scene.textures.exists('boss_candle')) return;
  const canvas = scene.textures.createCanvas('boss_candle', 44, 44);
  const ctx = canvas.getContext();

  // Mega Candle Base Plate
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(22, 38, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Candle Body (Crimson & Gold Striped Wax Column)
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(10, 14, 24, 24);
  // Gold diagonal stripes
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(10, 20); ctx.lineTo(22, 14); ctx.lineTo(26, 14); ctx.lineTo(10, 24); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 30); ctx.lineTo(34, 18); ctx.lineTo(34, 22); ctx.lineTo(10, 34); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, 38); ctx.lineTo(34, 30); ctx.lineTo(34, 34); ctx.lineTo(26, 38); ctx.closePath(); ctx.fill();

  // Wax drips on rim
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.ellipse(22, 14, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wick
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(22, 14);
  ctx.lineTo(22, 9);
  ctx.stroke();

  // Radiant Glowing Multi-layer Flame
  ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.beginPath();
  ctx.arc(22, 8, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(22, 1);
  ctx.quadraticCurveTo(28, 7, 24, 10);
  ctx.quadraticCurveTo(22, 11, 20, 10);
  ctx.quadraticCurveTo(16, 7, 22, 1);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(22, 7, 2.5, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

function generateBossGolfTexture(scene) {
  if (scene.textures.exists('boss_golf')) return;
  const canvas = scene.textures.createCanvas('boss_golf', 44, 44);
  const ctx = canvas.getContext();

  // The Golf Dreadnought — Heavy Armored Cart
  // 4 Chunky Off-road Wheels
  ctx.fillStyle = '#18181b';
  ctx.fillRect(4, 5, 8, 10);
  ctx.fillRect(32, 5, 8, 10);
  ctx.fillRect(4, 29, 8, 10);
  ctx.fillRect(32, 29, 8, 10);

  // Armored Chassis
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(10, 8, 24, 28);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 8, 24, 28);

  // Striped Canopy
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(12, 12, 20, 20);
  ctx.fillStyle = '#047857';
  ctx.fillRect(15, 12, 4, 20);
  ctx.fillRect(23, 12, 4, 20);

  // Twin Mortar Launchers
  ctx.fillStyle = '#d97706';
  ctx.fillRect(14, 2, 4, 8);
  ctx.fillRect(26, 2, 4, 8);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 2, 4, 8);
  ctx.strokeRect(26, 2, 4, 8);

  // Center Emblem: Golf Ball
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(22, 22, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(21, 21, 1, 0, Math.PI * 2);
  ctx.arc(23, 21, 1, 0, Math.PI * 2);
  ctx.arc(22, 23, 1, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

function generateBossPuckTexture(scene) {
  if (scene.textures.exists('boss_puck')) return;
  const canvas = scene.textures.createCanvas('boss_puck', 46, 46);
  const ctx = canvas.getContext();

  // The Zamboni Juggernaut
  // Heavy Steel Body
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(8, 8, 30, 30);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(8, 8, 30, 30);

  // Front Rotating Ice Scraper Cylinder / Blade
  ctx.fillStyle = '#64748b';
  ctx.fillRect(6, 4, 34, 6);
  ctx.fillStyle = '#38bdf8';
  for (let x = 8; x <= 36; x += 6) {
    ctx.fillRect(x, 4, 3, 6);
  }

  // Enclosed Cab with Cyan Tint
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(13, 14, 20, 12);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(15, 16, 16, 4);

  // Twin Heavy Puck Cannons
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(11, 2, 5, 8);
  ctx.fillRect(30, 2, 5, 8);

  // Rear Water Conditioner Tank & Red Warning Lights
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(10, 34, 4, 4);
  ctx.fillRect(32, 34, 4, 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(16, 30, 14, 7);

  canvas.refresh();
}

function generateBossBoatTexture(scene) {
  if (scene.textures.exists('boss_boat')) return;
  const canvas = scene.textures.createCanvas('boss_boat', 46, 46);
  const ctx = canvas.getContext();

  // The Iron Cruiser — Catamaran Naval Gunboat
  // Left Pontoon
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(11, 4);
  ctx.lineTo(16, 12);
  ctx.lineTo(16, 38);
  ctx.lineTo(6, 38);
  ctx.lineTo(6, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Right Pontoon
  ctx.beginPath();
  ctx.moveTo(35, 4);
  ctx.lineTo(40, 12);
  ctx.lineTo(40, 38);
  ctx.lineTo(30, 38);
  ctx.lineTo(30, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Central Armored Bridge Deck
  ctx.fillStyle = '#334155';
  ctx.fillRect(14, 14, 18, 20);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14, 14, 18, 20);

  // Twin Naval Cannons (Front)
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(8, 2, 4, 10);
  ctx.fillRect(34, 2, 4, 10);

  // Radar Mast / Antennas
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(23, 22, 4, 0, Math.PI * 2);
  ctx.fill();

  // Twin Turbine Exhausts
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(8, 38, 6, 4);
  ctx.fillRect(32, 38, 6, 4);

  canvas.refresh();
}

function generateBossSnowmobileTexture(scene) {
  if (scene.textures.exists('boss_snowmobile')) return;
  const canvas = scene.textures.createCanvas('boss_snowmobile', 46, 46);
  const ctx = canvas.getContext();

  // The Blizzard Snowcat
  // Heavy Dual Spiked Snow Treads
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(4, 8, 8, 32);
  ctx.fillRect(34, 8, 8, 32);
  // Tread Cleats
  ctx.fillStyle = '#94a3b8';
  for (let y = 10; y <= 36; y += 5) {
    ctx.fillRect(4, y, 8, 2);
    ctx.fillRect(34, y, 8, 2);
  }

  // Front V-Plow Blade
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(23, 2);
  ctx.lineTo(42, 10);
  ctx.lineTo(4, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Armored Cabin
  ctx.fillStyle = '#047857';
  ctx.fillRect(12, 12, 22, 24);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 22, 24);

  // Windshield & Light Bar
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(15, 14, 16, 6);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(17, 10, 12, 3);

  // Twin Ice-Shard Missile Launchers
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(13, 24, 6, 10);
  ctx.fillRect(27, 24, 6, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(14, 22, 4, 3);
  ctx.fillRect(28, 22, 4, 3);

  canvas.refresh();
}

function generateBossBikerTexture(scene) {
  if (scene.textures.exists('boss_biker')) return;
  const canvas = scene.textures.createCanvas('boss_biker', 48, 48);
  const ctx = canvas.getContext();

  // The Chopper Warlord — Heavy Touring Trike
  // Massive Rear Drag Wheels
  ctx.fillStyle = '#09090b';
  ctx.fillRect(4, 26, 10, 16);
  ctx.fillRect(34, 26, 10, 16);
  ctx.fillStyle = '#71717a';
  ctx.fillRect(6, 32, 6, 4);
  ctx.fillRect(36, 32, 6, 4);

  // Front Fork & Front Wheel
  ctx.fillStyle = '#09090b';
  ctx.fillRect(20, 4, 8, 12);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 4, 8, 12);

  // Ape Hanger Chrome Handlebars
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(12, 10, 24, 3);
  ctx.fillRect(12, 7, 3, 5);
  ctx.fillRect(33, 7, 3, 5);

  // Flame Red/Orange Teardrop Body / Fuel Tank
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.ellipse(24, 24, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(24, 24, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Exposed Chrome V-Twin Engine
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(16, 22, 5, 8);
  ctx.fillRect(27, 22, 5, 8);

  // Twin Heavy Upswept Exhaust Pipes with Flame Tips
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(8, 18, 4, 18);
  ctx.fillRect(36, 18, 4, 18);
  // Flame tips
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(8, 15, 4, 3);
  ctx.fillRect(36, 15, 4, 3);

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

function generatePongTextures(scene) {
  // 1. Birthday Cake Puck (Pong Ball)
  if (!scene.textures.exists('pong_ball')) {
    const canvas = scene.textures.createCanvas('pong_ball', 20, 20);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(10, 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();
  }

  // 2. Player Paddle
  if (!scene.textures.exists('pong_paddle_player')) {
    const canvas = scene.textures.createCanvas('pong_paddle_player', 90, 16);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(0, 0, 90, 16, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Center alignment line
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(43, 2, 4, 12);
    canvas.refresh();
  }

  // 3. AI Opponent Paddle
  if (!scene.textures.exists('pong_paddle_ai')) {
    const canvas = scene.textures.createCanvas('pong_paddle_ai', 90, 16);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#be185d';
    ctx.beginPath();
    ctx.roundRect(0, 0, 90, 16, 6);
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(43, 2, 4, 12);
    canvas.refresh();
  }

  // 4. Extended Touch Grip Handle (placed below player paddle)
  if (!scene.textures.exists('pong_grip')) {
    const canvas = scene.textures.createCanvas('pong_grip', 110, 36);
    const ctx = canvas.getContext();
    // Outer rounded tab
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(0, 0, 110, 36, 10);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3 Grip ridges
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(25, 12, 60, 3);
    ctx.fillRect(20, 18, 70, 3);
    ctx.fillRect(25, 24, 60, 3);
    canvas.refresh();
  }
}

function generateInvaderTextures(scene) {
  // 1. Invader Cake (Row 1)
  if (!scene.textures.exists('invader_cake')) {
    const canvas = scene.textures.createCanvas('invader_cake', 30, 24);
    const ctx = canvas.getContext();
    // Candle on top
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(13, 1, 4, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(14, 5, 2, 5);
    // Cake base
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(5, 10, 20, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 13, 24, 4);
    canvas.refresh();
  }

  // 2. Invader Present (Row 2)
  if (!scene.textures.exists('invader_present')) {
    const canvas = scene.textures.createCanvas('invader_present', 28, 24);
    const ctx = canvas.getContext();
    // Ribbon bow
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(11, 4, 3, 0, Math.PI * 2);
    ctx.arc(17, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Box
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(4, 7, 20, 16);
    // Cross ribbons
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(12, 7, 4, 16);
    ctx.fillRect(4, 13, 20, 4);
    canvas.refresh();
  }

  // 3. Invader Candle (Row 3)
  if (!scene.textures.exists('invader_candle')) {
    const canvas = scene.textures.createCanvas('invader_candle', 24, 28);
    const ctx = canvas.getContext();
    // Flame
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.ellipse(12, 5, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(12, 6, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Candle wax
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(8, 10, 8, 16);
    canvas.refresh();
  }

  // 4. Invader Train (Row 4 - Vintage Locomotive)
  if (!scene.textures.exists('invader_train')) {
    const canvas = scene.textures.createCanvas('invader_train', 32, 22);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 6, 24, 12);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(18, 2, 10, 6);
    // Smokestack
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 2, 4, 5);
    // Wheels
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(8, 19, 3, 0, Math.PI * 2);
    ctx.arc(16, 19, 3, 0, Math.PI * 2);
    ctx.arc(24, 19, 3, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();
  }

  // 5. Mystery Vintage CN Railcar UFO
  if (!scene.textures.exists('invader_ufo')) {
    const canvas = scene.textures.createCanvas('invader_ufo', 56, 24);
    const ctx = canvas.getContext();

    // 1. Couplers on both ends
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 15, 4, 3);
    ctx.fillRect(52, 15, 4, 3);

    // 2. Chassis Underframe
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 15, 48, 3);

    // Underbody equipment box / air brake cylinder
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(23, 17, 10, 3);

    // 3. Wheel Trucks / Bogies (Dual 2-Axle)
    const drawTruck = (centerX) => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(centerX - 8, 17, 16, 2); // Truck bolster
      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX - 5, 20, 3, 0, Math.PI * 2);
      ctx.arc(centerX + 5, 20, 3, 0, Math.PI * 2);
      ctx.fill();
      // Wheel rims / bearings
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(centerX - 6, 19, 2, 2);
      ctx.fillRect(centerX + 4, 19, 2, 2);
    };
    drawTruck(14);
    drawTruck(42);

    // 4. Boxcar Body (CN Heritage Red & Black Ends)
    ctx.fillStyle = '#dc2626'; // CN Red
    ctx.fillRect(4, 3, 48, 12);

    // Darker corrugated side ribs
    ctx.fillStyle = '#b91c1c';
    for (let rx = 7; rx <= 49; rx += 5) {
      ctx.fillRect(rx, 4, 1, 10);
    }

    // Black reinforced ends
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 3, 3, 12);
    ctx.fillRect(49, 3, 3, 12);

    // Sliding Center Door Panel
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(22, 4, 12, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(21, 3, 14, 1); // Upper door guide track
    ctx.fillRect(21, 14, 14, 1); // Lower door guide track
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(31, 8, 2, 3); // Door latch

    // 5. Roof with Catwalk / Running Board
    ctx.fillStyle = '#334155';
    ctx.fillRect(5, 1, 46, 2); // Roof catwalk
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, 0, 40, 1); // Raised center walk plank

    // 6. Iconic White CN Lettering
    ctx.fillStyle = '#ffffff';
    // 'C'
    ctx.fillRect(9, 6, 4, 1.5);
    ctx.fillRect(9, 6, 1.5, 5);
    ctx.fillRect(9, 9.5, 4, 1.5);
    // 'N'
    ctx.fillRect(14, 6, 1.5, 5);
    ctx.fillRect(15.5, 7.5, 1.5, 2);
    ctx.fillRect(17, 6, 1.5, 5);

    // Road number tribute (1956)
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 5px sans-serif';
    ctx.fillText('1956', 36, 10);

    // 7. Yellow Safety End Markers / Stirrup steps
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(4, 16, 2, 2);
    ctx.fillRect(50, 16, 2, 2);

    canvas.refresh();
  }

  // 6. Milestone Bunker Block
  if (!scene.textures.exists('bunker_block')) {
    const canvas = scene.textures.createCanvas('bunker_block', 12, 12);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 12, 12);
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, 10, 10);
    canvas.refresh();
  }

  // 7. Invader Bullet
  if (!scene.textures.exists('invader_bullet')) {
    const canvas = scene.textures.createCanvas('invader_bullet', 4, 12);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(0, 0, 4, 12);
    canvas.refresh();
  }
}

function generateAsteroidTextures(scene) {
  // 1. Vector Space Cruiser Ship
  if (!scene.textures.exists('asteroid_ship')) {
    const canvas = scene.textures.createCanvas('asteroid_ship', 28, 28);
    const ctx = canvas.getContext();
    // Pointing right (0 rad in Phaser)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(26, 14); // Nose
    ctx.lineTo(4, 4);   // Left wingtip
    ctx.lineTo(8, 14);  // Engine inset
    ctx.lineTo(4, 24);  // Right wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit jewel
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(16, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();
  }

  // 2. Large Birthday Asteroid ("70" Crater)
  if (!scene.textures.exists('asteroid_large')) {
    const canvas = scene.textures.createCanvas('asteroid_large', 64, 64);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Craggy polygon
    const points = [
      [32, 4], [48, 10], [60, 24], [58, 44], [46, 58],
      [28, 60], [12, 52], [4, 38], [6, 18], [20, 8]
    ];
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden "70" crater mark
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('70', 32, 32);
    canvas.refresh();
  }

  // 3. Medium Asteroid
  if (!scene.textures.exists('asteroid_medium')) {
    const canvas = scene.textures.createCanvas('asteroid_medium', 36, 36);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const points = [
      [18, 3], [30, 8], [34, 22], [26, 33], [12, 32], [2, 22], [4, 10]
    ];
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    canvas.refresh();
  }

  // 4. Small Asteroid
  if (!scene.textures.exists('asteroid_small')) {
    const canvas = scene.textures.createCanvas('asteroid_small', 20, 20);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(10, 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    canvas.refresh();
  }

  // 5. Laser Bolt
  if (!scene.textures.exists('laser_bolt')) {
    const canvas = scene.textures.createCanvas('laser_bolt', 16, 4);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(4, 1, 8, 2);
    canvas.refresh();
  }
}
