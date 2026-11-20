# SKF Karate FeeTrack

FeeTrack is the staff-facing fee, admission and operations ledger for SKF Karate. It runs on Next.js 16 with the App Router and Tailwind CSS 4.

## Design contract

- [`DESIGN.md`](./DESIGN.md) is the only visual contract: **Aurora Glass**.
- [`SKF-FeeTrack-STATUS.md`](./SKF-FeeTrack-STATUS.md) records scope, decisions, verification and current git state.
- Navigation is a bottom bar on phones, a slim rail on desktop, the More sheet for the full destination list, and a compact top-right account control. There is no hamburger or full drawer.
- Teal is the only accent. Green/amber/red are reserved for genuine payment statuses.
- The UI is mobile-first at 320px and verified at 200% text zoom without horizontal overflow or sub-44px controls.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app expects its FeeTrack backend through the configured API proxy; copy the required environment values into `.env.local` locally. Never commit secrets.

## Production checks

```bash
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--max-old-space-size=4096 npx next build
git diff --check
```

To serve a production build locally:

```bash
PORT=3200 npm run start
```

Additional operational scripts are available:

```bash
npm run audit:production
npm run smoke:production
```

## Working rules

- Commit only after type-check, lint and build pass.
- Keep money rules unchanged: stored charged amounts win; no new formula variants.
- Do not change backend logic, database state, roles or access while doing UI work.
- Direct pushes to `origin/main` are used for this repo; no PR or deploy is created by this workflow.
