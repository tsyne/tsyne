# Particle System Advanced Demo

**Interactive P5.js-style particle physics simulation**

Demonstrates the particle system with multiple emitter types (fountain, fireworks, smoke, explosion) and real-time physics.

## Features

- 4 emitter presets with different physics
- Real-time particle count display
- Configurable gravity and friction
- Interactive particle generation
- Event-driven animation system

## Emitter Types

### Fountain
```
      ╱╲╱╲╱╲
     ╱  ●  ╲  < Upward velocity
    │       │   Gravity pulls down
    │  ╱╲   │   Particles curve
    │ ●   ● │
    └───────┘
```

**Physics:**
- Initial velocity: Upward (-100 y)
- Acceleration: Downward (200 y = gravity)
- Friction: High (0.98 = low damping)
- Spread: 45° cone
- Lifetime: 2000ms

**Use for:** Water effects, sprinklers, fountains

### Fireworks
```
    ╱  ╲  ╱  ╲
   ●    ●    ●   < All directions
   │    │    │   Rapid expansion
   │    │    │   Gravity pulls down
    ╲  ╱  ╲  ╱
```

**Physics:**
- Initial velocity: Zero (explodes outward)
- Acceleration: Slight downward (100 y)
- Friction: Medium (0.95 = more damping)
- Spread: 360° (all directions)
- Lifetime: 1500ms

**Use for:** Explosions, bursts, sparkles

### Smoke
```
      ╱ ╲
     ╱   ╲       < Slow upward drift
    │  ●  │      Minimal gravity
    │     │      Fades out
    │  ●  │      High friction (0.99)
     ╲   ╱
```

**Physics:**
- Initial velocity: Upward (-50 y)
- Acceleration: None (zero = pure drift)
- Friction: Very high (0.99 = almost no velocity loss)
- Spread: 60° (slightly directional)
- Lifetime: 3000ms
- Alpha: 0.5 (semi-transparent)

**Use for:** Smoke, dust, fog effects

### Explosion
```
  ╱   ╲   ╱   ╲
 ●  ●  ●  ●  ●  < Rapid omnidirectional burst
 │ │ │ │ │ │ │  Fast spread
 │ │ │ │ │ │ │  Medium damping
  ╲   ╱   ╲   ╱
```

**Physics:**
- Initial velocity: Zero (burst from center)
- Acceleration: Moderate downward (50 y)
- Friction: Medium-low (0.92 = more speed loss)
- Spread: 360° + high speed variation (0.8)
- Lifetime: 1000ms

**Use for:** Bomb effects, impact particles, debris

## Physics Concepts

### Velocity
Direction and speed of particle movement.

```
velocity = {
  x: -50,  // Pixels per second, leftward
  y: 100   // Pixels per second, downward
}
```

### Acceleration
Change in velocity over time (forces).

```
acceleration = {
  x: 0,    // No horizontal acceleration
  y: 200   // Gravity: 200 pixels/sec²
}
```

### Friction (Damping)
Reduces velocity each frame to simulate air resistance.

```
friction = 0.98  // Multiply velocity by 0.98 each frame
           // 0.98^60 ≈ 0.3 after 1 second at 60fps

// Higher friction (0.99) = longer coasting
// Lower friction (0.90) = faster slowdown
```

### Lifetime & Alpha
Particles fade out over lifetime.

```
alpha(t) = initialAlpha × (remainingLife / maxLife)
```

## Usage

Run the demo:

```bash
npx tsx phone-apps/particles-advanced-demo/particles-advanced-demo.ts
```

## Controls

| Control | Effect |
|---------|--------|
| Type buttons (Fountain, Fireworks, etc.) | Switch emitter type |
| "Start" / "Stop" button | Play/pause simulation |
| "Create at Center" button | Generate particles at canvas center |
| "Clear" button | Remove all particles and reset |
| Particle count display | Shows active particles (real-time) |

## Performance

| Metric | Typical | Max |
|--------|---------|-----|
| Particles | 500-1000 | 5000+ |
| FPS | 60 | 30 (at 5000 particles) |
| Memory | ~5MB | ~50MB |

## Files

- `particles-advanced-demo.ts` - Main application
- `README.md` - This file

## API Used

```typescript
import { ParticleSystem, Emitter } from 'cosyne';

// Create system with gravity
const ps = new ParticleSystem().setGravity(0, 9.8);

// Create emitter
const emitter = new Emitter(x, y, {
  rate: 50,                         // 50 particles/sec
  life: 2000,                       // 2 second lifetime
  velocity: { x: 0, y: -100 },     // Initial velocity
  acceleration: { x: 0, y: 200 },  // Gravity
  friction: 0.98,                  // Air resistance
  spreadAngle: 45,                 // Emission cone
  speedVariation: 0.3,             // +/- 30% speed
});

ps.addEmitter(emitter);
ps.start();

// Render
a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    ps.render(ctx);  // Draw all particles
  });
});

// Listen for updates
ps.subscribe(() => {
  refreshAllCosyneContexts();
});
```

## Advanced Customization

```typescript
// Custom emitter settings
new Emitter(250, 250, {
  rate: 100,                              // Emission rate
  life: 1500,                             // Lifetime ms
  radius: 3,                              // Particle size
  color: '#4ECDC4',                      // Particle color
  alpha: 1,                               // Initial alpha
  velocity: { x: 0, y: -150 },           // Launch velocity
  acceleration: { x: 0, y: 300 },        // Forces
  friction: 0.97,                        // Damping
  spreadAngle: 30,                       // Cone width (degrees)
  speedVariation: 0.2,                   // Speed randomness
})
```

## Test

```bash
TAKE_SCREENSHOTS=1 pnpm test -- phone-apps/particles-advanced-demo/__tests__/index.test.ts
```

## Physics Notes

**Gravity constant** (real world):
- 9.8 m/s² ≈ 980 pixels/s² at typical 100 DPI

**Friction examples:**
- 0.99 (very high): Slow falloff, long coasting
- 0.95 (medium): Noticeable damping
- 0.90 (low): Quick dissipation
- 0.98 (typical): Natural-looking air resistance

**Emission cone** (spreadAngle):
- 360 = omnidirectional
- 180 = hemisphere
- 45 = narrow cone
- 0 = single direction (no spread)

## See Also

- [D3/P5 Components Guide](../../cosyne/D3_P5_COMPONENTS.md)
- [Particle System Documentation](../../cosyne/D3_P5_COMPONENTS.md#particle-system)
- [Jest Tests](../../cosyne/test/particle-system.test.ts)
- [P5.js Particles](https://p5js.org/reference/#/p5.Renderer/particles) (inspiration)
