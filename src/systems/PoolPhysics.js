// src/systems/PoolPhysics.js
// Custom 2D sub-step billiard physics engine for Allan's 70th Birthday Retro Pool

export const TABLE_CONFIG = {
  feltX: 60,
  feltY: 90,
  feltW: 360,
  feltH: 600,
  ballRadius: 10,
  cushionRestitution: 0.92,
  ballRestitution: 0.98,
  friction: 0.985,
  velocityStopThreshold: 1.5,
  substeps: 4,
  pockets: [
    { id: 0, name: 'TL', x: 60, y: 90, r: 20 },
    { id: 1, name: 'TR', x: 420, y: 90, r: 20 },
    { id: 2, name: 'BL', x: 60, y: 690, r: 20 },
    { id: 3, name: 'BR', x: 420, y: 690, r: 20 },
    { id: 4, name: 'ML', x: 58, y: 390, r: 17 },
    { id: 5, name: 'MR', x: 422, y: 390, r: 17 }
  ]
};

// Distinct authentic retro colors for balls 1 through 15
export const BALL_COLORS = {
  0: { color: 0xf8fafc, label: 'CUE', isStripe: false },
  1: { color: 0xfacc15, label: '1', isStripe: false },  // Yellow
  2: { color: 0x2563eb, label: '2', isStripe: false },  // Blue
  3: { color: 0xdc2626, label: '3', isStripe: false },  // Red
  4: { color: 0x7c3aed, label: '4', isStripe: false },  // Purple
  5: { color: 0xf97316, label: '5', isStripe: false },  // Orange
  6: { color: 0x16a34a, label: '6', isStripe: false },  // Green
  7: { color: 0x881337, label: '7', isStripe: false },  // Maroon / Burgundy
  8: { color: 0x09090b, label: '8', isStripe: false },  // Black 8-Ball
  9: { color: 0xfacc15, label: '9', isStripe: true },   // Stripe Yellow
  10: { color: 0x2563eb, label: '10', isStripe: true }, // Stripe Blue
  11: { color: 0xdc2626, label: '11', isStripe: true }, // Stripe Red
  12: { color: 0x7c3aed, label: '12', isStripe: true }, // Stripe Purple
  13: { color: 0xf97316, label: '13', isStripe: true }, // Stripe Orange
  14: { color: 0x16a34a, label: '14', isStripe: true }, // Stripe Green
  15: { color: 0x881337, label: '15', isStripe: true }  // Stripe Maroon
};

export class Ball {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = TABLE_CONFIG.ballRadius;
    this.inPocket = false;
    this.pocketId = null;
    this.pottedOrder = -1;

    const meta = BALL_COLORS[id] || { color: 0xffffff, isStripe: false };
    this.color = meta.color;
    this.isStripe = meta.isStripe;
    this.isCue = id === 0;
    this.isEight = id === 8;
    this.isNine = id === 9;
    this.isSolid = id >= 1 && id <= 7;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.inPocket = false;
    this.pocketId = null;
    this.pottedOrder = -1;
  }
}

export class PoolPhysics {
  constructor(config = TABLE_CONFIG) {
    this.config = { ...TABLE_CONFIG, ...config };
    this.balls = [];
    this.events = {
      ballCollisions: [],
      cushionHits: [],
      potted: [],
      firstContact: null,
      cushionCountAfterContact: 0
    };
    this.pottedSequence = 0;
  }

  clearEvents() {
    this.events = {
      ballCollisions: [],
      cushionHits: [],
      potted: [],
      firstContact: null,
      cushionCountAfterContact: 0
    };
  }

  get cueBall() {
    return this.balls.find(b => b.isCue);
  }

  get eightBall() {
    return this.balls.find(b => b.isEight);
  }

  get activeBalls() {
    return this.balls.filter(b => !b.inPocket);
  }

  get activeObjectBalls() {
    return this.balls.filter(b => !b.inPocket && !b.isCue);
  }

  addBall(id, x, y) {
    const ball = new Ball(id, x, y);
    this.balls.push(ball);
    return ball;
  }

  // Racks balls based on game subtype
  setupRack(subtype = '8ball') {
    this.balls = [];
    this.clearEvents();
    this.pottedSequence = 0;

    const { feltX, feltY, feltW, feltH, ballRadius } = this.config;
    const tableCenterX = feltX + feltW / 2; // 240
    const footSpotY = feltY + feltH * 0.28; // ~258
    const headSpotY = feltY + feltH * 0.72; // ~522

    // Cue Ball always starts on the head spot
    this.addBall(0, tableCenterX, headSpotY);

    if (subtype === '8ball' || subtype === 'straight' || subtype === 'speed') {
      // 15-ball standard triangle rack
      // Standard arrangement: 8-ball in center (row 3, middle), corners: one solid, one stripe
      const rowPattern = [
        [1],
        [9, 2],
        [3, 8, 10],
        [11, 4, 12, 5],
        [7, 13, 6, 14, 15]
      ];

      const r = ballRadius;
      const rowSpacing = r * Math.sqrt(3) + 0.5; // Packing spacing
      const colSpacing = r * 2 + 0.5;

      for (let row = 0; row < rowPattern.length; row++) {
        const ballsInRow = rowPattern[row];
        const rowY = footSpotY - (row * rowSpacing);
        const rowStartX = tableCenterX - ((ballsInRow.length - 1) * colSpacing) / 2;

        for (let col = 0; col < ballsInRow.length; col++) {
          const ballId = ballsInRow[col];
          const ballX = rowStartX + col * colSpacing;
          this.addBall(ballId, ballX, rowY);
        }
      }
    } else if (subtype === '9ball') {
      // 9-ball diamond rack: 1 at apex, 9 in center, others scattered
      const diamondRows = [
        [1],
        [2, 3],
        [4, 9, 5],
        [6, 7],
        [8]
      ];

      const r = ballRadius;
      const rowSpacing = r * Math.sqrt(3) + 0.5;
      const colSpacing = r * 2 + 0.5;

      for (let row = 0; row < diamondRows.length; row++) {
        const ballsInRow = diamondRows[row];
        const rowY = footSpotY - (row * rowSpacing);
        const rowStartX = tableCenterX - ((ballsInRow.length - 1) * colSpacing) / 2;

        for (let col = 0; col < ballsInRow.length; col++) {
          const ballId = ballsInRow[col];
          const ballX = rowStartX + col * colSpacing;
          this.addBall(ballId, ballX, rowY);
        }
      }
    }
  }

  strikeCueBall(angle, power, spinX = 0, spinY = 0) {
    const cue = this.cueBall;
    if (!cue || cue.inPocket) return false;
    if (!Number.isFinite(angle) || !Number.isFinite(power)) return false;

    this.clearEvents();

    // Clamped power (0 to 1) mapped to velocity (50 to 900 px/s)
    const clampedPower = Math.max(0.05, Math.min(1.0, power));
    const maxSpeed = 850;
    const speed = clampedPower * maxSpeed;

    cue.vx = Math.cos(angle) * speed;
    cue.vy = Math.sin(angle) * speed;

    // Apply spin as slight perpendicular drift if provided
    if (spinX !== 0 || spinY !== 0) {
      cue.spinX = Math.max(-1, Math.min(1, spinX));
      cue.spinY = Math.max(-1, Math.min(1, spinY));
    }

    return true;
  }

  isMoving() {
    return this.balls.some(b => !b.inPocket && (Math.abs(b.vx) > 0 || Math.abs(b.vy) > 0));
  }

  step(dt = 1 / 60) {
    const { substeps, friction, velocityStopThreshold } = this.config;
    const subDt = dt / substeps;
    const frictionFactor = Math.pow(friction, 1 / substeps);

    for (let sub = 0; sub < substeps; sub++) {
      // 1. Move active balls
      for (const ball of this.balls) {
        if (ball.inPocket) continue;

        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

        // Apply friction deceleration
        ball.vx *= frictionFactor;
        ball.vy *= frictionFactor;

        // Cutoff slow motion
        if (Math.hypot(ball.vx, ball.vy) < velocityStopThreshold) {
          ball.vx = 0;
          ball.vy = 0;
        }
      }

      // 2. Ball-to-Ball Elastic Collisions
      this.resolveBallCollisions();

      // 3. Table Cushion Reflections
      this.resolveCushionCollisions();

      // 4. Pocket Capture
      this.checkPockets();
    }
  }

  resolveBallCollisions() {
    const { ballRadius, ballRestitution } = this.config;
    const active = this.activeBalls;
    const count = active.length;
    const minDistance = ballRadius * 2;
    const minDistanceSq = minDistance * minDistance;

    for (let i = 0; i < count; i++) {
      const b1 = active[i];
      for (let j = i + 1; j < count; j++) {
        const b2 = active[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistanceSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Separate overlapping balls evenly
          const overlap = (minDistance - dist) * 0.5;
          b1.x -= nx * overlap;
          b1.y -= ny * overlap;
          b2.x += nx * overlap;
          b2.y += ny * overlap;

          // Normal relative velocity
          const rvx = b2.vx - b1.vx;
          const rvy = b2.vy - b1.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          // Do not resolve if velocities are separating
          if (velAlongNormal < 0) {
            const impulse = -(1 + ballRestitution) * velAlongNormal * 0.5;
            b1.vx -= impulse * nx;
            b1.vy -= impulse * ny;
            b2.vx += impulse * nx;
            b2.vy += impulse * ny;

            // Record first contact made by cue ball
            if (b1.isCue && !this.events.firstContact) {
              this.events.firstContact = b2;
            } else if (b2.isCue && !this.events.firstContact) {
              this.events.firstContact = b1;
            }

            const impactSpeed = Math.abs(velAlongNormal);
            this.events.ballCollisions.push({
              ball1: b1.id,
              ball2: b2.id,
              impactSpeed,
              x: (b1.x + b2.x) * 0.5,
              y: (b1.y + b2.y) * 0.5
            });
          }
        }
      }
    }
  }

  resolveCushionCollisions() {
    const { feltX, feltY, feltW, feltH, ballRadius, cushionRestitution, pockets } = this.config;
    const minX = feltX + ballRadius;
    const maxX = feltX + feltW - ballRadius;
    const minY = feltY + ballRadius;
    const maxY = feltY + feltH - ballRadius;

    // Helper: is the ball currently falling into a pocket opening?
    const isNearPocket = (x, y, distTolerance = 24) => {
      for (const p of pockets) {
        if (Math.hypot(x - p.x, y - p.y) < distTolerance) return true;
      }
      return false;
    };

    for (const b of this.balls) {
      if (b.inPocket) continue;

      let hitCushion = false;

      // Left cushion
      if (b.x < minX) {
        if (!isNearPocket(b.x, b.y)) {
          b.x = minX;
          b.vx = Math.abs(b.vx) * cushionRestitution;
          hitCushion = true;
        }
      }
      // Right cushion
      else if (b.x > maxX) {
        if (!isNearPocket(b.x, b.y)) {
          b.x = maxX;
          b.vx = -Math.abs(b.vx) * cushionRestitution;
          hitCushion = true;
        }
      }

      // Top cushion
      if (b.y < minY) {
        if (!isNearPocket(b.x, b.y)) {
          b.y = minY;
          b.vy = Math.abs(b.vy) * cushionRestitution;
          hitCushion = true;
        }
      }
      // Bottom cushion
      else if (b.y > maxY) {
        if (!isNearPocket(b.x, b.y)) {
          b.y = maxY;
          b.vy = -Math.abs(b.vy) * cushionRestitution;
          hitCushion = true;
        }
      }

      if (hitCushion) {
        this.events.cushionHits.push({ ballId: b.id, speed: b.speed, x: b.x, y: b.y });
        if (this.events.firstContact) {
          this.events.cushionCountAfterContact++;
        }
      }
    }
  }

  checkPockets() {
    const { pockets } = this.config;

    for (const b of this.balls) {
      if (b.inPocket) continue;

      for (const p of pockets) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dist = Math.hypot(dx, dy);

        // Within outer pocket mouth: apply suction acceleration toward hole center
        if (dist < p.r + 6) {
          const pull = (1 - dist / (p.r + 6)) * 40;
          b.vx += (dx / dist) * pull;
          b.vy += (dy / dist) * pull;
        }

        // Within pocket inner drop threshold: ball drops into pocket!
        if (dist < p.r * 0.72) {
          b.inPocket = true;
          b.pocketId = p.id;
          b.vx = 0;
          b.vy = 0;
          b.pottedOrder = ++this.pottedSequence;

          this.events.potted.push({
            ballId: b.id,
            pocketId: p.id,
            isCue: b.isCue,
            isEight: b.isEight,
            isSolid: b.isSolid,
            isStripe: b.isStripe
          });
          break;
        }
      }
    }
  }

  // Place cue ball on table (Ball-In-Hand)
  placeCueBall(x, y) {
    const cue = this.cueBall;
    if (!cue) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    const { feltX, feltY, feltW, feltH, ballRadius } = this.config;
    const minX = feltX + ballRadius + 4;
    const maxX = feltX + feltW - ballRadius - 4;
    const minY = feltY + ballRadius + 4;
    const maxY = feltY + feltH - ballRadius - 4;

    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    // Ensure not overlapping any active ball
    const minDistanceSq = (ballRadius * 2 + 2) * (ballRadius * 2 + 2);
    for (const b of this.activeObjectBalls) {
      const distSq = (b.x - clampedX) * (b.x - clampedX) + (b.y - clampedY) * (b.y - clampedY);
      if (distSq < minDistanceSq) {
        return false; // Invalid placement due to obstruction
      }
    }

    cue.reset(clampedX, clampedY);
    return true;
  }

  // Re-rack for Straight Pool: 14 potted balls re-racked, 15th object ball and cue stay in place
  reRackStraightPool() {
    const { feltX, feltY, feltW, feltH, ballRadius } = this.config;
    const tableCenterX = feltX + feltW / 2;
    const footSpotY = feltY + feltH * 0.28;

    const remainingObject = this.activeObjectBalls[0];
    const pottedBalls = this.balls.filter(b => b.inPocket && !b.isCue);

    const rowPattern = [
      [pottedBalls[0]?.id],
      [pottedBalls[1]?.id, pottedBalls[2]?.id],
      [pottedBalls[3]?.id, pottedBalls[4]?.id, pottedBalls[5]?.id],
      [pottedBalls[6]?.id, pottedBalls[7]?.id, pottedBalls[8]?.id, pottedBalls[9]?.id],
      [pottedBalls[10]?.id, pottedBalls[11]?.id, pottedBalls[12]?.id, pottedBalls[13]?.id, pottedBalls[14]?.id]
    ];

    const r = ballRadius;
    const rowSpacing = r * Math.sqrt(3) + 0.5;
    const colSpacing = r * 2 + 0.5;

    let idx = 0;
    for (let row = 0; row < rowPattern.length; row++) {
      const ballsInRow = rowPattern[row];
      const rowY = footSpotY - (row * rowSpacing);
      const rowStartX = tableCenterX - ((ballsInRow.length - 1) * colSpacing) / 2;

      for (let col = 0; col < ballsInRow.length; col++) {
        const id = ballsInRow[col];
        if (id !== undefined) {
          const ball = this.balls.find(b => b.id === id);
          if (ball && ball !== remainingObject) {
            const bx = rowStartX + col * colSpacing;
            ball.reset(bx, rowY);
            idx++;
          }
        }
      }
    }
  }

  // Network synchronization snapshot
  getSnapshot() {
    return this.balls.map(b => ({
      id: b.id,
      x: Math.round(b.x * 10) / 10,
      y: Math.round(b.y * 10) / 10,
      vx: Math.round(b.vx * 10) / 10,
      vy: Math.round(b.vy * 10) / 10,
      inPocket: b.inPocket,
      pocketId: b.pocketId
    }));
  }

  applySnapshot(snapshot) {
    if (!Array.isArray(snapshot)) return;
    for (const s of snapshot) {
      const ball = this.balls.find(b => b.id === s.id);
      if (ball) {
        ball.x = s.x;
        ball.y = s.y;
        ball.vx = s.vx;
        ball.vy = s.vy;
        ball.inPocket = s.inPocket;
        ball.pocketId = s.pocketId;
      }
    }
  }

  loadSnapshot(snapshot) {
    this.applySnapshot(snapshot);
  }
}
