import Link from "next/link";
import type { GameRecord } from "@/lib/db";
import StarRating from "./StarRating";
import { usePlayStats } from "@/lib/usePlayStats";

export default function GameCard({ game }: { game: GameRecord }) {
  const stats = usePlayStats(game.id, game.legacyPlayCount ?? 0);

  return (
    <Link
      href={`/game/${game.id}`}
      className="flex gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
        {game.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumbnailUrl}
            alt={game.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🎲</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="truncate font-medium">{game.name}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {game.yearPublished ?? ""}
          {game.minPlayers && game.maxPlayers
            ? ` · ${game.minPlayers}–${game.maxPlayers} players`
            : ""}
        </p>
        {game.tags.includes("played") ? (
          <div className="flex items-center gap-2">
            <StarRating value={game.rating ?? 0} size="sm" />
            {stats?.playCount ? (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                played {stats.playCount}×
              </span>
            ) : null}
          </div>
        ) : null}
        {game.tags.includes("owned") ? (
          <span className="w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Owned
          </span>
        ) : null}
      </div>
    </Link>
  );
}
