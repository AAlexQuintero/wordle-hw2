import { WORDS } from "./words.js";

const NUMBER_OF_GUESSES = 6;
const STATS_KEY = "wordle-player-statistics";
let guessesRemaining = NUMBER_OF_GUESSES;
let currentGuess = [];
let nextLetter = 0;
let rightGuessString = "";
let hintUsed = false;
let gameOver = false;
let isRevealing = false;
let revealTimers = [];
const board = document.getElementById("game-board");
const status = document.getElementById("game-status");
const hintButton = document.getElementById("hint-button");
const keys = [...document.querySelectorAll(".keyboard-button")];
const stats = loadStats();

if (window.toastr) {
  toastr.options = { positionClass: "toast-top-center", timeOut: 3000, preventDuplicates: true };
}

function notify(message, type = "info") {
  status.textContent = message;
  if (window.toastr) toastr[type](message);
}

function loadStats() {
  const empty = { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (!saved || !Object.keys(empty).every(key => Number.isSafeInteger(saved[key]) && saved[key] >= 0)) return empty;
    if (saved.gamesPlayed !== saved.wins + saved.losses || saved.currentStreak > saved.bestStreak || saved.bestStreak > saved.wins) return empty;
    return { ...empty, ...saved };
  } catch {
    return empty;
  }
}

function renderStats() {
  const values = {
    "games-played": stats.gamesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    "win-rate": `${stats.gamesPlayed ? Math.round(stats.wins / stats.gamesPlayed * 100) : 0}%`,
    "current-streak": stats.currentStreak,
    "best-streak": stats.bestStreak
  };
  for (const [id, value] of Object.entries(values)) document.getElementById(id).textContent = value;
}

function initBoard() {
  board.replaceChildren();
  for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
    const row = document.createElement("div");
    row.className = "letter-row";
    for (let j = 0; j < 5; j++) {
      const box = document.createElement("div");
      box.className = "letter-box";
      box.setAttribute("aria-label", `Guess ${i + 1}, letter ${j + 1}: empty`);
      row.appendChild(box);
    }
    board.appendChild(row);
  }
}

function newGame() {
  revealTimers.forEach(clearTimeout);
  revealTimers = [];
  // Pick a different answer without repeating the previous game's word.
  const choices = WORDS.filter(word => word !== rightGuessString);
  rightGuessString = choices[Math.floor(Math.random() * choices.length)];
  guessesRemaining = NUMBER_OF_GUESSES;
  currentGuess = [];
  nextLetter = 0;
  hintUsed = false;
  gameOver = false;
  isRevealing = false;
  hintButton.classList.remove("hint-used");
  document.getElementById("hint-count").textContent = "1 left";
  keys.forEach(key => {
    delete key.dataset.state;
    key.setAttribute("aria-label", key.textContent === "Del" ? "Delete" : key.textContent);
  });
  if (window.toastr) toastr.clear();
  status.textContent = "Guess a five-letter word to get started.";
  initBoard();
}

function giveHint() {
  if (hintUsed) return notify("You've already used your hint for this game.");
  if (gameOver) return notify("Start a new game to use a hint.");
  // Prefer a position the player has not already found.
  const positions = [0, 1, 2, 3, 4].filter(index =>
    ![...board.children].some(row => row.children[index].dataset.state === "green")
  );
  const index = positions.length ? positions[Math.floor(Math.random() * positions.length)] : 0;
  hintUsed = true;
  hintButton.classList.add("hint-used");
  document.getElementById("hint-count").textContent = "Used";
  notify(`Hint: The ${["1st", "2nd", "3rd", "4th", "5th"][index]} letter is ${rightGuessString[index].toUpperCase()}.`);
}

function shadeKeyBoard(letter, color) {
  const key = keys.find(key => key.textContent === letter);
  const rank = { gray: 1, yellow: 2, green: 3 };
  if (rank[color] > (rank[key.dataset.state] || 0)) {
    key.dataset.state = color;
    key.setAttribute("aria-label", `${letter}: ${stateLabel(color)}`);
  }
}

function stateLabel(color) {
  return { green: "correct position", yellow: "wrong position", gray: "not in word" }[color];
}

function deleteLetter() {
  if (nextLetter === 0) return;
  const box = board.children[NUMBER_OF_GUESSES - guessesRemaining].children[nextLetter - 1];
  box.textContent = "";
  box.className = "letter-box";
  box.setAttribute("aria-label", "Empty letter");
  currentGuess.pop();
  nextLetter--;
}

function endGame(won) {
  if (gameOver) return;
  gameOver = true;
  stats.gamesPlayed++;
  if (won) {
    stats.wins++;
    stats.currentStreak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    notify("You got it! Play again with New Game.", "success");
  } else {
    stats.losses++;
    stats.currentStreak = 0;
    notify(`Out of guesses! The word was ${rightGuessString.toUpperCase()}. Play again with New Game.`, "error");
  }
  renderStats();
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    notify("Your result is counted, but this browser couldn't save statistics.");
  }
}

function checkGuess() {
  const guessString = currentGuess.join("");
  if (guessString.length !== 5) return notify("Not enough letters! Enter a five-letter word.", "error");
  if (!WORDS.includes(guessString)) return notify("Word not in list! Try another word.", "error");

  const row = board.children[NUMBER_OF_GUESSES - guessesRemaining];
  const rightGuess = Array.from(rightGuessString);
  const letterColor = Array(5).fill("gray");
  // Reserve exact matches before assigning remaining copies of each letter.
  for (let i = 0; i < 5; i++) {
    if (rightGuess[i] === currentGuess[i]) {
      letterColor[i] = "green";
      rightGuess[i] = null;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (letterColor[i] === "green") continue;
    const match = rightGuess.indexOf(currentGuess[i]);
    if (match !== -1) {
      letterColor[i] = "yellow";
      rightGuess[match] = null;
    }
  }

  isRevealing = true;
  for (let i = 0; i < 5; i++) {
    revealTimers.push(setTimeout(() => {
      const box = row.children[i];
      animateCSS(box, "flipInX");
      box.dataset.state = letterColor[i];
      box.setAttribute("aria-label", `${guessString[i]}: ${stateLabel(letterColor[i])}`);
      shadeKeyBoard(guessString[i], letterColor[i]);
    }, 250 * i));
  }
  guessesRemaining--;
  currentGuess = [];
  nextLetter = 0;
  // Record the result at submission so a reset during the reveal cannot lose it.
  if (guessString === rightGuessString || guessesRemaining === 0) {
    endGame(guessString === rightGuessString);
  } else {
    status.textContent = `${guessesRemaining} guesses remaining. You've got this.`;
  }
  revealTimers.push(setTimeout(() => {
    isRevealing = false;
    revealTimers = [];
  }, 1350));
}

function insertLetter(letter) {
  if (nextLetter === 5) return;
  const box = board.children[NUMBER_OF_GUESSES - guessesRemaining].children[nextLetter];
  box.textContent = letter;
  box.classList.add("filled-box");
  box.setAttribute("aria-label", letter);
  animateCSS(box, "pulse");
  currentGuess.push(letter);
  nextLetter++;
}

function animateCSS(element, animation) {
  element.classList.remove("animate__pulse", "animate__flipInX");
  element.style.setProperty("--animate-duration", "0.3s");
  element.classList.add("animate__animated", `animate__${animation}`);
  element.addEventListener("animationend", () => {
    element.classList.remove("animate__animated", `animate__${animation}`);
  }, { once: true });
}

function handleKey(key) {
  if (gameOver || isRevealing) return;
  if (key === "Backspace" || key === "Delete" || key === "Del") deleteLetter();
  else if (key === "Enter") checkGuess();
  else if (/^[a-z]$/i.test(key)) insertLetter(key.toLowerCase());
}

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  // Preserve native Enter/Space activation when a button has keyboard focus.
  if ((event.key === "Enter" || event.key === " ") && event.target.closest("button")) return;
  if (/^[a-z]$/i.test(event.key) || ["Enter", "Backspace", "Delete"].includes(event.key)) {
    event.preventDefault();
    if (!event.repeat) handleKey(event.key);
  }
});

document.getElementById("keyboard-cont").addEventListener("click", event => {
  const target = event.target.closest(".keyboard-button");
  if (target) handleKey(target.textContent);
});
// Pointer clicks should not leave a button consuming the next physical Enter.
document.querySelectorAll("button").forEach(button => {
  button.addEventListener("click", event => { if (event.detail > 0) button.blur(); });
});
hintButton.addEventListener("click", giveHint);
document.getElementById("new-game-button").addEventListener("click", newGame);
renderStats();
newGame();
