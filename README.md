# Fleet Feud

Online Battleship for two players, in the browser. Create a room, send the link to a friend, play. No login.

- **Client:** React + Vite (`src/client`)
- **Server:** Cloudflare Worker + one Durable Object per room, native WebSockets (`src/worker`)
- **Game rules:** pure TypeScript shared by client and server (`src/game`), covered by unit tests

The server is the referee: it validates every placement and every shot, and sends each player only what they are allowed to see. Opponent ships never reach the browser before the game ends.

## Run locally

```bash
npm install
npm run dev       # builds the client in watch mode + wrangler dev on http://localhost:8787
npm test          # unit tests (Vitest)
npm run typecheck
```

Open two browser tabs on the same room link to play against yourself.

## Deploy

```bash
npx wrangler login   # once
npm run deploy       # vite build + wrangler deploy
```

The app runs on the Cloudflare free plan. Rooms are deleted 24 hours after creation.
