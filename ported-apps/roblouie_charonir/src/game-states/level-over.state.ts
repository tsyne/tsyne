import { State } from '@/engine/state-machine/state';
import { gameStateMachine } from '@/game-states/game-state-machine';
import { gameStates } from '@/index';
import { getRankFromScore } from '@/engine/helpers';

export class LevelOverState implements State {
  spiritsTransported = 0;
  payment = 0;
  score = 0;
  rank = 'F';

  onEnter(spiritsTransported: number, payment: number, levelNumber: number) {
    this.spiritsTransported = spiritsTransported;
    this.payment = payment;
    this.score = this.payment * this.spiritsTransported;
    this.rank = getRankFromScore(this.score);
    const pastScore = localStorage.getItem(`ddamt_score-${levelNumber}`);
    if (!pastScore || this.score > parseInt(pastScore)) {
      localStorage.setItem(`ddamt_score-${levelNumber}`, this.score.toString());
    }
    console.log(`[Charon Jr.] Level Over — Spirits: ${this.spiritsTransported}, Payment: ${this.payment}, Score: ${this.score}, Rank: ${this.rank}`);
    setTimeout(() => {
      gameStateMachine.setState(gameStates.menuState);
    }, 4000);
  }

  onUpdate() {
    // No-op (HUD info shown via window title in main.ts)
  }

  onLeave() {
  }
}
