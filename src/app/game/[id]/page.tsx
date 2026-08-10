"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type GameStatus } from "@/lib/db";
import StarRating from "@/components/StarRating";

export default function GameEditPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();

  const game = useLiveQuery(() => db.games.get(id), [id]);

  const [status, setStatus] = useState<GameStatus>("library");
  const [rating, setRating] = useState(0);
  const [playCount, setPlayCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  if (game && hydratedId !== game.id) {
    setHydratedId(game.id ?? null);
    setStatus(game.status);
    setRating(game.rating ?? 0);
    setPlayCount(game.playCount ?? 1);
    setNotes(game.notes ?? "");
  }

  if (!game) {
    return <div className="mx-auto max-w-md px-4 pt-6 text-neutral-500">Loading…</div>;
  }

  const currentGame = game;

  async function handleSave() {
    await db.games.update(id, {
      status,
      rating: status === "library" ? rating || undefined : undefined,
      playCount: status === "library" ? playCount : undefined,
      notes: notes.trim() || undefined,
      dateUpdated: new Date().toISOString(),
    });
    router.push(status === "library" ? "/" : "/wishlist");
  }

  async function handleDelete() {
    if (
      !confirm(
        `Remove "${currentGame.name}" from your ${
          currentGame.status === "library" ? "library" : "wishlist"
        }?`
      )
    ) {
      return;
    }
    await db.games.delete(id);
    router.push(currentGame.status === "library" ? "/" : "/wishlist");
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <button onClick={() => router.back()} className="mb-4 text-sm text-neutral-500">
        ← Back
      </button>

      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {game.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.imageUrl} alt={game.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <p className="text-lg font-semibold">{game.name}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {game.yearPublished ?? ""}
            {game.minPlayers && game.maxPlayers ? ` · ${game.minPlayers}–${game.maxPlayers} players` : ""}
            {game.playingTime ? ` · ~${game.playingTime} min` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setStatus("library")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              status === "library" ? "bg-amber-600 text-white" : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            Played
          </button>
          <button
            onClick={() => setStatus("wishlist")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              status === "wishlist" ? "bg-amber-600 text-white" : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            Wishlist
          </button>
        </div>

        {status === "library" ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Times played</label>
              <input
                type="number"
                min={1}
                value={playCount}
                onChange={(e) => setPlayCount(Number(e.target.value) || 1)}
                className="w-24 rounded-lg border border-black/10 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-neutral-900"
              />
            </div>
          </>
        ) : null}

        <div>
          <label className="mb-1 block text-sm text-neutral-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. great with 4 players"
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        <button
          onClick={handleSave}
          className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
        >
          Save
        </button>
        <button
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
