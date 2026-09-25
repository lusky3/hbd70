// src/systems/PoolRules.js
// Rules engine, turn management, foul evaluation, and arcade scoring for Allan's 70th Birthday Retro Pool

export const POOL_SUBTYPES = {
  EIGHT_BALL: '8ball',
  NINE_BALL: '9ball',
  STRAIGHT: 'straight',
  SPEED: 'speed'
};

export class PoolRules {
  constructor(subtype = POOL_SUBTYPES.EIGHT_BALL, isMultiplayer = false) {
    this.subtype = subtype;
    this.isMultiplayer = isMultiplayer;
    this.reset();
  }

  reset() {
    this.activePlayer = 1; // 1 (Human / P1) or 2 (CPU / P2)
    this.scores = { 1: 0, 2: 0 };
    this.streaks = { 1: 0, 2: 0 };
    this.groups = { 1: null, 2: null }; // 'solids' or 'stripes' (for 8-ball)
    this.isBreakShot = true;
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';
    this.ballInHand = false;
    this.ballInHandPlayer = null;
    this.innings = 1;

    // Straight pool tracking
    this.straightRackCount = 0;
    this.straightTargetScore = 25;

    // Speed pool tracking
    this.speedTimer = 90.0;
    this.speedBallsPotted = 0;
    this.speedMaxBalls = 15;
    this.isTimerRunning = false;

    // Stats and shot audit
    this.lastShotResult = null;
  }

  update(dt = 0) {
    if (this.subtype === POOL_SUBTYPES.SPEED && !this.isGameOver) {
      this.speedTimer = Math.max(0, this.speedTimer - dt);
      if (this.speedTimer <= 0) {
        this.isGameOver = true;
        this.winner = 2;
        this.winReason = 'TIME UP! Failed to clear table before time expired.';
      }
    }
  }

  get lowestBallOnTable() {
    // Used in 9-Ball: find lowest active ball id between 1 and 9
    return null; // Calculated with active balls from physics engine
  }

  getLowestBall(physics) {
    const active = physics.activeObjectBalls;
    if (active.length === 0) return null;
    let minBall = active[0];
    for (const b of active) {
      if (b.id < minBall.id) minBall = b;
    }
    return minBall;
  }

  isGroupCleared(physics, group) {
    if (!group) return false;
    const active = physics.activeObjectBalls;
    if (group === 'solids') {
      return !active.some(b => b.isSolid);
    } else if (group === 'stripes') {
      return !active.some(b => b.isStripe);
    }
    return false;
  }

  evaluateShot(physics) {
    const events = physics.events;
    const active = this.activePlayer;
    const opponent = active === 1 ? 2 : 1;

    let isFoul = false;
    let foulReason = '';
    let switchTurn = true;
    let earnedPoints = 0;
    let trickBonus = 0;
    let ballsPottedCount = events.potted.filter(p => !p.isCue).length;

    const cueScratch = events.potted.some(p => p.isCue);
    const eightPotted = events.potted.find(p => p.isEight);
    const ninePotted = events.potted.find(p => p.id === 9 || p.isNine || p.ballId === 9);

    // 1. CUE SCRATCH FOUL
    if (cueScratch) {
      isFoul = true;
      foulReason = 'SCRATCH! Cue ball pocketed';
    }

    // 2. RULES PER SUBTYPE
    if (this.subtype === POOL_SUBTYPES.EIGHT_BALL) {
      const activeGroup = this.groups[active];
      const opponentGroup = this.groups[opponent];

      // Check first contact
      if (!isFoul) {
        if (!events.firstContact) {
          isFoul = true;
          foulReason = 'FOUL! No ball struck';
        } else if (activeGroup) {
          const groupCleared = this.isGroupCleared(physics, activeGroup);
          if (!groupCleared) {
            // Must hit own group ball first
            const hitOwn = (activeGroup === 'solids' && events.firstContact.isSolid) ||
                           (activeGroup === 'stripes' && events.firstContact.isStripe);
            if (!hitOwn) {
              isFoul = true;
              foulReason = `FOUL! Must hit ${activeGroup.toUpperCase()} first`;
            }
          } else {
            // Group cleared: must hit 8-ball first
            if (!events.firstContact.isEight) {
              isFoul = true;
              foulReason = 'FOUL! Must hit 8-BALL first';
            }
          }
        } else if ((this.isBreakShot || !activeGroup) && events.firstContact.isEight) {
          // Illegal to hit 8-ball first on open table
          isFoul = true;
          foulReason = 'FOUL! Cannot hit 8-ball first on open table';
        }

        // Cushion rule: if no ball was potted, at least one ball must contact a cushion after hit
        if (!isFoul && ballsPottedCount === 0 && events.cushionCountAfterContact === 0) {
          isFoul = true;
          foulReason = 'FOUL! No cushion contacted after strike';
        }
      }

      // Check 8-ball pot
      if (eightPotted) {
        const groupCleared = activeGroup ? this.isGroupCleared(physics, activeGroup) : false;
        if (cueScratch || isFoul || !groupCleared) {
          // Premature or scratch 8-ball = Loss!
          this.isGameOver = true;
          this.winner = opponent;
          this.winReason = cueScratch
            ? `Player ${active} scratched on the 8-ball!`
            : `Player ${active} pocketed the 8-ball early!`;
        } else {
          // Legal 8-ball win!
          this.isGameOver = true;
          this.winner = active;
          this.winReason = `Player ${active} legally pocketed the 8-ball for the WIN!`;
          earnedPoints += 2500;
        }
      } else if (!isFoul && ballsPottedCount > 0) {
        // Group assignment on open table
        if (!activeGroup) {
          const firstPotted = events.potted.find(p => !p.isCue && !p.isEight);
          if (firstPotted) {
            if (firstPotted.isSolid) {
              this.groups[active] = 'solids';
              this.groups[opponent] = 'stripes';
            } else if (firstPotted.isStripe) {
              this.groups[active] = 'stripes';
              this.groups[opponent] = 'solids';
            }
          }
        }

        // Check if player pocketed at least one of their assigned balls
        const currentGroup = this.groups[active];
        const pocketedOwn = events.potted.some(p =>
          (currentGroup === 'solids' && p.isSolid) ||
          (currentGroup === 'stripes' && p.isStripe) ||
          (!currentGroup && !p.isEight && !p.isCue)
        );

        if (pocketedOwn) {
          switchTurn = false; // Keep turn!
          this.streaks[active]++;
          earnedPoints += ballsPottedCount * 150 * Math.min(4, this.streaks[active]);
        }
      }

    } else if (this.subtype === POOL_SUBTYPES.NINE_BALL) {
      const lowestBall = this.getLowestBall(physics);

      // Must strike lowest ball first
      if (!isFoul) {
        if (!events.firstContact) {
          isFoul = true;
          foulReason = 'FOUL! No ball struck';
        } else if (lowestBall && events.firstContact.id !== lowestBall.id) {
          isFoul = true;
          foulReason = `FOUL! Did not hit lowest ball (#${lowestBall.id}) first`;
        } else if (ballsPottedCount === 0 && events.cushionCountAfterContact === 0) {
          isFoul = true;
          foulReason = 'FOUL! No cushion contacted after strike';
        }
      }

      // Check 9-ball pocketed
      if (ninePotted) {
        if (isFoul) {
          // Re-spot 9-ball on foot spot
          const nine = physics.balls.find(b => b.id === 9);
          if (nine) {
            const { feltX, feltY, feltW, feltH } = physics.config;
            nine.reset(feltX + feltW / 2, feltY + feltH * 0.28);
          }
        } else {
          // Legal 9-ball pot = WIN!
          this.isGameOver = true;
          this.winner = active;
          this.winReason = `Player ${active} pocketed the 9-BALL for the WIN!`;
          earnedPoints += 3000;
        }
      }

      if (!isFoul && ballsPottedCount > 0 && !this.isGameOver) {
        switchTurn = false;
        this.streaks[active]++;
        earnedPoints += ballsPottedCount * 120 * Math.min(4, this.streaks[active]);
      }

    } else if (this.subtype === POOL_SUBTYPES.STRAIGHT) {
      // Straight Pool (14.1 Continuous): 1 point per legal ball potted
      if (!isFoul) {
        if (!events.firstContact) {
          isFoul = true;
          foulReason = 'FOUL! No ball struck';
        } else if (ballsPottedCount === 0 && events.cushionCountAfterContact === 0) {
          isFoul = true;
          foulReason = 'FOUL! No cushion contacted after strike';
        }
      }

      if (isFoul) {
        this.scores[active] = Math.max(0, this.scores[active] - 1);
      } else if (ballsPottedCount > 0) {
        switchTurn = false;
        this.streaks[active]++;
        earnedPoints += ballsPottedCount;
        this.scores[active] += earnedPoints;

        // Check if only 1 object ball remains: automatic re-rack!
        if (physics.activeObjectBalls.length <= 1) {
          this.straightRackCount++;
          physics.reRackStraightPool();
        }

        // Target victory
        if (this.scores[active] >= this.straightTargetScore) {
          this.isGameOver = true;
          this.winner = active;
          this.winReason = `Player ${active} reached the target of ${this.straightTargetScore} points!`;
        }
      }

    } else if (this.subtype === POOL_SUBTYPES.SPEED) {
      // Speed Pool: Solo time attack
      if (isFoul) {
        this.speedTimer = Math.max(0, this.speedTimer - 15.0);
        foulReason = 'FOUL! -15s Penalty';
      } else if (ballsPottedCount > 0) {
        this.speedBallsPotted += ballsPottedCount;
        this.speedTimer += ballsPottedCount * 10.0;
        this.streaks[1]++;
        earnedPoints += ballsPottedCount * 200 * Math.min(4, this.streaks[1]);
        this.scores[1] += earnedPoints;

        // Check clearance
        if (physics.activeObjectBalls.length === 0) {
          this.isGameOver = true;
          this.winner = 1;
          const timeBonus = Math.round(this.speedTimer * 1000);
          this.scores[1] += timeBonus + 5000;
          this.winReason = `SPEED CLEAR! Time remaining: ${this.speedTimer.toFixed(1)}s (+${timeBonus} bonus pts)`;
        }
      }
      switchTurn = false; // Speed pool is always player 1
    }

    // Trick shot bonuses: Bank Shot, Break Pot, Combo
    if (!isFoul && ballsPottedCount > 0 && this.subtype !== POOL_SUBTYPES.STRAIGHT) {
      if (this.isBreakShot) {
        trickBonus += 300; // Break Pot Bonus
      }
      if (events.cushionCountAfterContact >= 2) {
        trickBonus += 500; // Bank Shot
      }
      if (events.ballCollisions.length >= 2) {
        trickBonus += 750; // Carom / Combo
      }
      this.scores[active] += trickBonus;
    }

    if (this.subtype !== POOL_SUBTYPES.STRAIGHT && this.subtype !== POOL_SUBTYPES.SPEED) {
      this.scores[active] += earnedPoints;
    }

    // Handle fouls and ball-in-hand
    if (isFoul) {
      this.streaks[active] = 0;
      this.ballInHand = true;
      this.ballInHandPlayer = opponent;
      switchTurn = true;
    } else if (ballsPottedCount === 0) {
      this.streaks[active] = 0;
      switchTurn = true;
      this.ballInHand = false;
      this.ballInHandPlayer = null;
    }

    // Turn transition
    this.isBreakShot = false;
    if (switchTurn && !this.isGameOver && this.subtype !== POOL_SUBTYPES.SPEED) {
      this.activePlayer = opponent;
      this.innings++;
    }

    this.lastShotResult = {
      isFoul,
      foulReason,
      ballsPottedCount,
      pottedIds: events.potted.map(p => p.ballId),
      earnedPoints,
      trickBonus,
      switchTurn,
      activePlayer: this.activePlayer,
      ballInHand: this.ballInHand
    };

    return this.lastShotResult;
  }
}
