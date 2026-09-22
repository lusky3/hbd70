// src/scenes/Credits.js
// Star Wars style angled auto-scrolling credits marquee with interactive scrub

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Credits' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Deep space background
    const bg = this.add.graphics();
    bg.fillStyle(0x02040a, 1);
    bg.fillRect(0, 0, width, height);

    // Starfield particles
    this.stars = [];
    const starGfx = this.add.graphics();
    for (let i = 0; i < 85; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() < 0.25 ? 1.8 : 1,
        alpha: 0.3 + Math.random() * 0.7,
        pulseSpeed: 0.01 + Math.random() * 0.03
      });
    }

    this.starGfx = starGfx;

    // 2. Star Wars Crawl Data Lines
    const lines = [
      { text: 'EPISODE LXX', color: '#ffd700', size: 16, bold: true, space: 14 },
      { text: "ALLAN'S MILESTONE", color: '#ffd700', size: 24, bold: true, space: 28 },
      { text: 'A long time ago in Parry Sound, Ontario...', color: '#67e8f9', size: 14, bold: false, space: 20 },
      { text: 'Seventy years of legendary mechanics,', color: '#e2e8f0', size: 15, bold: false, space: 8 },
      { text: 'cottage campfires, rail yard mastery,', color: '#e2e8f0', size: 15, bold: false, space: 8 },
      { text: 'and four wonderful kids culminated in', color: '#e2e8f0', size: 15, bold: false, space: 8 },
      { text: 'the ultimate retro arcade tribute.', color: '#e2e8f0', size: 15, bold: false, space: 32 },

      { text: '★ THE PRODUCTION CREW ★', color: '#f59e0b', size: 16, bold: true, space: 22 },

      { text: 'EXECUTIVE PRODUCER & GAME DIRECTOR', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'LEAD GAMEPLAY & PHYSICS ENGINEER', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'PROCEDURAL VECTOR ARTIST & ANIMATOR', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'CHIPTUNE WEB AUDIO MAESTRO', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'DIRECTOR OF CANOPY GOLF DREADNOUGHTS', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'CHIEF ZAMBONI ICE FRICTION CONSULTANT', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'HEAD OF ROAD-SPIKE MOTORCYCLE CHOPPERS', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 18 },

      { text: 'LEAD QA TESTER & DESTROYER OF GLITCHES', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Cody Lusk', color: '#38bdf8', size: 16, bold: true, space: 14 },

      { text: 'QA TESTERS & GLITCH HUNTERS', color: '#94a3b8', size: 11, bold: false, space: 4 },
      { text: 'Kelsey Lusk & Jay', color: '#38bdf8', size: 16, bold: true, space: 26 },

      { text: '★ [IN SPIRIT] ★', color: '#f59e0b', size: 14, bold: true, space: 14 },
      { text: 'Amy, Jennifer & Kelsey', color: '#f1f5f9', size: 14, bold: false, space: 24 },

      { text: '★ CRAFT SERVICES & MORAL SUPPORT ★', color: '#f59e0b', size: 14, bold: true, space: 16 },
      { text: 'Carrie Orr & Cody', color: '#f1f5f9', size: 14, bold: false, space: 32 },

      { text: '★ DEDICATED WITH LOVE TO ★', color: '#f59e0b', size: 16, bold: true, space: 14 },
      { text: 'ALLAN LUSK', color: '#ffd700', size: 24, bold: true, space: 12 },
      { text: 'Loving Husband, Legendary Dad,', color: '#e2e8f0', size: 14, bold: false, space: 6 },
      { text: 'Master Millwright, CN Rail Veteran,', color: '#e2e8f0', size: 14, bold: false, space: 6 },
      { text: 'TTX Regional Fleet Leader & Cottage Captain.', color: '#e2e8f0', size: 14, bold: false, space: 32 },

      { text: '★ OPEN SOURCE SOFTWARE TRIBUTE ★', color: '#f59e0b', size: 14, bold: true, space: 14 },
      { text: 'Phaser 3 HTML5 Game Engine', color: '#a7f3d0', size: 13, bold: false, space: 6 },
      { text: 'Vite Next-Generation Bundler', color: '#a7f3d0', size: 13, bold: false, space: 6 },
      { text: 'W3C Web Audio API Synthesizer', color: '#a7f3d0', size: 13, bold: false, space: 32 },

      { text: 'HAPPY 70th BIRTHDAY, ALLAN!', color: '#ffd700', size: 22, bold: true, space: 16 },
      { text: 'MAY THE FORCE BE WITH YOU!', color: '#f43f5e', size: 16, bold: true, space: 12 },
      { text: '🎂 1956 — 2026 🎂', color: '#ffd700', size: 18, bold: true, space: 100 }
    ];

    // Build credits items into a vertical strip
    this.textItems = [];
    let startY = height + 40;

    for (let i = 0; i < lines.length; i++) {
      const item = lines[i];
      const textObj = this.add.text(width / 2, startY, item.text, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: `${item.size}px`,
        fontWeight: item.bold ? '900' : 'normal',
        color: item.color,
        align: 'center'
      }).setOrigin(0.5);

      this.textItems.push({
        obj: textObj,
        baseY: startY,
        baseSize: item.size
      });

      startY += item.size + item.space;
    }

    this.totalHeight = startY - height;
    this.scrollOffset = 0;
    this.autoScrollSpeed = 38; // pixels per second
    this.isDragging = false;
    this.lastPointerY = 0;

    // Horizon / vanishing point bounds:
    // Bottom (y: 840) has scale 1.05 and alpha 1.0
    // Vanishing point (y: 110) has scale 0.38 and alpha 0.05
    this.horizonY = 110;
    this.spawnY = height + 40;

    // Interactive drag-to-scrub listeners
    this.input.on('pointerdown', (pointer) => {
      this.isDragging = true;
      this.lastPointerY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isDragging) {
        const delta = pointer.y - this.lastPointerY;
        this.lastPointerY = pointer.y;
        this.scrollOffset -= delta * 1.25;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Mouse wheel support
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.scrollOffset += deltaY * 0.8;
    });

    // Top Header & Back Button (fixed overlay)
    const headerBar = this.add.graphics();
    headerBar.fillStyle(0x02040a, 0.85);
    headerBar.fillRect(0, 0, width, 70);

    const backBtn = this.add.container(48, 36);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(-36, -18, 72, 36, 8);
    backBg.lineStyle(1.5, 0x475569, 1);
    backBg.strokeRoundedRect(-36, -18, 72, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(0, 0, '◀ BACK', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#e2e8f0'
    }).setOrigin(0.5);
    backBtn.add(backText);

    backBtn.setSize(72, 36);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.start('Splash');
    });

    this.add.text(width / 2 + 15, 36, 'CREDITS & TRIBUTE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffd700',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Bottom hint overlay
    this.add.text(width / 2, height - 20, 'Drag up / down to scrub • Release to auto-scroll', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      color: '#64748b'
    }).setOrigin(0.5);
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Auto-scroll when not scrubbing
    if (!this.isDragging) {
      this.scrollOffset += this.autoScrollSpeed * dt;
      // Loop around if reached beyond end
      if (this.scrollOffset > this.totalHeight + 150) {
        this.scrollOffset = -100;
      }
    }

    // Redraw pulsating stars
    this.starGfx.clear();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.alpha += Math.sin(time * s.pulseSpeed) * 0.05;
      const clampedAlpha = Phaser.Math.Clamp(s.alpha, 0.2, 0.95);
      this.starGfx.fillStyle(0xffffff, clampedAlpha);
      this.starGfx.fillCircle(s.x, s.y, s.size);
    }

    // Apply 3D Star Wars perspective to text lines
    const height = this.cameras.main.height;
    for (let i = 0; i < this.textItems.length; i++) {
      const item = this.textItems[i];
      const screenY = item.baseY - this.scrollOffset;

      if (screenY < this.horizonY - 30 || screenY > height + 60) {
        item.obj.setVisible(false);
      } else {
        item.obj.setVisible(true);
        item.obj.y = screenY;

        // Perspective factor: 0 at horizon, 1 at bottom
        const t = Phaser.Math.Clamp((screenY - this.horizonY) / (height - this.horizonY), 0, 1);
        
        // Scale tapers narrower toward horizon
        const scale = 0.45 + 0.65 * Math.pow(t, 1.25);
        item.obj.setScale(scale);

        // Alpha fades toward horizon
        const alpha = Math.min(1.0, Math.pow(t, 0.75));
        item.obj.setAlpha(alpha);
      }
    }
  }
}
