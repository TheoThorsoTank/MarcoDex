"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db } from "@/lib/db";
import GameCard from "@/components/GameCard";

type SortKey = "rating" | "dateAdded";

export default function LibraryPage() {
  const [sort, setSort] = useState<SortKey>("dateAdded");
  const games = useLiveQuery(() => db.games.where("status").equals("library").toArray(), []);

  const sorted = useMemo(() => {
    if (!games) return undefined;
    const copy = [...games];
    if (sort === "rating") {
      copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      copy.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
    }
    return copy;
  }, [games, sort]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
        >
          <option value="dateAdded">Recently added</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {sorted && sorted.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-neutral-500 dark:text-neutral-400">
          <span className="text-4xl">🎲</span>
          <p>Nothing logged yet.</p>
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
