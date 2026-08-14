"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type GameTag } from "@/lib/db";
import StarRating from "@/components/StarRating";
import TagToggle from "@/components/TagToggle";
import LogGameModal from "@/components/LogGameModal";
import GameLogEditor from "@/components/GameLogEditor";

export default function GameEditPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();

  const game = useLiveQuery(() => db.games.get(id), [id]);
  const gameLogs = useLiveQuery(() => db.gameLogs.where("gameId").equals(id).toArray(), [id]);

  const [tags, setTags] = useState<GameTag[]>([]);
  const [rating, setRating] = useState(0);
  const [legacyPlayCount, setLegacyPlayCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [hydratedId, setHydratedId] = useState<number | null>(null);
  const [showLogGame, setShowLogGame] = useState(false);

  if (game && hydratedId !== game.id) {
    setHydratedId(game.id ?? null);
    setTags(game.tags);
    setRating(game.rating ?? 0);
    setLegacyPlayCount(game.legacyPlayCount ?? 0);
    setNotes(game.notes ?? "");
  }

  if (!game) {
    return <div className="mx-auto max-w-md px-4 pt-6 text-neutral-500">Loading…</div>;
  }

  const currentGame = game;
  const totalSessions = legacyPlayCount + (gameLogs?.length ?? 0);

  async function handleSave() {
    if (tags.length === 0) return;
    const isPlayed = tags.includes("played");
    await db.games.update(id, {
      tags,
      rating: isPlayed ? rating || undefined : undefined,
      legacyPlayCount: isPlayed ? legacyPlayCount : undefined,
      notes: notes.trim() || undefined,
      dateUpdated: new Date().toISOString(),
    });
    router.push("/");
  }

  async function handleDelete() {
    if (!confirm(`Remove "${currentGame.name}" and its logged games?`)) {
      return;
    }
    await db.transaction("rw", db.games, db.gameLogs, async () => {
      await db.gameLogs.where("gameId").equals(id).delete();
      await db.games.delete(id);
    });
    router.push("/");
  }

  async function handleGameLogged() {
    // Logging a game may have auto-added the "played" tag in the DB — keep
    // the in-progress form state (which the user could still be editing) in sync.
    const updated = await db.games.get(id);
    if (updated) setTags(updated.tags);
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
          {game.bggRating ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              BGG rating: {game.bggRating.toFixed(1)}
            </p>
          ) : null}
        </div>
      </div>

      {game.description ? (
        <details className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          <summary className="cursor-pointer text-neutral-500">Description</summary>
          <p className="mt-2 whitespace-pre-line">{game.description}</p>
        </details>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-500">Tags</label>
          <TagToggle value={tags} onChange={setTags} />
        </div>

        {tags.includes("played") ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Sessions before tracking</label>
              <input
                type="number"
                min={0}
                value={legacyPlayCount}
                onChange={(e) => setLegacyPlayCount(Number(e.target.value) || 0)}
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
          disabled={tags.length === 0}
          className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Save
        </button>

        <div className="mt-2 border-t border-black/10 pt-4 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-medium">Play history</h2>
              <p className="text-xs text-neutral-500">{totalSessions} sessions logged</p>
            </div>
            <button
              onClick={() => setShowLogGame(true)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Log a game
            </button>
          </div>

          {gameLogs && gameLogs.length === 0 ? (
            <p className="text-sm text-neutral-500">No sessions logged yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {gameLogs?.map((log) => (
                <GameLogEditor key={log.id} gameLog={log} onDeleted={() => {}} />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Delete game
        </button>
      </div>

      {game.id ? (
        <LogGameModal
          gameId={game.id}
          open={showLogGame}
          onClose={() => setShowLogGame(false)}
          onSaved={handleGameLogged}
        />
      ) : null}
    </div>
  );
}
