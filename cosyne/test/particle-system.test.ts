import { Particle, Emitter, ParticleSystem } from '../src/particle-system';

describe('Particle', () => {
  it('should initialize with position', () => {
    const p = new Particle(100, 200);
    expect(p.position.x).toBe(100);
    expect(p.position.y).toBe(200);
  });

  it('should have default properties', () => {
    const p = new Particle(0, 0);
    expect(p.velocity.x).toBe(0);
    expect(p.velocity.y).toBe(0);
    expect(p.acceleration.x).toBe(0);
    expect(p.acceleration.y).toBe(0);
    expect(p.radius).toBe(3);
    expect(p.life).toBe(1000);
  });

  it('should accept options', () => {
    const p = new Particle(0, 0, {
      velocity: { x: 10, y: 20 },
      radius: 5,
      color: '#ff0000',
      life: 2000,
    });
    expect(p.velocity.x).toBe(10);
    expect(p.velocity.y).toBe(20);
    expect(p.radius).toBe(5);
    expect(p.color).toBe('#ff0000');
    expect(p.maxLife).toBe(2000);
  });

  it('should be alive initially', () => {
    const p = new Particle(0, 0, { life: 1000 });
    expect(p.isAlive()).toBe(true);
  });

  it('should die after lifetime', () => {
    const p = new Particle(0, 0, { life: 100 });
    p.update(200);  // 200ms > 100ms lifetime
    expect(p.isAlive()).toBe(false);
  });

  it('should update position with velocity', () => {
    const p = new Particle(0, 0, { velocity: { x: 100, y: 100 } });
    p.update(10);  // 10ms = 0.01s
    expect(p.position.x).toBeCloseTo(1, 0);
    expect(p.position.y).toBeCloseTo(1, 0);
  });

  it('should apply acceleration', () => {
    const p = new Particle(0, 0, { acceleration: { x: 10, y: 20 } });
    p.update(100);  // 0.1s
    expect(p.velocity.x).toBeCloseTo(1, 0);
    expect(p.velocity.y).toBeCloseTo(2, 0);
  });

  it('should apply friction', () => {
    const p = new Particle(0, 0, {
      velocity: { x: 100, y: 100 },
      friction: 0.5,
    });
    p.update(16);  // One frame at 60fps
    expect(p.velocity.x).toBeCloseTo(50, 0);
    expect(p.velocity.y).toBeCloseTo(50, 0);
  });

  it('should calculate alpha based on life', () => {
    const p = new Particle(0, 0, { life: 1000, alpha: 1 });
    expect(p.getAlpha()).toBe(1);
    p.update(500);  // Half life
    expect(p.getAlpha()).toBeCloseTo(0.5, 1);
    p.update(500);  // Dead
    expect(p.getAlpha()).toBeLessThan(0.01);
  });
});

describe('Emitter', () => {
  it('should initialize', () => {
    const e = new Emitter(100, 200);
    expect(e.position.x).toBe(100);
    expect(e.position.y).toBe(200);
    expect(e.active).toBe(true);
  });

  it('should accept options', () => {
    const e = new Emitter(0, 0, {
      rate: 50,
      life: 2000,
      radius: 5,
      color: '#ff0000',
    });
    expect(e.rate).toBe(50);
    expect(e.particleLife).toBe(2000);
    expect(e.particleRadius).toBe(5);
    expect(e.particleColor).toBe('#ff0000');
  });

  it('should emit particles', () => {
    const e = new Emitter(0, 0, { rate: 100 });
    e.update(50);  // 5 particles at 100/sec
    expect(e.particles.length).toBeGreaterThan(0);
  });

  it('should respect rate', () => {
    const e = new Emitter(0, 0, { rate: 10 });
    e.update(1000);  // Should emit ~10 particles
    const count = e.particles.length;
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThan(15);
  });

  it('should update particle positions', () => {
    const e = new Emitter(100, 100, {
      rate: 10,
      velocity: { x: 50, y: 0 },
    });
    e.update(100);
    for (const p of e.particles) {
      expect(p.position.x).toBeGreaterThan(100);
    }
  });

  it('should remove dead particles', () => {
    const e = new Emitter(0, 0, {
      rate: 100,
      life: 100,
    });
    e.update(500);
    expect(e.particles.length).toBe(0);
  });

  it('should set position', () => {
    const e = new Emitter(0, 0);
    e.setPosition(200, 300);
    expect(e.position.x).toBe(200);
    expect(e.position.y).toBe(300);
  });

  it('should set rate', () => {
    const e = new Emitter(0, 0, { rate: 10 });
    e.setRate(50);
    expect(e.rate).toBe(50);
  });

  it('should get particle count', () => {
    const e = new Emitter(0, 0, { rate: 100 });
    e.update(50);
    const count = e.getParticleCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should spread particles', () => {
    const e = new Emitter(0, 0, {
      rate: 100,
      spreadAngle: 90,
      velocity: { x: 100, y: 0 },
    });
    e.update(50);
    const angles = e.particles.map((p) => Math.atan2(p.velocity.y, p.velocity.x));
    const hasVariation = angles.some((a) => Math.abs(a - angles[0]) > 0.1);
    expect(hasVariation).toBe(true);
  });

  it('should vary speed', () => {
    const e = new Emitter(0, 0, {
      rate: 100,
      speedVariation: 0.5,
      velocity: { x: 100, y: 0 },
    });
    e.update(50);
    const speeds = e.particles.map((p) =>
      Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2)
    );
    const hasVariation = speeds.some((s) => Math.abs(s - speeds[0]) > 1);
    expect(hasVariation).toBe(true);
  });
});

describe('ParticleSystem', () => {
  it('should initialize', () => {
    const ps = new ParticleSystem();
    expect(ps.getTotalParticleCount()).toBe(0);
  });

  it('should add emitter', () => {
    const ps = new ParticleSystem();
    const e = new Emitter(0, 0);
    ps.addEmitter(e);
    expect(ps.getTotalParticleCount()).toBeLessThanOrEqual(0);
  });

  it('should start and stop', (done) => {
    const ps = new ParticleSystem();
    const e = new Emitter(0, 0, { rate: 100 });
    ps.addEmitter(e);
    ps.start();

    setTimeout(() => {
      ps.stop();
      expect(ps.getTotalParticleCount()).toBeGreaterThan(0);
      done();
    }, 100);
  });

  it('should set gravity', () => {
    const ps = new ParticleSystem();
    ps.setGravity(0, 9.8);
    const e = new Emitter(0, 0, { rate: 100 });
    ps.addEmitter(e);
    ps.start();

    setTimeout(() => {
      ps.stop();
      // Particles should fall downward due to gravity
      const avgY = e.particles.reduce((sum, p) => sum + p.position.y, 0) / e.particles.length;
      expect(avgY).toBeGreaterThan(0);
    }, 50);
  });

  it('should remove emitter', () => {
    const ps = new ParticleSystem();
    const e = new Emitter(0, 0);
    ps.addEmitter(e);
    ps.removeEmitter(e);
    expect(ps.getTotalParticleCount()).toBe(0);
  });

  it('should support listeners', (done) => {
    const ps = new ParticleSystem();
    const e = new Emitter(0, 0, { rate: 100 });
    ps.addEmitter(e);

    let called = false;
    ps.subscribe(() => {
      called = true;
    });

    ps.start();
    setTimeout(() => {
      ps.stop();
      expect(called).toBe(true);
      done();
    }, 50);
  });

  it('should clear', () => {
    const ps = new ParticleSystem();
    const e = new Emitter(0, 0, { rate: 100 });
    ps.addEmitter(e);
    ps.clear();
    expect(ps.getTotalParticleCount()).toBe(0);
  });

  it('should get total particle count', (done) => {
    const ps = new ParticleSystem();
    const e1 = new Emitter(0, 0, { rate: 50 });
    const e2 = new Emitter(100, 100, { rate: 50 });
    ps.addEmitter(e1);
    ps.addEmitter(e2);
    ps.start();

    setTimeout(() => {
      ps.stop();
      const total = ps.getTotalParticleCount();
      expect(total).toBeGreaterThan(0);
      done();
    }, 50);
  });
});
