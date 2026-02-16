# Games with Friends

Play classic board games with your friends in real time — no sign-up required.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **State:** In-memory (no database)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
# From the project root
npm install
cd server && npm install
cd ../client && npm install
```

### Run Locally

```bash
# From the project root — starts both server and client
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Server (port 3001)
cd server && npm run dev

# Terminal 2 — Client (port 3000)
cd client && npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy the `.env.example` files:

**Server** (`server/.env`):
```
PORT=3001
CLIENT_URL=http://localhost:3000
```

**Client** (`client/.env.local`):
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

## How to Play

1. Open the app and click **Create Room**
2. Choose a game and enter your display name
3. Share the 6-character room code or link with a friend
4. Your friend clicks **Join Room** and enters the code
5. The host clicks **Start Game** — enjoy!

## Project Structure

```
/client
  /src
    /app              — Next.js pages (landing page, room page)
    /components
      /ui             — Reusable UI components (Button, Input, Modal)
      /game           — Game components (Board, Piece, Chat, Lobby)
    /lib              — Socket client, types, move validation
    /hooks            — useSocket, useGame
/server
  /src
    index.ts          — Express + Socket.IO entry point
    /rooms            — Room creation, joining, cleanup
    /games
      /checkers       — Game engine (init, validate, apply, check winner)
    /types            — Shared TypeScript types
```

## Adding a New Game

1. Create a new folder under `server/src/games/yourgame/`
2. Implement the `GameEngine` interface from `server/src/types`:
   ```ts
   interface GameEngine<TState, TMove> {
     initGame(playerIds: [string, string]): TState;
     validateMove(state: TState, playerId: string, move: TMove): string | null;
     applyMove(state: TState, playerId: string, move: TMove): TState;
     getState(state: TState, playerId: string): unknown;
     checkWinner(state: TState): { winner: string; reason: string } | null;
   }
   ```
3. Add the game type to the `GameType` union in `server/src/types/index.ts`
4. Wire it into the socket handler in `server/src/index.ts` (switch on `room.gameType`)
5. Create a board component in `client/src/components/game/`
6. Add the game card to the landing page grid

## Features

- Real-time gameplay via WebSockets
- Room-based multiplayer with shareable codes
- In-game chat
- Reconnection support (60s window)
- Forfeit on disconnect timeout
- Server-authoritative game state
- Mandatory captures and multi-jump support (Checkers)
- Mobile-responsive layout
