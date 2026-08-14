import Dexie, { type EntityTable } from "dexie";

export type GameTag = "owned" | "wishlist" | "played";

export const MAX_PLAYERS = 15;

export interface GameRecord {
  id?: number;
  bggId: number;
  name: string;
  yearPublished?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playingTime?: number;
  description?: string;
  // BGG's community average rating — distinct from `rating`, which is yours
  // and is never overwritten by BGG data.
  bggRating?: number;
  tags: GameTag[];
  rating?: number;
  // Sessions logged before per-session tracking existed. New sessions go in the
  // `gameLogs` table instead; total session count = legacyPlayCount + gameLogs.length.
  legacyPlayCount?: number;
  notes?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface RoundScore {
  playerName: string;
  score?: number; // never prefilled — always starts blank
}

export interface Round {
  id: string;
  playedAt: string; // ISO timestamp, tracked per round (not per session)
  scores: RoundScore[];
}

export interface GameLogRecord {
  id?: number;
  gameId: number;
  players: string[]; // names shared across all rounds in this session
  rounds: Round[]; // always at least one round
}

/** @deprecated superseded by GameLogRecord (v3) — kept only for the v2->v3 migration */
interface LegacyPlayRecord {
  id?: number;
  gameId: number;
  playedAt: string;
  players: { name: string; score?: number }[];
}

export const db = new Dexie("BoardGameTrackerDB") as Dexie & {
  games: EntityTable<GameRecord, "id">;
  gameLogs: EntityTable<GameLogRecord, "id">;
};

db.version(1).stores({
  games: "++id, bggId, status, name, rating, dateAdded",
});

db.version(2)
  .stores({
    games: "++id, bggId, name, rating, dateAdded, *tags",
    plays: "++id, gameId, playedAt",
  })
  .upgrade(async (tx) => {
    await tx
      .table("games")
      .toCollection()
      .modify((game: Record<string, unknown>) => {
        const tags: GameTag[] = [];
        if (game.status === "library") tags.push("played");
        if (game.status === "wishlist") tags.push("wishlist");
        game.tags = tags;
        game.legacyPlayCount = (game.playCount as number | undefined) ?? 0;
        delete game.status;
        delete game.playCount;
      });
  });

db.version(3)
  .stores({
    games: "++id, bggId, name, rating, dateAdded, *tags",
    gameLogs: "++id, gameId",
    plays: null,
  })
  .upgrade(async (tx) => {
    const legacyPlays = await tx.table<LegacyPlayRecord>("plays").toArray();
    const gameLogs = legacyPlays.map((play) => ({
      gameId: play.gameId,
      players: play.players.map((p) => p.name),
      rounds: [
        {
          id: crypto.randomUUID(),
          playedAt: play.playedAt,
          scores: play.players.map((p) => ({ playerName: p.name, score: p.score })),
        },
      ],
    }));
    if (gameLogs.length > 0) {
      await tx.table("gameLogs").bulkAdd(gameLogs);
    }
  });
