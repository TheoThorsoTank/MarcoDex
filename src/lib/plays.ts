import { db, type PlayerScore } from "./db";

export async function addPlay(gameId: number, players: PlayerScore[], playedAt: string) {
  await db.transaction("rw", db.plays, db.games, async () => {
    await db.plays.add({ gameId, playedAt, players });
    const game = await db.games.get(gameId);
    if (game && !game.tags.includes("played")) {
      await db.games.update(gameId, {
        tags: [...game.tags, "played"],
        dateUpdated: new Date().toISOString(),
      });
    }
  });
}

export async function deletePlay(playId: number) {
  await db.plays.delete(playId);
}
