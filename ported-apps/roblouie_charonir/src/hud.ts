import { coinAudio } from '@/sound-effects';

class Hud {
  timeRemaining = 0;
  score = 0;
  currentScoreBonus = 0;
  isScoreBonusActive = false;
  scoreBonusTimer = 0;
  private scoreBonusPer = 1;

  currentTimeBonus = 0;
  isTimeBonusActive = false;
  timeBonusTimer = 0;
  timeBonusRotator = 0;

  reset() {
    this.timeRemaining = 100;
    this.score = 0;
    this.currentScoreBonus = 0;
    this.isScoreBonusActive = false;
    this.scoreBonusTimer = 0;
    this.currentTimeBonus = 0;
    this.isTimeBonusActive = false;
  }

  setTimeBonus(timeBonus: number) {
    this.timeBonusTimer = 3;
    this.isTimeBonusActive = true;
    this.currentTimeBonus = timeBonus;
    this.timeRemaining += timeBonus;
    this.timeBonusRotator = Math.PI;
  }

  addToScoreBonus() {
    this.isScoreBonusActive = true;
    this.currentScoreBonus += this.scoreBonusPer;

    this.scoreBonusPer++;
    this.scoreBonusTimer = 1;
    const coinSound = coinAudio()
    coinSound.playbackRate.value = Math.min(0.8 + this.scoreBonusPer / 15, 1.5);
    coinSound.start();
  }

  draw() {
    this.timeRemaining -= 0.0166;

    if (this.isTimeBonusActive) {
      this.timeBonusTimer -= 0.0166;
      if (this.timeBonusTimer <= 0) {
        this.isTimeBonusActive = false;
      }
    }

    if (this.isScoreBonusActive) {
      this.scoreBonusTimer -= 0.0166;

      if (this.scoreBonusTimer <= 0) {
        this.score += this.currentScoreBonus;
        this.currentScoreBonus = 0;
        this.isScoreBonusActive = false;
        this.scoreBonusPer = 1;
      }
    }
  }
}

export const hud = new Hud();
