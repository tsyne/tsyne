/**
 * Chip-8 Emulator - Jest Unit Tests
 */

import { Chip8 } from './index';

describe('Chip8', () => {
  let chip8: Chip8;

  beforeEach(() => {
    chip8 = new Chip8();
  });

  afterEach(() => {
    chip8.stop();
  });

  it('should initialize with font loaded', () => {
    // Font for '0' should be at address 0
    expect(chip8.memory[0]).toBe(0xF0);
  });

  it('should start PC at 0x200', () => {
    expect(chip8.pc).toBe(0x200);
  });

  it('should have 16 registers', () => {
    expect(chip8.v.length).toBe(16);
  });

  it('should have 64x32 display', () => {
    expect(chip8.display.length).toBe(64 * 32);
  });

  it('should start and stop emulation', () => {
    chip8.start();
    expect(chip8.running).toBe(true);
    chip8.stop();
    expect(chip8.running).toBe(false);
  });

  it('should reset state', () => {
    chip8.v[0] = 42;
    chip8.pc = 0x300;
    chip8.reset();
    expect(chip8.v[0]).toBe(0);
    expect(chip8.pc).toBe(0x200);
  });

  it('should handle key input', () => {
    chip8.setKey(5, true);
    expect(chip8.keys[5]).toBe(1);
    chip8.setKey(5, false);
    expect(chip8.keys[5]).toBe(0);
  });

  describe('opcodes', () => {
    it('should execute CLS (00E0)', () => {
      chip8.display[100] = 1;
      chip8.memory[0x200] = 0x00;
      chip8.memory[0x201] = 0xE0;
      chip8.step();
      expect(chip8.display[100]).toBe(0);
    });

    it('should execute JP (1NNN)', () => {
      chip8.memory[0x200] = 0x12;
      chip8.memory[0x201] = 0x50;
      chip8.step();
      expect(chip8.pc).toBe(0x250);
    });

    it('should execute LD Vx, byte (6XNN)', () => {
      chip8.memory[0x200] = 0x65;
      chip8.memory[0x201] = 0x42;
      chip8.step();
      expect(chip8.v[5]).toBe(0x42);
    });

    it('should execute ADD Vx, byte (7XNN)', () => {
      chip8.v[3] = 10;
      chip8.memory[0x200] = 0x73;
      chip8.memory[0x201] = 0x05;
      chip8.step();
      expect(chip8.v[3]).toBe(15);
    });

    it('should execute LD I, addr (ANNN)', () => {
      chip8.memory[0x200] = 0xA1;
      chip8.memory[0x201] = 0x23;
      chip8.step();
      expect(chip8.i).toBe(0x123);
    });

    it('should execute SE Vx, byte (3XNN)', () => {
      chip8.v[2] = 0x55;
      chip8.memory[0x200] = 0x32;
      chip8.memory[0x201] = 0x55;
      chip8.step();
      expect(chip8.pc).toBe(0x204); // Skipped
    });

    it('should execute SNE Vx, byte (4XNN)', () => {
      chip8.v[2] = 0x55;
      chip8.memory[0x200] = 0x42;
      chip8.memory[0x201] = 0x66;
      chip8.step();
      expect(chip8.pc).toBe(0x204); // Skipped
    });
  });

  it('should render to buffer', () => {
    chip8.display[0] = 1;
    chip8.display[64] = 1;
    const buffer = new Uint8Array(128 * 64 * 4);
    chip8.render(buffer, 128, 64);
    // Check green pixels exist
    let hasGreen = false;
    for (let i = 0; i < buffer.length; i += 4) {
      if (buffer[i + 1] === 255 && buffer[i] === 0) {
        hasGreen = true;
        break;
      }
    }
    expect(hasGreen).toBe(true);
  });
});
