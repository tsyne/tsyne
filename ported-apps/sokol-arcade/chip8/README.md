# Chip-8 Emulator

A Chip-8 interpreter supporting the full instruction set. Ported from floooh/chipz.

## Original Project

- **Repository**: https://github.com/floooh/chipz
- **Author**: Andre Weissflog (floooh)
- **Language**: Zig

## Features

```
+----------------------------------+
|          CHIP-8 DISPLAY          |
|          64 x 32 pixels          |
|                                  |
|    ████  ████                    |
|    █  █  █  █    (bouncing       |
|    █  █  █  █     ball demo)     |
|    ████  ████                    |
|                                  |
+----------------------------------+
```

### Implemented

- Full 35-opcode instruction set
- 16 8-bit registers (V0-VF)
- 4KB memory with font at 0x000
- 64×32 monochrome display
- 16-key hexadecimal keypad
- Delay and sound timers
- Stack for subroutine calls

### Opcodes

| Opcode | Mnemonic | Description |
|--------|----------|-------------|
| 00E0 | CLS | Clear display |
| 00EE | RET | Return from subroutine |
| 1NNN | JP addr | Jump to address |
| 2NNN | CALL addr | Call subroutine |
| 3XNN | SE Vx, byte | Skip if Vx == NN |
| 4XNN | SNE Vx, byte | Skip if Vx != NN |
| 5XY0 | SE Vx, Vy | Skip if Vx == Vy |
| 6XNN | LD Vx, byte | Vx = NN |
| 7XNN | ADD Vx, byte | Vx += NN |
| 8XY0-E | ALU ops | Arithmetic/logic |
| 9XY0 | SNE Vx, Vy | Skip if Vx != Vy |
| ANNN | LD I, addr | I = NNN |
| BNNN | JP V0, addr | Jump to NNN + V0 |
| CXNN | RND Vx, byte | Vx = random & NN |
| DXYN | DRW Vx, Vy, n | Draw sprite |
| EX9E | SKP Vx | Skip if key pressed |
| EXA1 | SKNP Vx | Skip if key not pressed |
| FX07-65 | Timer/mem ops | Timer and memory |

## Keyboard Mapping

```
Chip-8 Keypad    ->    Keyboard
+-+-+-+-+              +-+-+-+-+
|1|2|3|C|              |1|2|3|4|
+-+-+-+-+              +-+-+-+-+
|4|5|6|D|              |Q|W|E|R|
+-+-+-+-+              +-+-+-+-+
|7|8|9|E|              |A|S|D|F|
+-+-+-+-+              +-+-+-+-+
|A|0|B|F|              |Z|X|C|V|
+-+-+-+-+              +-+-+-+-+
```

## Testing

```bash
pnpm test ported-apps/sokol-arcade/chip8/index.test.ts
```

## Credits

- **Original Author**: Andre Weissflog (floooh)
- **Original Repository**: https://github.com/floooh/chipz
- **Tsyne Port**: Paul Hammant

## License

MIT License. See parent LICENSE file.
