// src/ui/DebugCanvas.ts

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;
  private overlayOpacity: number = 0;
  private overlayTarget: number = 0;

  constructor(canvas: HTMLCanvasElement, tileSize: number = 50) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.tileSize = tileSize;
  }

  render(map: any, player: any, predator?: any, gameStatus?: string): void {
    const rows = map.rows;
    const cols = map.cols;
    
    // --- Main Game Canvas ---
    this.canvas.width = cols * this.tileSize;
    this.canvas.height = rows * this.tileSize;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * this.tileSize;
        const y = r * this.tileSize;
        const color = map.getTileColor(r, c);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, this.tileSize - 1, this.tileSize - 1);
        this.ctx.strokeStyle = '#333';
        this.ctx.strokeRect(x, y, this.tileSize - 1, this.tileSize - 1);

        if (map.grid[r][c] === 'E') {
          this.ctx.fillStyle = '#00ff00';
          this.ctx.font = '20px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('🚪', x + this.tileSize/2, y + this.tileSize/2);
        }
      }
    }

    // --- Draw Predator ---
    if (predator) {
      const predPos = predator.getPosition();
      const px = predPos.col * this.tileSize + this.tileSize/2;
      const py = predPos.row * this.tileSize + this.tileSize/2;

      const glowSize = predator.getState() === 'chase' ? 35 : 20;
      const gradient = this.ctx.createRadialGradient(px, py, 5, px, py, glowSize);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(px, py, glowSize, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff2222';
      this.ctx.beginPath();
      this.ctx.arc(px, py, 18, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ff6666';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffff00';
      this.ctx.beginPath();
      this.ctx.arc(px - 6, py - 4, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(px + 6, py - 4, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#cc0000';
      this.ctx.beginPath();
      this.ctx.arc(px - 5, py - 3, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(px + 7, py - 3, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff4444';
      this.ctx.fillRect(px - 8, py + 6, 4, 4);
      this.ctx.fillRect(px + 4, py + 6, 4, 4);

      this.ctx.fillStyle = '#ff6666';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(predator.getState().toUpperCase(), px, py + 24);
    }

    // --- Draw Player ---
    const playerPos = player.getPosition();
    const px = playerPos.col * this.tileSize + this.tileSize/2;
    const py = playerPos.row * this.tileSize + this.tileSize/2;
    
    const gradient = this.ctx.createRadialGradient(px, py, 5, px, py, 25);
    gradient.addColorStop(0, 'rgba(0, 150, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(px, py, 25, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#00bfff';
    this.ctx.beginPath();
    this.ctx.arc(px, py, 18, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(px - 6, py - 4, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(px + 6, py - 4, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(px - 5, py - 3, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(px + 7, py - 3, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // --- Status text ---
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`Position: (${playerPos.row}, ${playerPos.col})`, 10, 10);
    
    if (predator && gameStatus === 'playing') {
      const dist = Math.sqrt(
        Math.pow(playerPos.row - predator.row, 2) + 
        Math.pow(playerPos.col - predator.col, 2)
      );
      this.ctx.fillStyle = '#ff6666';
      this.ctx.fillText(`Predator: ${dist.toFixed(1)} tiles away`, 10, 30);
    }

    // --- WIN / LOSE OVERLAYS ---
    if (gameStatus === 'won') {
      this.drawWinOverlay();
    } else if (gameStatus === 'lost') {
      this.drawLoseOverlay();
    }

    // --- Minimap ---
    this.drawMinimap(map, player, predator);
  }

  // --- WIN OVERLAY ---
  private drawWinOverlay(): void {
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Glow effect
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width/2, this.canvas.height/2 - 20, 10,
      this.canvas.width/2, this.canvas.height/2 - 20, 200
    );
    gradient.addColorStop(0, 'rgba(0, 255, 100, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Main title
    this.ctx.fillStyle = '#00ff44';
    this.ctx.font = 'bold 56px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(0, 255, 68, 0.5)';
    this.ctx.shadowBlur = 30;
    this.ctx.fillText('🎉 YOU ESCAPED!', this.canvas.width/2, this.canvas.height/2 - 30);
    this.ctx.shadowBlur = 0;

    // Subtitle
    this.ctx.fillStyle = '#88ffaa';
    this.ctx.font = '24px Arial';
    this.ctx.fillText('You outsmarted the predator!', this.canvas.width/2, this.canvas.height/2 + 30);

    // Restart instruction
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 80);

    // Decorative border
    this.ctx.strokeStyle = 'rgba(0, 255, 68, 0.3)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40);
  }

  // --- LOSE OVERLAY ---
  private drawLoseOverlay(): void {
    // Dark red overlay
    this.ctx.fillStyle = 'rgba(30, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Red glow
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width/2, this.canvas.height/2 - 20, 10,
      this.canvas.width/2, this.canvas.height/2 - 20, 200
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Skull emoji
    this.ctx.font = '80px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('💀', this.canvas.width/2, this.canvas.height/2 - 60);

    // Main title
    this.ctx.fillStyle = '#ff2222';
    this.ctx.font = 'bold 52px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    this.ctx.shadowBlur = 30;
    this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 + 30);
    this.ctx.shadowBlur = 0;

    // Subtitle
    this.ctx.fillStyle = '#ff6666';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('The predator got you...', this.canvas.width/2, this.canvas.height/2 + 70);

    // Restart instruction
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 115);

    // Decorative border
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40);
  }

  // --- MINIMAP ---
  private drawMinimap(map: any, player: any, predator?: any): void {
    const minimapSize = 150;
    const padding = 15;
    const x = this.canvas.width - minimapSize - padding;
    const y = padding;
    const tileSize = minimapSize / Math.max(map.rows, map.cols);

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(x - 5, y - 5, minimapSize + 10, minimapSize + 10);
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - 5, y - 5, minimapSize + 10, minimapSize + 10);

    this.ctx.shadowColor = 'rgba(0, 150, 255, 0.2)';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = '#00bfff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 5, y - 5, minimapSize + 10, minimapSize + 10);
    this.ctx.shadowBlur = 0;

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const tileX = x + c * tileSize;
        const tileY = y + r * tileSize;
        
        if (map.grid[r][c] === '#') {
          this.ctx.fillStyle = '#2d2d2d';
          this.ctx.fillRect(tileX, tileY, tileSize, tileSize);
        } else if (map.grid[r][c] === 'E') {
          this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          this.ctx.fillRect(tileX, tileY, tileSize, tileSize);
        } else {
          this.ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
          this.ctx.fillRect(tileX, tileY, tileSize, tileSize);
        }
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.strokeRect(tileX, tileY, tileSize, tileSize);
      }
    }

    if (map.exitRow >= 0 && map.exitCol >= 0) {
      const ex = x + map.exitCol * tileSize + tileSize/2;
      const ey = y + map.exitRow * tileSize + tileSize/2;
      this.ctx.fillStyle = '#00ff00';
      this.ctx.beginPath();
      this.ctx.arc(ex, ey, tileSize/3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (predator) {
      const predPos = predator.getPosition();
      const px = x + predPos.col * tileSize + tileSize/2;
      const py = y + predPos.row * tileSize + tileSize/2;
      this.ctx.fillStyle = '#ff0000';
      this.ctx.beginPath();
      this.ctx.arc(px, py, tileSize/2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(px, py, tileSize/1.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    const playerPos = player.getPosition();
    const px = x + playerPos.col * tileSize + tileSize/2;
    const py = y + playerPos.row * tileSize + tileSize/2;
    this.ctx.fillStyle = '#00bfff';
    this.ctx.shadowColor = 'rgba(0, 150, 255, 0.5)';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.arc(px, py, tileSize/2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.font = '8px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('🗺️ RADAR', x + 2, y + minimapSize - 2);
  }
}