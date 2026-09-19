// src/systems/TerrainBuilder.js
// Tilemap builder and physics collider setup for arena obstacles

export class TerrainBuilder {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 32;
    this.offsetX = 48; // Centers 12*32 (384px) in 480px width
    this.offsetY = 70; // Sits below top HUD (60px)

    this.wallsGroup = scene.physics.add.staticGroup();
    this.blocksGroup = scene.physics.add.staticGroup();
    this.waterGroup = scene.physics.add.staticGroup();
    this.floorGraphics = scene.add.graphics();
  }

  build(levelData) {
    const { grid, themeColor, bgColor } = levelData;

    // 1. Draw thematic arena floor
    this.floorGraphics.clear();
    this.floorGraphics.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor || '#111827').color, 1);
    this.floorGraphics.fillRect(this.offsetX, this.offsetY, 12 * this.tileSize, 16 * this.tileSize);

    // Subtle floor grid lines
    this.floorGraphics.lineStyle(1, 0xffffff, 0.04);
    for (let c = 0; c <= 12; c++) {
      this.floorGraphics.lineBetween(this.offsetX + c * this.tileSize, this.offsetY, this.offsetX + c * this.tileSize, this.offsetY + 16 * this.tileSize);
    }
    for (let r = 0; r <= 16; r++) {
      this.floorGraphics.lineBetween(this.offsetX, this.offsetY + r * this.tileSize, this.offsetX + 12 * this.tileSize, this.offsetY + r * this.tileSize);
    }
    this.floorGraphics.setDepth(1);

    // 2. Spawn obstacle sprites into physics groups
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 12; c++) {
        const tileType = grid[r][c];
        const worldX = this.offsetX + c * this.tileSize + this.tileSize / 2;
        const worldY = this.offsetY + r * this.tileSize + this.tileSize / 2;

        if (tileType === 1) {
          // Indestructible stone wall
          const wall = this.wallsGroup.create(worldX, worldY, 'wall_indestructible');
          wall.setDepth(10);
          wall.refreshBody();
        } else if (tileType === 2) {
          // Destructible birthday gift box
          const block = this.blocksGroup.create(worldX, worldY, 'block_destructible');
          block.setData('gridPos', { r, c });
          block.setDepth(10);
          block.refreshBody();
        } else if (tileType === 3) {
          // Water / Hole hazard
          const water = this.waterGroup.create(worldX, worldY, 'hazard_water');
          water.setDepth(5);
          water.refreshBody();
        }
      }
    }
  }

  destroyBlock(block) {
    const x = block.x;
    const y = block.y;

    // Confetti burst particles on gift box break
    if (this.scene.confettiEmitter) {
      this.scene.confettiEmitter.explode(16, x, y);
    }

    block.destroy();
  }

  toWorld(gridX, gridY) {
    return {
      x: this.offsetX + gridX * this.tileSize + this.tileSize / 2,
      y: this.offsetY + gridY * this.tileSize + this.tileSize / 2
    };
  }
}
