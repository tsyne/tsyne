import { State } from '@/engine/state-machine/state';

// Game state holders — populated by main.ts after GL initialization
export const gameStates = {
  gameState: {} as State,
  menuState: {} as State,
  levelOverState: {} as State,
};
