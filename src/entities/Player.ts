// src/entities/Player.ts

export class Player {
  row: number;
  col: number;
  private map: any;

  constructor(startRow: number, startCol: number, map: any) {
    this.row = startRow;
    this.col = startCol;
    this.map = map;
  }

  move(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    let newRow = this.row;
    let newCol = this.col;

    switch (direction) {
      case 'up': newRow--; break;
      case 'down': newRow++; break;
      case 'left': newCol--; break;
      case 'right': newCol++; break;
    }

    if (this.map.isWalkable(newRow, newCol)) {
      this.row = newRow;
      this.col = newCol;
      return true;
    }
    return false;
  }

  getPosition(): { row: number; col: number } {
    return { row: this.row, col: this.col };
  }

  isAtExit(): boolean {
    return this.map.isExit(this.row, this.col);
  }
}