"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GameRecord } from "@/lib/db";
import { db } from "@/lib/db";

export default function WishlistRow({ game }: { game: GameRecord }) {
  const router = useRouter();

  async function markAsPlayed(e: React.MouseEvent) {
    e.preventDefault();
    if (!game.id) return;
    await db.games.update(game.id, {
      status: "library",
      playCount: 1,
      dateUpdated: new Date().toISOString(),
    });
    router.push(`/game/${game.id}`);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <Link href={`/game/${game.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {game.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.thumbnailUrl} alt={game.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">🎲</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{game.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {game.yearPublished ?? ""}
            {game.minPlayers && game.maxPlayers ? ` · ${game.minPlayers}–${game.maxPlayers} players` : ""}
          </p>
        </div>
      </Link>
      <button
        onClick={markAsPlayed}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
      >
        Mark played
      </button>
    </div>
  );
}
