"use client";

import { useEffect, useState } from "react";
import { createGameLog, getLastPlayersForGame } from "@/lib/gameLogs";
import { MAX_PLAYERS, type RoundScore } from "@/lib/db";

interface LogGameModalProps {
  gameId: number;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface DraftRound {
  localId: string;
  playedAt: string; // datetime-local string
  scores: RoundScore[];
}

function nowForInput(): string {
  const offset = new Date().getTimezoneOffset();
  return new Date(Date.now() - offset * 60000).toISOString().slice(0, 16);
}

function buildRound(players: string[]): DraftRound {
  return {
    localId: crypto.randomUUID(),
    playedAt: nowForInput(),
    scores: players.map((name) => ({ playerName: name, score: undefined })),
  };
}

export default function LogGameModal({ gameId, open, onClose, onSaved }: LogGameModalProps) {
  const [players, setPlayers] = useState<string[]>([]);
  const [rounds, setRounds] = useState<DraftRound[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset the whole draft every time the modal opens: prefill players from last
  // session, but always start with one fresh round at "now" (never carried over).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getLastPlayersForGame(gameId).then((lastPlayers) => {
      if (cancelled) return;
      setPlayers(lastPlayers);
      setRounds([buildRound(lastPlayers)]);
    });
    return () => {
      cancelled = true;
    };
  }, [open, gameId]);

  if (!open) return null;

  function updatePlayerName(index: number, name: string) {
    const next = [...players];
    next[index] = name;
    setPlayers(next);
    setRounds((prev) =>
      prev.map((r) => ({
        ...r,
        scores: next.map((n, i) => (r.scores[i]?.playerName === n ? r.scores[i] : { playerName: n, score: r.scores[i]?.score })),
      }))
    );
  }

  function addPlayerRow() {
    if (players.length >= MAX_PLAYERS) return;
    const next = [...players, ""];
    setPlayers(next);
    setRounds((prev) =>
      prev.map((r) => ({ ...r, scores: [...r.scores, { playerName: "", score: undefined }] }))
    );
  }

  function removePlayerRow(index: number) {
    const next = players.filter((_, i) => i !== index);
    setPlayers(next);
    setRounds((prev) => prev.map((r) => ({ ...r, scores: r.scores.filter((_, i) => i !== index) })));
  }

  function addRoundRow() {
    setRounds((prev) => [...prev, buildRound(players)]);
  }

  function removeRoundRow(localId: string) {
    setRounds((prev) => (prev.length > 1 ? prev.filter((r) => r.localId !== localId) : prev));
  }

  function updateRoundTime(localId: string, playedAt: string) {
    setRounds((prev) => prev.map((r) => (r.localId === localId ? { ...r, playedAt } : r)));
  }

  function updateScore(localId: string, playerIndex: number, value: string) {
    setRounds((prev) =>
      prev.map((r) =>
        r.localId !== localId
          ? r
          : {
              ...r,
              scores: r.scores.map((s, i) =>
                i === playerIndex ? { ...s, score: value === "" ? undefined : Number(value) } : s
              ),
            }
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    const cleanedPlayers = players.map((p) => p.trim()).filter((p) => p !== "");
    const cleanedRounds = rounds.map((r) => ({
      playedAt: new Date(r.playedAt).toISOString(),
      scores: r.scores
        .filter((s) => s.playerName.trim() !== "")
        .map((s) => ({ playerName: s.playerName.trim(), score: s.score })),
    }));
    await createGameLog(gameId, cleanedPlayers, cleanedRounds);
    setSaving(false);
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:w-[28rem] sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold">Log a game</h2>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            Players{players.length >= MAX_PLAYERS ? ` — max ${MAX_PLAYERS}` : ""}
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
        <div className="mb-4 flex flex-col gap-2">
          {players.map((name, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => updatePlayerName(i, e.target.value)}
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-neutral-950"
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
          {players.length === 0 ? (
            <p className="text-sm text-neutral-400">No players added yet (optional).</p>
          ) : null}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-neutral-500">Rounds</span>
          <button type="button" onClick={addRoundRow} className="text-sm font-medium text-amber-600 dark:text-amber-400">
            + Add round
          </button>
        </div>
        <div className="mb-4 flex flex-col gap-4">
          {rounds.map((round, ri) => (
            <div key={round.localId} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">Round {ri + 1}</span>
                {rounds.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRoundRow(round.localId)}
                    className="text-xs text-neutral-400"
                  >
                    Remove round
                  </button>
                ) : null}
              </div>
              <input
                type="datetime-local"
                value={round.playedAt}
                onChange={(e) => updateRoundTime(round.localId, e.target.value)}
                className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-950"
              />
              {round.scores.map((s, pi) => (
                <div key={pi} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">{s.playerName || `Player ${pi + 1}`}</span>
                  <input
                    type="number"
                    placeholder="Score"
                    value={s.score ?? ""}
                    onChange={(e) => updateScore(round.localId, pi, e.target.value)}
                    className="w-20 rounded-lg border border-black/10 px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  />
                </div>
              ))}
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
            {saving ? "Saving…" : "Save game"}
          </button>
        </div>
      </div>
    </div>
  );
}
