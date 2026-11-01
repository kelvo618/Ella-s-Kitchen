# Master Chef 3D

A 3D cooking game built with Three.js (r128, loaded from cdnjs). No build step, no backend.

## Play
Open `index.html` in Chrome (needs internet once for the Three.js CDN), or use GitHub Pages.

## Deploy on GitHub Pages
1. Create a repository and upload `index.html`, `style.css`, `game.js`, `README.md`.
2. Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
3. Open https://kelvo618.github.io/Ella-s-Kitchen/

## Controls
- Desktop: WASD move, mouse look (click the game first), E or left click to act, Esc pause.
- Phone: left stick moves, drag the right side to look, ACT button to cook.

## Modes
- Free cooking: pick any unlocked recipe, no timer.
- Career: random unlocked recipes; earn money and XP, new recipes unlock at levels 2 and 3. Progress is saved in the browser.
- Challenge: 60 seconds, cook as many orders as you can.

## Recipes
Fried plantain, Jollof rice, Burger. Add more in the `REC` table in `game.js`.
