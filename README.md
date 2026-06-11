# Kosh — net worth tracker

Track your net worth, investments, and expenses — **all stored on your device**.
No signup, no server, no data leaving the browser.

> The app name lives in one place: `src/lib/config.ts` (`APP_NAME`).

## Why local-first?

- See your net worth within 60 seconds of landing on the page — no auth wall.
- Financial data stays in your browser (IndexedDB). Privacy is the feature.
- Export/Import JSON gives you backup and portability.
- A cloud/sync tier can be added later behind the same `StorageAdapter`
  interface without touching the UI.

## Architecture

```
src/
  lib/
    config.ts          App name, currency, formatting
    types.ts           Domain model: Account, Holding, Snapshot, Transaction, Category
    db.ts              Dexie (IndexedDB) schema — implementation detail of local storage
    networth.ts        Pure functions: net worth summary, over-time series
    storage/
      adapter.ts       StorageAdapter interface — the UI talks ONLY to this
      local.ts         LocalStorageAdapter (IndexedDB via Dexie)
      index.ts         getStorage() — swap backends here when cloud tier lands
  components/
    ui/                Hand-rolled shadcn-style primitives
    header.tsx         App header + privacy mode (blur amounts) toggle
    ...
  app/                 Next.js app router pages (static export)
```

Key design decisions:

- **Snapshots are the source of truth for history.** Each monthly close writes
  one `Snapshot` per account; all "over time" charts are queries over them.
- **`StorageAdapter` everywhere.** No component imports Dexie directly, so the
  future cloud backend is a drop-in.
- **Static export** (`output: "export"`): hostable on GitHub Pages / Netlify /
  Cloudflare Pages for free.

## Roadmap

- **Phase 1 — Foundation (done):** accounts, net worth dashboard with
  allocation donut, monthly snapshots + over-time chart, expense tracking,
  export/import JSON, privacy mode.
- **Phase 2 — Smart accounts & automation (in progress):** rule-based
  PPF/FD/RD/EPF accrual (done), CAS PDF import (parsed client-side), live
  AMFI NAVs / stock prices, bank statement CSV import, loan amortization.
- **Phase 3 — Insights:** net worth delta decomposition (saved vs market
  movement), XIRR, allocation targets + drift alerts, goals, milestones.
- **Phase 4 — Cloud tier (later):** auth + sync via a `CloudAdapter`,
  server-side NAV refresh, multi-device.

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # static export to out/
```
