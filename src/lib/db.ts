import Dexie, { type EntityTable } from "dexie";

export type GameStatus = "library" | "wishlist";

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
  status: GameStatus;
  rating?: number;
  playCount?: number;
  notes?: string;
  dateAdded: string;
  dateUpdated: string;
}

export const db = new Dexie("BoardGameTrackerDB") as Dexie & {
  games: EntityTable<GameRecord, "id">;
};

db.version(1).stores({
  games: "++id, bggId, status, name, rating, dateAdded",
});
