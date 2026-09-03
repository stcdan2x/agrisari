# AgriSari

Business management for a small agri-vet retail store in the Philippines: an
offline-first progressive web app for sales, stock, purchasing, customer credit,
money and a planning engine that says which ways of buying and selling pay
best, with a built-in guide to the trade. Data lives in the browser (IndexedDB)
with optional backup and sync through Google Drive.

Live app: https://stcdan2x.github.io/agrisari/

## Stack

Vite 6, React 18, TypeScript, Tailwind 4, Dexie, vite-plugin-pwa, Vitest.

## Run locally

```
npm ci
npm run dev       # development server
npm test          # unit tests
npm run build     # production build into dist/
```

## Deployment

Every push to `main` runs the tests and the build, then publishes `dist/` to
GitHub Pages (`.github/workflows/deploy.yml`).

## About this repository

This repository is a generated, minimal projection of a private development
repository: it contains the application source and its tests, nothing else.
Its history is a sequence of `Sync skeleton from <sha>` commits. The figures
in the built-in guide are compiled from public sources and are informational,
not advice.

## License

MIT, see `LICENSE`.
