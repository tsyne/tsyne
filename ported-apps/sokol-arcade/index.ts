/**
 * Sokol Arcade - Multi-Game Launcher
 *
 * A unified arcade launcher featuring ports of Sokol-based games:
 * - FPS Voxel: Simple voxel FPS (from lizard-demon/fps)
 * - Pacman: Classic maze chase game (from floooh/pacman.zig)
 * - Chip-8: Classic 8-bit emulator (from floooh/chipz)
 *
 * @tsyne-app:name Sokol Arcade
 * @tsyne-app:icon mediaPlay
 * @tsyne-app:category Games
 * @tsyne-app:args (a: App) => void
 *
 * Original projects:
 * - https://github.com/lizard-demon/fps
 * - https://github.com/floooh/pacman.zig
 * - https://github.com/floooh/chipz
 *
 * Portions copyright floooh, Spyware (lizard-demon), and Paul Hammant 2025
 */

// FPS Voxel game
export { VoxelWorld, VoxelPlayer, FPSVoxelGame } from './fps-voxel';

// Pacman game
export { PacmanGame, Direction, GhostState } from './pacman';
export type { Entity } from './pacman';

// Chip-8 emulator
export { Chip8 } from './chip8';

// Arcade store and launcher
export { ArcadeStore, GAMES, buildSokolArcadeApp } from './arcade';
export type { GameType, GameInfo } from './arcade';

// Default export
export { buildSokolArcadeApp as default } from './arcade';
