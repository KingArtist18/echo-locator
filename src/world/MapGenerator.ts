// src/world/MapGenerator.ts

export class MapGenerator {
  grid: string[][];
  rows: number;
  cols: number;
  exitRow: number;
  exitCol: number;
  tileSize: number = 50; // Size of each tile in pixels

  constructor(rows: number = 10, cols: number = 10) {
    this.rows = rows;
    this.cols = cols;
    this.grid = [];
    this.exitRow = -1;
    this.exitCol = -1;
    this.generate();
  }

  generate(): void {
    // Step 1: Fill grid with empty spaces '.'
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = '.';
      }
    }

    // Step 2: Place random walls '#' (about 20% of the grid)
    const wallCount = Math.floor(this.rows * this.cols * 0.2);
    let wallsPlaced = 0;
    while (wallsPlaced < wallCount) {
      const randomRow = Math.floor(Math.random() * this.rows);
      const randomCol = Math.floor(Math.random() * this.cols);
      // Avoid placing walls on the edges or where exit will go
      if (randomRow === 0 || randomRow === this.rows - 1 || 
          randomCol === 0 || randomCol === this.cols - 1) {
        continue;
      }
      if (this.grid[randomRow][randomCol] === '.') {
        this.grid[randomRow][randomCol] = '#';
        wallsPlaced++;
      }
    }

    // Step 3: Place exit 'E' in a random empty cell on the edge
    const edges = [
      [0, 0], [0, this.cols - 1], [this.rows - 1, 0], [this.rows - 1, this.cols - 1]
    ];
    const corner = edges[Math.floor(Math.random() * edges.length)];
    if (this.grid[corner[0]][corner[1]] === '.') {
      this.exitRow = corner[0];
      this.exitCol = corner[1];
    } else {
      let found = false;
      for (let c = 0; c < this.cols && !found; c++) {
        if (this.grid[0][c] === '.') { this.exitRow = 0; this.exitCol = c; found = true; }
      }
      for (let r = 0; r < this.rows && !found; r++) {
        if (this.grid[r][0] === '.') { this.exitRow = r; this.exitCol = 0; found = true; }
      }
      for (let c = 0; c < this.cols && !found; c++) {
        if (this.grid[this.rows - 1][c] === '.') { this.exitRow = this.rows - 1; this.exitCol = c; found = true; }
      }
      for (let r = 0; r < this.rows && !found; r++) {
        if (this.grid[r][this.cols - 1] === '.') { this.exitRow = r; this.exitCol = this.cols - 1; found = true; }
      }
    }
    this.grid[this.exitRow][this.exitCol] = 'E';
  }

  isWalkable(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return false;
    }
    return this.grid[row][col] !== '#';
  }

  isExit(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return false;
    }
    return this.grid[row][col] === 'E';
  }

  // Get the color for each tile type
  getTileColor(row: number, col: number): string {
    const tile = this.grid[row][col];
    switch (tile) {
      case '#': return '#2d2d2d'; // Dark grey for walls
      case 'E': return '#00ff00'; // Green for exit
      default: return '#1a1a2e'; // Dark blue for empty floor
    }
  }
}