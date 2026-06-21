# PokeApi Displayer V2

A second pass at my original `pokeapi-displayer` project, this time rebuilt with Vite + React. It fetches data from [PokeAPI](https://pokeapi.co/) and presents it in a cleaner, more informative layout.

## What's new in V2

- Rebuilt from vanilla HTML/CSS/JS stack into a React (Vite) app
- A much more presentable, card-based UI instead of the original's simple layout allowing more information to be displayed in a more visually appealing way
- Way more Pokemon info on display with stat bars, abilities, held items, alternate forms, evolution chain, sprite gallery, cries, and species details (habitat, color, growth rate, gender ratio, capture rate, and more)

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL and search for a Pokemon by name.

## Skills Learned

- Translating a vanilla JS project into a component-based React app
- Working with multiple related PokeAPI endpoints (Pokemon, species, evolution chain) and combining their data
- Building a clean, responsive UI from scratch

## Reflection

Revisiting an old project with new tools was a good way to see how much my approach has changed. It pushed me to dig deeper into what PokeAPI actually offers and to think more about presentation, not just getting the data on screen.
