import Dexie, { type EntityTable } from "dexie";

export type GameTag = "owned" | "wishlist" | "played";

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
  tags: GameTag[];
  rating?: number;
  // Plays logged before per-play tracking existed. New plays go in the `plays`
  // table instead; total play count = legacyPlayCount + plays.length.
  legacyPlayCount?: number;
  notes?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface PlayerScore {
  name: string;
  score?: number;
}

export interface PlayRecord {
  id?: number;
  gameId: number;
  playedAt: string;
  players: PlayerScore[];
}

export const db = new Dexie("BoardGameTrackerDB") as Dexie & {
  games: EntityTable<GameRecord, "id">;
  plays: EntityTable<PlayRecord, "id">;
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
