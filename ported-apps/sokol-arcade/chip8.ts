/**
 * Chip-8 Emulator
 *
 * A Chip-8 interpreter supporting the full instruction set.
 * Ported from floooh/chipz
 *
 * @see https://github.com/floooh/chipz
 *
 * Portions copyright (c) 2021 Andre Weissflog (floooh)
 * Portions copyright (c) 2025 Paul Hammant
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export class Chip8 {
  memory = new Uint8Array(4096);
  v = new Uint8Array(16); // Registers V0-VF
  i = 0; // Index register
  pc = 0x200; // Program counter
  stack: number[] = [];
  delayTimer = 0;
  soundTimer = 0;
  display = new Uint8Array(64 * 32);
  keys = new Uint8Array(16);
  waiting = false;
  waitReg = 0;
  running = false;
  intervalId: ReturnType<typeof setInterval> | null = null;
  onUpdate?: () => void;

  constructor() {
    this.loadFont();
    this.loadDefaultProgram();
  }

  loadFont(): void {
    const font = [
      0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80, // F
    ];
    for (let i = 0; i < font.length; i++) {
      this.memory[i] = font[i];
    }
  }

  loadDefaultProgram(): void {
    // Simple bouncing ball program
    const program = [
      0x60, 0x00, // V0 = 0 (x)
      0x61, 0x00, // V1 = 0 (y)
      0x62, 0x01, // V2 = 1 (dx)
      0x63, 0x01, // V3 = 1 (dy)
      0xA0, 0x00, // I = 0 (sprite at font 0)
      0x00, 0xE0, // CLS
      0xD0, 0x15, // DRW V0, V1, 5
      0x80, 0x24, // V0 += V2
      0x81, 0x34, // V1 += V3
      0x40, 0x3B, // SNE V0, 59
      0x72, 0xFE, // V2 = -V2 (add -2)
      0x30, 0x00, // SE V0, 0
      0x72, 0x02, // V2 = +2
      0x41, 0x1B, // SNE V1, 27
      0x73, 0xFE, // V3 = -V3
      0x31, 0x00, // SE V1, 0
      0x73, 0x02, // V3 = +2
      0x12, 0x0A, // JP 0x20A (loop to DRW)
    ];
    for (let i = 0; i < program.length; i++) {
      this.memory[0x200 + i] = program[i];
    }
  }

  loadProgram(data: Uint8Array): void {
    this.reset();
    for (let i = 0; i < data.length && i + 0x200 < 4096; i++) {
      this.memory[0x200 + i] = data[i];
    }
  }

  reset(): void {
    this.v.fill(0);
    this.i = 0;
    this.pc = 0x200;
    this.stack = [];
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.display.fill(0);
    this.keys.fill(0);
    this.waiting = false;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => {
      for (let i = 0; i < 10; i++) this.step();
      if (this.delayTimer > 0) this.delayTimer--;
      if (this.soundTimer > 0) this.soundTimer--;
      this.onUpdate?.();
    }, 16);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  setKey(key: number, pressed: boolean): void {
    if (key >= 0 && key < 16) {
      this.keys[key] = pressed ? 1 : 0;
      if (pressed && this.waiting) {
        this.v[this.waitReg] = key;
        this.waiting = false;
      }
    }
  }

  step(): void {
    if (this.waiting) return;

    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc += 2;

    const x = (opcode >> 8) & 0xF;
    const y = (opcode >> 4) & 0xF;
    const n = opcode & 0xF;
    const nn = opcode & 0xFF;
    const nnn = opcode & 0xFFF;

    switch (opcode & 0xF000) {
      case 0x0000:
        if (opcode === 0x00E0) this.display.fill(0);
        else if (opcode === 0x00EE) this.pc = this.stack.pop() || 0x200;
        break;
      case 0x1000: this.pc = nnn; break;
      case 0x2000: this.stack.push(this.pc); this.pc = nnn; break;
      case 0x3000: if (this.v[x] === nn) this.pc += 2; break;
      case 0x4000: if (this.v[x] !== nn) this.pc += 2; break;
      case 0x5000: if (this.v[x] === this.v[y]) this.pc += 2; break;
      case 0x6000: this.v[x] = nn; break;
      case 0x7000: this.v[x] = (this.v[x] + nn) & 0xFF; break;
      case 0x8000:
        switch (n) {
          case 0x0: this.v[x] = this.v[y]; break;
          case 0x1: this.v[x] |= this.v[y]; break;
          case 0x2: this.v[x] &= this.v[y]; break;
          case 0x3: this.v[x] ^= this.v[y]; break;
          case 0x4: {
            const sum = this.v[x] + this.v[y];
            this.v[0xF] = sum > 255 ? 1 : 0;
            this.v[x] = sum & 0xFF;
            break;
          }
          case 0x5: {
            this.v[0xF] = this.v[x] >= this.v[y] ? 1 : 0;
            this.v[x] = (this.v[x] - this.v[y]) & 0xFF;
            break;
          }
          case 0x6: {
            this.v[0xF] = this.v[x] & 1;
            this.v[x] >>= 1;
            break;
          }
          case 0x7: {
            this.v[0xF] = this.v[y] >= this.v[x] ? 1 : 0;
            this.v[x] = (this.v[y] - this.v[x]) & 0xFF;
            break;
          }
          case 0xE: {
            this.v[0xF] = (this.v[x] >> 7) & 1;
            this.v[x] = (this.v[x] << 1) & 0xFF;
            break;
          }
        }
        break;
      case 0x9000: if (this.v[x] !== this.v[y]) this.pc += 2; break;
      case 0xA000: this.i = nnn; break;
      case 0xB000: this.pc = nnn + this.v[0]; break;
      case 0xC000: this.v[x] = Math.floor(Math.random() * 256) & nn; break;
      case 0xD000: {
        this.v[0xF] = 0;
        for (let row = 0; row < n; row++) {
          const sprite = this.memory[this.i + row];
          for (let col = 0; col < 8; col++) {
            if ((sprite & (0x80 >> col)) !== 0) {
              const px = (this.v[x] + col) % 64;
              const py = (this.v[y] + row) % 32;
              const idx = py * 64 + px;
              if (this.display[idx] === 1) this.v[0xF] = 1;
              this.display[idx] ^= 1;
            }
          }
        }
        break;
      }
      case 0xE000:
        if (nn === 0x9E) { if (this.keys[this.v[x]]) this.pc += 2; }
        else if (nn === 0xA1) { if (!this.keys[this.v[x]]) this.pc += 2; }
        break;
      case 0xF000:
        switch (nn) {
          case 0x07: this.v[x] = this.delayTimer; break;
          case 0x0A: this.waiting = true; this.waitReg = x; break;
          case 0x15: this.delayTimer = this.v[x]; break;
          case 0x18: this.soundTimer = this.v[x]; break;
          case 0x1E: this.i = (this.i + this.v[x]) & 0xFFF; break;
          case 0x29: this.i = this.v[x] * 5; break;
          case 0x33: {
            this.memory[this.i] = Math.floor(this.v[x] / 100);
            this.memory[this.i + 1] = Math.floor(this.v[x] / 10) % 10;
            this.memory[this.i + 2] = this.v[x] % 10;
            break;
          }
          case 0x55: for (let i = 0; i <= x; i++) this.memory[this.i + i] = this.v[i]; break;
          case 0x65: for (let i = 0; i <= x; i++) this.v[i] = this.memory[this.i + i]; break;
        }
        break;
    }
  }

  render(buffer: Uint8Array, width: number, height: number): void {
    const scaleX = Math.floor(width / 64);
    const scaleY = Math.floor(height / 32);

    // Clear to black
    buffer.fill(0);
    for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;

    // Draw display
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        if (this.display[y * 64 + x]) {
          for (let dy = 0; dy < scaleY; dy++) {
            for (let dx = 0; dx < scaleX; dx++) {
              const px = x * scaleX + dx;
              const py = y * scaleY + dy;
              if (px < width && py < height) {
                const idx = (py * width + px) * 4;
                buffer[idx] = 0;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 0;
              }
            }
          }
        }
      }
    }
  }
}
