const $ = (id) => document.getElementById(id);
const BEST_KEY = 'pixelRoadRacer.best';

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'),
      score: $('score'),
      best: $('best'),
      speed: $('speed'),
      time: $('time'),
      level: $('level'),
      title: $('title'),
      titleBest: $('title-best'),
      pause: $('pause'),
      gameover: $('gameover'),
      newBest: $('new-best'),
      finalScore: $('final-score'),
      finalTime: $('final-time'),
      finalBest: $('final-best'),
    };
    this.best = Number(localStorage.getItem(BEST_KEY)) || 0;
    this.el.titleBest.textContent = this.best;
  }

  /** Saves and returns true if `score` beats the stored best. */
  submitScore(score) {
    if (score > this.best) {
      this.best = score;
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        // storage may be unavailable (private mode); keep in-memory best
      }
      return true;
    }
    return false;
  }

  show(screen) {
    const { hud, title, pause, gameover } = this.el;
    title.classList.toggle('hidden', screen !== 'title');
    pause.classList.toggle('hidden', screen !== 'paused');
    gameover.classList.toggle('hidden', screen !== 'gameover');
    hud.classList.toggle('hidden', screen === 'title');
    if (screen === 'title') this.el.titleBest.textContent = this.best;
  }

  updateHUD({ score, speed, time, level }) {
    this.el.score.textContent = score;
    this.el.best.textContent = Math.max(this.best, score);
    this.el.speed.textContent = `${Math.round(speed * 6)} KM/H`;
    this.el.time.textContent = `${time.toFixed(1)}s`;
    this.el.level.textContent = `LV ${level}`;
  }

  showGameOver(score, time, isNewBest) {
    this.el.finalScore.textContent = score;
    this.el.finalTime.textContent = `${time.toFixed(1)}s`;
    this.el.finalBest.textContent = this.best;
    this.el.newBest.classList.toggle('hidden', !isNewBest);
    this.show('gameover');
  }
}
