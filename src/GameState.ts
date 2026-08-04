// src/GameState.ts

export type GameStatus = 'playing' | 'won' | 'lost';

export class GameState {
  private status: GameStatus = 'playing';
  private winCallbacks: (() => void)[] = [];
  private loseCallbacks: (() => void)[] = [];
  private restartCallbacks: (() => void)[] = [];

  getStatus(): GameStatus {
    return this.status;
  }

  isPlaying(): boolean {
    return this.status === 'playing';
  }

  isGameOver(): boolean {
    return this.status === 'won' || this.status === 'lost';
  }

  setWin(): void {
    if (this.status === 'playing') {
      this.status = 'won';
      console.log('🎉 GAME WON!');
      this.winCallbacks.forEach(cb => cb());
    }
  }

  setLose(): void {
    if (this.status === 'playing') {
      this.status = 'lost';
      console.log('💀 GAME LOST!');
      this.loseCallbacks.forEach(cb => cb());
    }
  }

  reset(): void {
    this.status = 'playing';
    console.log('🔄 Game reset.');
    this.restartCallbacks.forEach(cb => cb());
  }

  // Register callbacks
  onWin(callback: () => void): void {
    this.winCallbacks.push(callback);
  }

  onLose(callback: () => void): void {
    this.loseCallbacks.push(callback);
  }

  onRestart(callback: () => void): void {
    this.restartCallbacks.push(callback);
  }

  // Clear all callbacks (useful for full reset)
  clearCallbacks(): void {
    this.winCallbacks = [];
    this.loseCallbacks = [];
    this.restartCallbacks = [];
  }
}