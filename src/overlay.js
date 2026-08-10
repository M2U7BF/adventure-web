// Thin wrapper around the title/loading/game-over overlay DOM elements.
export class Overlay {
  constructor({ root, title, text, button }) {
    this.root = root;
    this.title = title;
    this.text = text;
    this.button = button;
  }

  show(title, text, showButton = false) {
    this.title.textContent = title;
    this.text.textContent = text;
    this.button.hidden = !showButton;
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
    this.root.style.display = "flex";
  }

  get isStartVisible() {
    return !this.button.hidden;
  }
}
