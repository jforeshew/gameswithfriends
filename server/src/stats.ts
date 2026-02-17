const startedAt = Date.now();

let roomsCreated = 0;
let gamesStarted = 0;
let gamesCompleted = 0;
let movesMade = 0;
const gamesByType: Record<string, number> = {};

export function incrementRoomsCreated() {
  roomsCreated++;
}

export function incrementGamesStarted(gameType: string) {
  gamesStarted++;
  gamesByType[gameType] = (gamesByType[gameType] || 0) + 1;
}

export function incrementGamesCompleted() {
  gamesCompleted++;
}

export function incrementMovesMade() {
  movesMade++;
}

export function getStats() {
  return {
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    roomsCreated,
    gamesStarted,
    gamesCompleted,
    movesMade,
    gamesByType,
  };
}
