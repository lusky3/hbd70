// src/systems/PoolAI.js
// VS CPU Artificial Intelligence Controller with 4 Difficulty Tiers for Allan's 70th Birthday Retro Pool

export const AI_DIFFICULTIES = {
  NOVICE: 'novice',
  REGULAR: 'regular',
  MASTER: 'master',
  LEGEND: 'legend'
};

export const AI_CONFIGS = {
  [AI_DIFFICULTIES.NOVICE]: {
    name: 'Allan Novice',
    maxCutAngleDeg: 45,
    aimNoiseDeg: 10,
    powerVariance: 0.2,
    basePower: 0.55,
    allowBanks: false,
    delayMs: 1200
  },
  [AI_DIFFICULTIES.REGULAR]: {
    name: 'Allan Regular',
    maxCutAngleDeg: 62,
    aimNoiseDeg: 4.0,
    powerVariance: 0.1,
    basePower: 0.65,
    allowBanks: false,
    delayMs: 1000
  },
  [AI_DIFFICULTIES.MASTER]: {
    name: 'Allan Master',
    maxCutAngleDeg: 78,
    aimNoiseDeg: 1.2,
    powerVariance: 0.05,
    basePower: 0.72,
    allowBanks: true,
    delayMs: 800
  },
  [AI_DIFFICULTIES.LEGEND]: {
    name: 'Allan Legend 👑',
    maxCutAngleDeg: 85,
    aimNoiseDeg: 0.2,
    powerVariance: 0.02,
    basePower: 0.8,
    allowBanks: true,
    delayMs: 650
  }
};

export class PoolAI {
  constructor(difficulty = AI_DIFFICULTIES.REGULAR) {
    this.difficulty = difficulty;
    this.config = AI_CONFIGS[difficulty] || AI_CONFIGS[AI_DIFFICULTIES.REGULAR];
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.config = AI_CONFIGS[difficulty] || AI_CONFIGS[AI_DIFFICULTIES.REGULAR];
  }

  // Get list of legal balls for AI player (player 2)
  getLegalTargetBalls(physics, rules) {
    const active = physics.activeObjectBalls;
    if (active.length === 0) return [];

    if (rules.subtype === '8ball') {
      const group = rules.groups[2];
      if (!group) {
        // Open table: can target any ball except 8-ball
        return active.filter(b => !b.isEight);
      }
      const groupCleared = rules.isGroupCleared(physics, group);
      if (groupCleared) {
        // Must target 8-ball
        const eight = physics.eightBall;
        return eight && !eight.inPocket ? [eight] : [];
      }
      return active.filter(b => (group === 'solids' ? b.isSolid : b.isStripe));
    } else if (rules.subtype === '9ball') {
      const lowest = rules.getLowestBall(physics);
      return lowest ? [lowest] : [];
    }

    // Straight pool / Speed pool: any object ball
    return active;
  }

  // Raycast collision check between two points against a list of obstacle balls
  isPathClear(x1, y1, x2, y2, obstacles, ignoreBalls = [], radius = 10) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return true;

    const len = Math.sqrt(lenSq);
    const ux = dx / len;
    const uy = dy / len;

    const clearance = radius * 2 - 1.0;

    for (const b of obstacles) {
      if (b.inPocket || ignoreBalls.includes(b.id)) continue;

      // Projection of (b - p1) onto unit direction
      const bx = b.x - x1;
      const by = b.y - y1;
      const proj = bx * ux + by * uy;

      // Obstacle is ahead of ray start and behind ray end
      if (proj > radius && proj < len - radius) {
        // Perpendicular distance
        const perpSq = (bx * bx + by * by) - (proj * proj);
        if (perpSq < clearance * clearance) {
          return false; // Path blocked!
        }
      }
    }
    return true;
  }

  // Calculate best shot vector (angle, power)
  calculateShot(physics, rules) {
    const cue = physics.cueBall;
    if (!cue || cue.inPocket) {
      return { angle: 0, power: 0.5 };
    }

    const legalBalls = this.getLegalTargetBalls(physics, rules);
    if (legalBalls.length === 0) {
      return { angle: 0, power: 0.5 };
    }

    const pockets = physics.config.pockets;
    const allBalls = physics.balls;
    const r = physics.config.ballRadius;
    const maxCutRad = (this.config.maxCutAngleDeg * Math.PI) / 180;

    const candidateShots = [];

    for (const target of legalBalls) {
      for (const pocket of pockets) {
        // Vector from target ball to pocket
        const tpX = pocket.x - target.x;
        const tpY = pocket.y - target.y;
        const tpDist = Math.hypot(tpX, tpY);
        if (tpDist < 10) continue;

        const uPocketX = tpX / tpDist;
        const uPocketY = tpY / tpDist;

        // Check if path from target to pocket is clear
        const isTargetToPocketClear = this.isPathClear(
          target.x, target.y,
          pocket.x, pocket.y,
          allBalls,
          [0, target.id],
          r
        );

        if (!isTargetToPocketClear) continue;

        // Ghost ball position: center of cue ball when it strikes target ball
        const ghostX = target.x - uPocketX * (r * 2);
        const ghostY = target.y - uPocketY * (r * 2);

        // Check if cue ball path to ghost ball is clear
        const isCueToGhostClear = this.isPathClear(
          cue.x, cue.y,
          ghostX, ghostY,
          allBalls,
          [0, target.id],
          r
        );

        if (!isCueToGhostClear) continue;

        // Vector from cue to ghost ball
        const cgX = ghostX - cue.x;
        const cgY = ghostY - cue.y;
        const cgDist = Math.hypot(cgX, cgY);
        if (cgDist < 1) continue;

        const uCueX = cgX / cgDist;
        const uCueY = cgY / cgDist;

        // Cut angle between cue trajectory and target-to-pocket line
        // dot product = cos(theta)
        const dot = uCueX * uPocketX + uCueY * uPocketY;
        const cutAngleRad = Math.acos(Math.max(-1, Math.min(1, dot)));

        if (cutAngleRad > maxCutRad) continue;

        // Score this candidate shot (higher is better)
        const cutAngleDeg = (cutAngleRad * 180) / Math.PI;
        let score = 1000 - (tpDist * 0.4) - (cgDist * 0.25) - (cutAngleDeg * 8);

        // Bonus for 8-ball when it's the winning shot
        if (target.isEight) score += 200;

        // Power calculation based on distance
        const totalDist = cgDist + tpDist;
        let power = Math.max(0.25, Math.min(0.9, totalDist / 600 * 0.8 + 0.15));

        candidateShots.push({
          angle: Math.atan2(cgY, cgX),
          power,
          score,
          targetId: target.id,
          cutAngleDeg
        });
      }
    }

    let chosenShot;

    if (candidateShots.length > 0) {
      // Sort by score descending
      candidateShots.sort((a, b) => b.score - a.score);
      chosenShot = candidateShots[0];
    } else {
      // Fallback: hit closest legal ball towards center table
      let closest = legalBalls[0];
      let minDist = 99999;
      for (const b of legalBalls) {
        const d = Math.hypot(b.x - cue.x, b.y - cue.y);
        if (d < minDist) {
          minDist = d;
          closest = b;
        }
      }
      chosenShot = {
        angle: Math.atan2(closest.y - cue.y, closest.x - cue.x),
        power: this.config.basePower,
        score: 0
      };
    }

    // Apply Gaussian / pseudo-random aim noise based on difficulty
    const noiseRad = ((Math.random() - 0.5) * 2 * this.config.aimNoiseDeg * Math.PI) / 180;
    const finalAngle = chosenShot.angle + noiseRad;

    // Apply slight power variance
    const powerJitter = (Math.random() - 0.5) * 2 * this.config.powerVariance;
    const finalPower = Math.max(0.15, Math.min(1.0, chosenShot.power + powerJitter));

    return {
      angle: finalAngle,
      power: finalPower,
      targetId: chosenShot.targetId || null
    };
  }

  // Suggest cue ball placement for ball-in-hand
  calculateBallInHandPlacement(physics, rules) {
    const { feltX, feltY, feltW, feltH, pockets } = physics.config;
    const legalBalls = this.getLegalTargetBalls(physics, rules);
    if (legalBalls.length === 0) {
      return { x: feltX + feltW / 2, y: feltY + feltH * 0.7 };
    }

    // Pick easiest ball and place cue ball in line with its best pocket
    const target = legalBalls[0];
    const pocket = pockets[0];
    const dx = pocket.x - target.x;
    const dy = pocket.y - target.y;
    const dist = Math.hypot(dx, dy) || 1;

    // 60px behind target ball
    const idealX = target.x - (dx / dist) * 70;
    const idealY = target.y - (dy / dist) * 70;

    const clampedX = Math.max(feltX + 30, Math.min(feltX + feltW - 30, idealX));
    const clampedY = Math.max(feltY + 30, Math.min(feltY + feltH - 30, idealY));

    return { x: clampedX, y: clampedY };
  }

  // Aliases for interface flexibility
  computeShot(physics, rules) {
    return this.calculateShot(physics, rules);
  }

  computeBallInHand(physics, rules) {
    return this.calculateBallInHandPlacement(physics, rules);
  }
}
