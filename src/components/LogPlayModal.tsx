"use client";

import { useState } from "react";
import { addPlay } from "@/lib/plays";
import type { PlayerScore } from "@/lib/db";

const MAX_PLAYERS = 15;

interface LogPlayModalProps {
  gameId: number;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function toLocalDatetimeInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function LogPlayModal({ gameId, open, onClose, onSaved }: LogPlayModalProps) {
  const [playedAt, setPlayedAt] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function addPlayerRow() {
    setPlayers((prev) => (prev.length >= MAX_PLAYERS ? prev : [...prev, { name: "", score: undefined }]));
  }

  function updatePlayer(index: number, field: keyof PlayerScore, value: string) {
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, [field]: field === "score" ? (value === "" ? undefined : Number(value)) : value }
          : p
      )
    );
  }

  function removePlayerRow(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    const cleaned = players.filter((p) => p.name.trim() !== "");
    await addPlay(gameId, cleaned, new Date(playedAt).toISOString());
    setSaving(false);
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:w-96 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold">Log a play</h2>

        <label className="mb-1 block text-sm text-neutral-500">When</label>
        <input
          type="datetime-local"
          value={playedAt}
          onChange={(e) => setPlayedAt(e.target.value)}
          className="mb-4 w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-neutral-950"
        />

        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            Players (optional){players.length >= MAX_PLAYERS ? ` — max ${MAX_PLAYERS}` : ""}
          </span>
          <button
            type="button"
            onClick={addPlayerRow}
            disabled={players.length >= MAX_PLAYERS}
            className="text-sm font-medium text-amber-600 disabled:text-neutral-300 dark:text-amber-400 dark:disabled:text-neutral-700"
          >
            + Add player
          </button>
        </div>

        <div className="mb-4 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {players.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={p.name}
                onChange={(e) => updatePlayer(i, "name", e.target.value)}
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-neutral-950"
              />
              <input
                type="number"
                placeholder="Score"
                value={p.score ?? ""}
                onChange={(e) => updatePlayer(i, "score", e.target.value)}
                className="w-20 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-neutral-950"
              />
              <button
                type="button"
                onClick={() => removePlayerRow(i)}
                aria-label="Remove player"
                className="px-2 text-neutral-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-black/10 py-2 font-medium dark:border-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save play"}
          </button>
        </div>
      </div>
    </div>
  );
}
