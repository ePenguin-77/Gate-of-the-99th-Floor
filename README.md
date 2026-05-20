# Gate of the 99th Floor

A browser-based narrative survival RPG prototype built with React, TypeScript, Vite, Tailwind CSS, and localStorage saves.

The player is not the climber directly. The player acts as a small god-like observer who guides, warns, blesses, or silently watches a human trapped inside a 99-floor tower. This MVP focuses on the central hub town and Floors 1-10.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the local URL Vite prints in the terminal, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

## Project Structure

```text
src/
  components/        Shared UI pieces
  data/              Data-driven classes, traits, and floor definitions
  game/              Character generation, state helpers, event resolver, saves
  screens/           Main game screens
  types/             Shared TypeScript game types
  App.tsx            Screen routing and state orchestration
  main.tsx           React entry point
  index.css          Tailwind and global style
```

## Current MVP

- Random character generation with class, traits, stats, and personality summary
- Hub town with survival status, resources, tower progress, and latest journal entry
- Town actions: train, rest, gather resources
- Tower event loop with one Divine Action per floor
- Data-driven Floors 1-10, including Floor 10 as the first boss
- Narrative journal entries
- localStorage save, continue, and reset
