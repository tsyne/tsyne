/**
 * Arcade Store - Jest Unit Tests
 */

import { ArcadeStore, GAMES } from './arcade';

describe('ArcadeStore', () => {
  let store: ArcadeStore;

  beforeEach(() => {
    store = new ArcadeStore();
  });

  afterEach(() => {
    store.backToLauncher();
  });

  it('should start at launcher', () => {
    expect(store.currentGame).toBe('launcher');
  });

  it('should launch fps-voxel game', () => {
    store.launchGame('fps-voxel');
    expect(store.currentGame).toBe('fps-voxel');
    expect(store.fpsVoxel).not.toBeNull();
  });

  it('should launch pacman game', () => {
    store.launchGame('pacman');
    expect(store.currentGame).toBe('pacman');
    expect(store.pacman).not.toBeNull();
  });

  it('should launch chip8 game', () => {
    store.launchGame('chip8');
    expect(store.currentGame).toBe('chip8');
    expect(store.chip8).not.toBeNull();
  });

  it('should return to launcher', () => {
    store.launchGame('pacman');
    store.backToLauncher();
    expect(store.currentGame).toBe('launcher');
    expect(store.pacman).toBeNull();
  });

  it('should notify listeners on change', () => {
    let notified = false;
    store.subscribe(() => {
      notified = true;
    });
    store.launchGame('chip8');
    expect(notified).toBe(true);
  });

  it('should unsubscribe listeners', () => {
    let count = 0;
    const unsub = store.subscribe(() => {
      count++;
    });
    store.launchGame('chip8');
    expect(count).toBe(1);

    unsub();
    store.launchGame('pacman');
    expect(count).toBe(1);
  });

  it('should stop previous game when switching', () => {
    store.launchGame('fps-voxel');
    const fpsGame = store.fpsVoxel;
    store.launchGame('pacman');
    expect(fpsGame?.running).toBe(false);
  });
});

describe('GAMES constant', () => {
  it('should have 3 games', () => {
    expect(GAMES.length).toBe(3);
  });

  it('should have required properties', () => {
    for (const game of GAMES) {
      expect(game.id).toBeDefined();
      expect(game.name).toBeDefined();
      expect(game.description).toBeDefined();
      expect(game.icon).toBeDefined();
      expect(game.color).toBeDefined();
    }
  });

  it('should include fps-voxel', () => {
    const fps = GAMES.find(g => g.id === 'fps-voxel');
    expect(fps).toBeDefined();
    expect(fps?.name).toBe('FPS Voxel');
  });

  it('should include pacman', () => {
    const pacman = GAMES.find(g => g.id === 'pacman');
    expect(pacman).toBeDefined();
    expect(pacman?.name).toBe('Pacman');
  });

  it('should include chip8', () => {
    const chip8 = GAMES.find(g => g.id === 'chip8');
    expect(chip8).toBeDefined();
    expect(chip8?.name).toBe('Chip-8');
  });
});
