// Predator.ts 
// src/entities/Predator.ts

type State = 'patrol' | 'investigate' | 'chase';

export class Predator {
  row: number;
  col: number;
  private map: any;
  private player: any;
  private state: State = 'patrol';
  private patrolDirection: { dr: number; dc: number } = { dr: 0, dc: 0 };
  private patrolStepsRemaining: number = 0;
  private investigateTarget: { row: number; col: number } | null = null;
  private chaseTimer: number = 0;
  private readonly CHASE_RANGE = 3; // If player is this close, start chase
  private readonly INVESTIGATE_RANGE = 5; // If ping is this close, investigate
  private readonly PATROL_INTERVAL = 600; // ms between patrol moves
  private readonly CHASE_INTERVAL = 200; // ms between chase moves
  private moveCooldown: number = 0;

  constructor(startRow: number, startCol: number, map: any, player: any) {
    this.row = startRow;
    this.col = startCol;
    this.map = map;
    this.player = player;
    this.pickRandomDirection();
  }

  // Called when the player sends a ping
  setPingLocation(row: number, col: number): void {
    const dist = this.getDistance(row, col);
    console.log(`🐾 Predator hears ping at (${row}, ${col}) - distance: ${dist.toFixed(1)}`);

    if (dist <= this.CHASE_RANGE) {
      // Very close ping - immediate chase
      this.state = 'chase';
      this.chaseTimer = 5; // Chase for 5 ticks
      console.log('🐾 PREDATOR CHASING!');
    } else if (dist <= this.INVESTIGATE_RANGE) {
      // Moderate distance - investigate
      this.state = 'investigate';
      this.investigateTarget = { row, col };
      console.log('🐾 Predator investigating...');
    } else {
      // Too far - ignore
      console.log('🐾 Predator ignores distant ping.');
    }
  }

  // Main update function - call this on a timer
  update(): void {
    // Decrease cooldown
    if (this.moveCooldown > 0) {
      this.moveCooldown--;
      return;
    }

    const playerPos = this.player.getPosition();
    const playerDist = this.getDistance(playerPos.row, playerPos.col);

    // State transition logic
    if (this.state === 'chase') {
      this.chaseTimer--;
      if (this.chaseTimer <= 0 || playerDist > this.INVESTIGATE_RANGE * 1.5) {
        this.state = 'patrol';
        this.pickRandomDirection();
        console.log('🐾 Predator lost the trail. Back to patrol.');
      }
    }

    if (this.state === 'investigate') {
      if (this.investigateTarget) {
        const targetDist = this.getDistance(this.investigateTarget.row, this.investigateTarget.col);
        if (targetDist <= 1) {
          // Reached investigate target, go back to patrol
          this.state = 'patrol';
          this.investigateTarget = null;
          this.pickRandomDirection();
          console.log('🐾 Predator found nothing. Back to patrol.');
        }
      } else {
        this.state = 'patrol';
        this.pickRandomDirection();
      }
    }

    // If player is very close, always chase regardless of state
    if (playerDist <= this.CHASE_RANGE && this.state !== 'chase') {
      this.state = 'chase';
      this.chaseTimer = 3;
      console.log('🐾 PREDATOR SPOTTED PLAYER!');
    }

    // Execute movement based on state
    let moved = false;
    switch (this.state) {
      case 'patrol':
        moved = this.patrolMove();
        this.moveCooldown = this.PATROL_INTERVAL / 100; // 600ms
        break;
      case 'investigate':
        moved = this.investigateMove();
        this.moveCooldown = this.PATROL_INTERVAL / 100;
        break;
      case 'chase':
        moved = this.chaseMove();
        this.moveCooldown = this.CHASE_INTERVAL / 100; // 200ms
        break;
    }

    // If couldn't move in patrol, pick a new direction
    if (!moved && this.state === 'patrol') {
      this.pickRandomDirection();
    }
  }

  private patrolMove(): boolean {
    // Walk in current direction
    if (this.patrolStepsRemaining <= 0) {
      this.pickRandomDirection();
    }

    const newRow = this.row + this.patrolDirection.dr;
    const newCol = this.col + this.patrolDirection.dc;

    if (this.map.isWalkable(newRow, newCol)) {
      // Also don't walk into the exit
      if (!this.map.isExit(newRow, newCol)) {
        this.row = newRow;
        this.col = newCol;
        this.patrolStepsRemaining--;
        return true;
      }
    }

    // Hit a wall or exit - pick new direction
    this.pickRandomDirection();
    return false;
  }

  private investigateMove(): boolean {
    if (!this.investigateTarget) return false;

    const dr = Math.sign(this.investigateTarget.row - this.row);
    const dc = Math.sign(this.investigateTarget.col - this.col);

    // Try to move towards target
    const moves = [
      { dr, dc },
      { dr, dc: 0 },
      { dr: 0, dc },
      { dr: -dc, dc: dr }, // Perpendicular moves as fallback
      { dr: dc, dc: -dr }
    ];

    for (const move of moves) {
      const newRow = this.row + move.dr;
      const newCol = this.col + move.dc;
      if (this.map.isWalkable(newRow, newCol) && !this.map.isExit(newRow, newCol)) {
        this.row = newRow;
        this.col = newCol;
        return true;
      }
    }

    // Stuck - go back to patrol
    this.state = 'patrol';
    this.investigateTarget = null;
    this.pickRandomDirection();
    return false;
  }

  private chaseMove(): boolean {
    const playerPos = this.player.getPosition();
    const dr = Math.sign(playerPos.row - this.row);
    const dc = Math.sign(playerPos.col - this.col);

    // Try direct move first, then orthogonal
    const moves = [
      { dr, dc },
      { dr, dc: 0 },
      { dr: 0, dc }
    ];

    for (const move of moves) {
      const newRow = this.row + move.dr;
      const newCol = this.col + move.dc;
      if (this.map.isWalkable(newRow, newCol) && !this.map.isExit(newRow, newCol)) {
        this.row = newRow;
        this.col = newCol;
        return true;
      }
    }

    // Stuck - slow down
    return false;
  }

  private pickRandomDirection(): void {
    const directions = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    this.patrolDirection = dir;
    this.patrolStepsRemaining = Math.floor(Math.random() * 4) + 2; // 2-5 steps
  }

  private getDistance(row: number, col: number): number {
    return Math.sqrt(
      Math.pow(this.row - row, 2) + Math.pow(this.col - col, 2)
    );
  }

  getPosition(): { row: number; col: number } {
    return { row: this.row, col: this.col };
  }

  getState(): string {
    return this.state;
  }

  // Check if predator is on the player
  hasCaughtPlayer(): boolean {
    const pPos = this.player.getPosition();
    return this.row === pPos.row && this.col === pPos.col;
  }
}