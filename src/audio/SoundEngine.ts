// SoundEngine.ts 
// src/audio/SoundEngine.ts

export class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private map: any; // Reference to the map for proximity checks
  private player: any; // Reference to the player

  constructor(map: any, player: any) {
    this.map = map;
    this.player = player;
  }

  // Must be called on user gesture (click/tap)
  unlockAudio(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isUnlocked = true;
    console.log('🔊 Audio unlocked! Press SPACE to ping.');
  }

  // Main sonar ping function - called when player presses SPACE
  ping(): void {
    if (!this.isUnlocked || !this.audioCtx) {
      console.warn('⚠️ Audio not unlocked. Click the page first.');
      return;
    }

    const pos = this.player.getPosition();
    const row = pos.row;
    const col = pos.col;

    console.log(`📡 PING! at (${row}, ${col})`);

    // 1. Play the main ping sound
    this.playPingSound(row, col);

    // 2. Detect nearby objects and play echo responses
    this.detectObjects(row, col);
  }

  private playPingSound(row: number, col: number): void {
    if (!this.audioCtx) return;

    // Create oscillator for the ping
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    // Create panner for spatialization
    const panner = this.audioCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';

    // Map grid position to 3D space (x = col, z = row)
    // Normalize to range -10 to 10 for audio positioning
    const xPos = (col / this.map.cols) * 20 - 10;
    const zPos = (row / this.map.rows) * 20 - 10;
    panner.positionX.value = xPos;
    panner.positionZ.value = zPos;

    // Connect: oscillator -> gain -> panner -> destination
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.audioCtx.destination);

    // Ping sound: high-frequency sweep (like a sonar)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.3);

    // Volume envelope: quick attack, slow decay
    gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

    // Start and stop
    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.4);
  }

  private detectObjects(row: number, col: number): void {
    if (!this.audioCtx) return;

    // Check all 8 directions for nearby walls/objects
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    let objectFound = false;

    for (const [dr, dc] of directions) {
      const checkRow = row + dr;
      const checkCol = col + dc;

      // Check if the cell is a wall (#) or exit (E)
      if (this.map.isWalkable(checkRow, checkCol) === false) {
        // It's a wall or out of bounds
        objectFound = true;
        this.playEcho(checkRow, checkCol, row, col, '#');
      } else if (this.map.isExit(checkRow, checkCol)) {
        // It's the exit!
        objectFound = true;
        this.playEcho(checkRow, checkCol, row, col, 'E');
      }
    }

    if (!objectFound) {
      // No objects nearby - play a faint "open space" sound
      this.playOpenSpaceSound();
    }
  }

  private playEcho(objectRow: number, objectCol: number, playerRow: number, playerCol: number, type: string): void {
    if (!this.audioCtx) return;

    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(objectRow - playerRow, 2) + Math.pow(objectCol - playerCol, 2)
    );

    // Normalize distance (max distance is ~14 for a 10x10 grid)
    const normalizedDist = Math.min(distance / 14, 1);

    // Create echo sound
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    // Panner for echo position
    const panner = this.audioCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    const xPos = (objectCol / this.map.cols) * 20 - 10;
    const zPos = (objectRow / this.map.rows) * 20 - 10;
    panner.positionX.value = xPos;
    panner.positionZ.value = zPos;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.audioCtx.destination);

    // Echo characteristics depend on object type and distance
    let baseFreq = 600;
    let volume = 0.3;

    if (type === '#') {
      // Wall: low, muffled echo
      baseFreq = 300 + (1 - normalizedDist) * 200;
      volume = 0.15 * (1 - normalizedDist);
    } else if (type === 'E') {
      // Exit: bright, musical echo
      baseFreq = 900 + (1 - normalizedDist) * 300;
      volume = 0.3 * (1 - normalizedDist);
      // Add a slight pitch bend for exit (like a beacon)
      osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.audioCtx.currentTime + 0.2);
    }

    if (volume < 0.01) return; // Too far to hear

    osc.type = 'sine';
    osc.frequency.value = baseFreq;

    // Echo volume and delay
    const delayTime = normalizedDist * 0.15 + 0.05; // 0.05s to 0.2s delay
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime + delayTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + delayTime + 0.2);

    osc.start(this.audioCtx.currentTime + delayTime);
    osc.stop(this.audioCtx.currentTime + delayTime + 0.3);

    console.log(`  🔹 Echo from ${type} at (${objectRow}, ${objectCol}) - distance: ${distance.toFixed(1)}`);
  }

  private playOpenSpaceSound(): void {
    if (!this.audioCtx) return;

    // Very faint white noise to indicate open space
    const bufferSize = this.audioCtx.sampleRate * 0.1;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);

    source.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start(this.audioCtx.currentTime + 0.05);
    source.stop(this.audioCtx.currentTime + 0.35);

    console.log('  🔹 No walls nearby - open space');
  }

  // Check if audio is ready
  isReady(): boolean {
    return this.isUnlocked && this.audioCtx !== null;
  }

    // --- Win sound: Ascending triumphant melody ---
  playWinSound(): void {
    if (!this.audioCtx) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const durations = [0.15, 0.15, 0.15, 0.3];

    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      const startTime = this.audioCtx!.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);
      osc.start(startTime);
      osc.stop(startTime + durations[i]);
    });

    // Add a final chord
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = 523;
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.2);
    osc.start(this.audioCtx.currentTime + 0.5);
    osc.stop(this.audioCtx.currentTime + 1.2);

    console.log('🎵 Victory fanfare played!');
  }

  // --- Lose sound: Deep, descending scary tone ---
  playLoseSound(): void {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.8);

    // Add a second low rumble
    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(this.audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.value = 60;
    gain2.gain.setValueAtTime(0.3, this.audioCtx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.0);
    osc2.start(this.audioCtx.currentTime + 0.2);
    osc2.stop(this.audioCtx.currentTime + 1.0);

    console.log('💀 Game over sound played!');
  }
}