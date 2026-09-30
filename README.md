# Wordle Clone

A vanilla JavaScript Wordle game: five-letter words, six guesses, physical and on-screen keyboards, animated feedback, and Toastr notifications.

Added features:
- **New Game:** picks a different random word and resets the board, keyboard, and hint.
- **Hint:** reveals one letter and its position, once per game, without filling a tile.
- **Statistics:** tracks completed games, wins, losses, win rate, current streak, and best streak in localStorage. Starting over does not count an unfinished game.

## Run

```sh
npm install
npx live-server build
```

Or open `build/index.html` with the VS Code Live Server extension. Use an HTTP server because the game uses ES modules. The existing Toastr, jQuery, and Animate.css dependencies load from CDNs and require internet access. Statistics persist on the same browser and origin (including the same port).
