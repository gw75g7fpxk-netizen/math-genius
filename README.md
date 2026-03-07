# Math Genius 🧮

A mobile-friendly JavaScript game to help children practise multiplication and division facts through story-driven adventures with a cast of colourful characters.

## Features

- **Story mode** – Play through narrative chapters with characters like Kiki the Mad Scientist, Humphrey the Heffalump, Fluffy, Roo, and many more
- **Multiple user profiles** – Each player has their own saved progress and settings, stored locally in the browser
- **Chapter unlocking** – Complete a chapter with 80 % or higher to unlock the next one
- **Two story themes** – *Friends* (Theme 1) and *The Neighbourhood* (Theme 2), each with chapters for every character
- **Three game modes** – Multiplication only, Division only, or a mix of both
- **20 questions per round** with multiple-choice answers (4 options)
- **Countdown timer** per question – faster answers earn more points (timer duration adjustable in Settings)
- **Streak bonus** display to encourage consecutive correct answers
- **Animated feedback** – colour-coded buttons and a toast notification after each answer
- **Results screen** – star rating, total score, correct answers, average answer time, and a full question log
- **Per-user settings** – configure timer duration (5–30 s), number range (0–2 through 0–12), and whether division is enabled
- **Mobile-first design** – large touch targets, responsive layout, works in any modern browser with no installation required

## How to Play

1. Open `index.html` in a browser (no server required – works as a local file)
2. Select your player profile (or add a new one)
3. Choose a story chapter and pick a character to play as
4. Tap the correct answer before the timer runs out
5. After 20 questions, review your score – pass 80 % to unlock the next chapter!

## Files

| File | Description |
|---|---|
| `index.html` | App markup – Login, Chapter Select, Character Select, Story Map, Game, Results, and Settings screens |
| `style.css` | Mobile-first stylesheet |
| `game.js` | All app logic – user profiles, story chapters, question generation, timer, scoring, and settings |
| `CHARACTERS.md` | Character profiles for all playable characters and neighbourhood friends |
| `LOCATIONS.md` | Descriptions of the story world locations |
| `VILLAINS.md` | Profiles of the recurring villains |
