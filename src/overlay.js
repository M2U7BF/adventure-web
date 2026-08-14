// Thin wrapper around the title/loading/game-over overlay DOM elements.
export class Overlay {
  constructor({ root, title, text, button, difficultyPanel }) {
    this.root = root;
    this.title = title;
    this.text = text;
    this.button = button;
    this.difficultyPanel = difficultyPanel;
  }

  show(title, text, showButton = false) {
    this.title.textContent = title;
    this.text.textContent = text;
    this.button.hidden = !showButton;
    if (this.difficultyPanel) this.difficultyPanel.hidden = true;
    this.root.style.display = "flex";
  }

  showDifficultySelect(title, text) {
    this.title.textContent = title;
    this.text.textContent = text;
    this.button.hidden = true;
    if (this.difficultyPanel) this.difficultyPanel.hidden = false;
    this.root.style.display = "flex";
  }

  hide() {
    this.root.style.display = "none";
  }

  showFinished() {
    this.root.classList.add("finished");
    this.title.textContent = "";
    this.text.textContent = "";
    this.button.hidden = false;
    this.button.textContent = "もう一度遊ぶ";
    if (this.difficultyPanel) this.difficultyPanel.hidden = true;
    this.root.style.display = "flex";
  }

  showGameOver() {
    this.root.classList.remove("finished");
    this.title.textContent = "GAME OVER";
    this.text.textContent = "敵にやられてしまった…";
    this.button.hidden = false;
    this.button.textContent = "もう一度挑戦する";
    if (this.difficultyPanel) this.difficultyPanel.hidden = true;
    this.root.style.display = "flex";
  }

  get isStartVisible() {
    return !this.button.hidden;
  }
}
