"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db } from "@/lib/db";
import GameCard from "@/components/GameCard";

type SortKey = "rating" | "dateAdded" | "mostPlayed" | "recentlyPlayed";

export default function PlayedPage() {
  const [sort, setSort] = useState<SortKey>("dateAdded");
  const [ownedOnly, setOwnedOnly] = useState(false);

  const data = useLiveQuery(async () => {
    const games = await db.games.where("tags").equals("played").toArray();
    const gameIds = games.map((g) => g.id).filter((id): id is number => id !== undefined);
    const logs = gameIds.length ? await db.gameLogs.where("gameId").anyOf(gameIds).toArray() : [];

    const statsByGame = new Map<number, { count: number; lastPlayedAt: string | null }>();
    for (const g of games) {
      if (g.id === undefined) continue;
      const gameLogs = logs.filter((l) => l.gameId === g.id);
      const count = (g.legacyPlayCount ?? 0) + gameLogs.length;
      let lastPlayedAt: string | null = null;
      for (const log of gameLogs) {
        for (const round of log.rounds) {
          if (!lastPlayedAt || round.playedAt > lastPlayedAt) lastPlayedAt = round.playedAt;
        }
      }
      statsByGame.set(g.id, { count, lastPlayedAt });
    }
    return { games, statsByGame };
  }, []);

  const sorted = useMemo(() => {
    if (!data) return undefined;
    const { games, statsByGame } = data;
    const filtered = ownedOnly ? games.filter((g) => g.tags.includes("owned")) : games;
    const copy = [...filtered];
    if (sort === "rating") {
      copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sort === "mostPlayed") {
      copy.sort(
        (a, b) => (statsByGame.get(b.id ?? -1)?.count ?? 0) - (statsByGame.get(a.id ?? -1)?.count ?? 0)
      );
    } else if (sort === "recentlyPlayed") {
      copy.sort((a, b) => {
        const aDate = statsByGame.get(a.id ?? -1)?.lastPlayedAt ?? "";
        const bDate = statsByGame.get(b.id ?? -1)?.lastPlayedAt ?? "";
        return bDate.localeCompare(aDate);
      });
    } else {
      copy.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
    }
    return copy;
  }, [data, sort, ownedOnly]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Played</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOwnedOnly((v) => !v)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              ownedOnly
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-black/10 text-neutral-600 dark:border-white/10 dark:text-neutral-300"
            }`}
          >
            Owned {ownedOnly ? "✓" : ""}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
          >
            <option value="dateAdded">Recently added</option>
            <option value="rating">Top rated</option>
            <option value="mostPlayed">Most played</option>
            <option value="recentlyPlayed">Recently played</option>
          </select>
        </div>
      </div>

      {sorted && sorted.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-neutral-500 dark:text-neutral-400">
          <span className="text-4xl">🎲</span>
          <p>{ownedOnly ? "No owned games match yet." : "Nothing logged yet."}</p>
          <Link href="/add" className="text-amber-600 underline dark:text-amber-400">
            Search for a game to add
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted?.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
