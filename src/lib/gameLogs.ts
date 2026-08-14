import { db, type Round, type RoundScore } from "./db";

function latestRoundTime(rounds: Round[]): string {
  return rounds.reduce((max, r) => (r.playedAt > max ? r.playedAt : max), "");
}

export async function getLastPlayersForGame(gameId: number): Promise<string[]> {
  const logs = await db.gameLogs.where("gameId").equals(gameId).toArray();
  if (logs.length === 0) return [];
  logs.sort((a, b) => latestRoundTime(b.rounds).localeCompare(latestRoundTime(a.rounds)));
  return logs[0].players;
}

export async function createGameLog(
  gameId: number,
  players: string[],
  rounds: { playedAt: string; scores: RoundScore[] }[]
) {
  await db.transaction("rw", db.gameLogs, db.games, async () => {
    await db.gameLogs.add({
      gameId,
      players,
      rounds: rounds.map((r) => ({ id: crypto.randomUUID(), ...r })),
    });
    const game = await db.games.get(gameId);
    if (game && !game.tags.includes("played")) {
      await db.games.update(gameId, {
        tags: [...game.tags, "played"],
        dateUpdated: new Date().toISOString(),
      });
    }
  });
}

export async function updatePlayers(gameLogId: number, players: string[]) {
  const log = await db.gameLogs.get(gameLogId);
  if (!log) return;
  const rounds = log.rounds.map((round) => {
    const existing = new Map(round.scores.map((s) => [s.playerName, s.score]));
    return {
      ...round,
      scores: players.map((name) => ({ playerName: name, score: existing.get(name) })),
    };
  });
  await db.gameLogs.update(gameLogId, { players, rounds });
}

export async function addRound(gameLogId: number, playedAt: string = new Date().toISOString()) {
  const log = await db.gameLogs.get(gameLogId);
  if (!log) return;
  const newRound: Round = {
    id: crypto.randomUUID(),
    playedAt,
    scores: log.players.map((name) => ({ playerName: name, score: undefined })),
  };
  await db.gameLogs.update(gameLogId, { rounds: [...log.rounds, newRound] });
}

export async function updateRoundTime(gameLogId: number, roundId: string, playedAt: string) {
  const log = await db.gameLogs.get(gameLogId);
  if (!log) return;
  await db.gameLogs.update(gameLogId, {
    rounds: log.rounds.map((r) => (r.id === roundId ? { ...r, playedAt } : r)),
  });
}

export async function updateRoundScore(
  gameLogId: number,
  roundId: string,
  playerName: string,
  score: number | undefined
) {
  const log = await db.gameLogs.get(gameLogId);
  if (!log) return;
  await db.gameLogs.update(gameLogId, {
    rounds: log.rounds.map((r) =>
      r.id !== roundId
        ? r
        : { ...r, scores: r.scores.map((s) => (s.playerName === playerName ? { ...s, score } : s)) }
    ),
  });
}

// A session must always keep at least one round — no-ops if this is the last one.
export async function deleteRound(gameLogId: number, roundId: string) {
  const log = await db.gameLogs.get(gameLogId);
  if (!log || log.rounds.length <= 1) return;
  await db.gameLogs.update(gameLogId, { rounds: log.rounds.filter((r) => r.id !== roundId) });
}

export async function deleteGameLog(gameLogId: number) {
  await db.gameLogs.delete(gameLogId);
}
