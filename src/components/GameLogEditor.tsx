"use client";

import { useState } from "react";
import {
  addRound,
  deleteGameLog,
  deleteRound,
  updatePlayers,
  updateRoundScore,
  updateRoundTime,
} from "@/lib/gameLogs";
import { MAX_PLAYERS, type GameLogRecord } from "@/lib/db";

interface GameLogEditorProps {
  gameLog: GameLogRecord;
  onDeleted: () => void;
}

function toInputValue(iso: string): string {
  const offset = new Date(iso).getTimezoneOffset();
  return new Date(new Date(iso).getTime() - offset * 60000).toISOString().slice(0, 16);
}

function formatDisplay(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function GameLogEditor({ gameLog, onDeleted }: GameLogEditorProps) {
  const [players, setPlayers] = useState<string[]>(gameLog.players);

  if (!gameLog.id) return null;
  const gameLogId = gameLog.id;

  function commitPlayers(next: string[]) {
    setPlayers(next);
    updatePlayers(gameLogId, next.map((p) => p.trim()).filter((p) => p !== ""));
  }

  function handleAddPlayer() {
    if (players.length >= MAX_PLAYERS) return;
    commitPlayers([...players, ""]);
  }

  function handleRemovePlayer(index: number) {
    commitPlayers(players.filter((_, i) => i !== index));
  }

  function handlePlayerNameChange(index: number, name: string) {
    const next = [...players];
    next[index] = name;
    setPlayers(next); // local only while typing
  }

  async function handleDelete() {
    if (!confirm("Delete this logged game and all its rounds?")) return;
    await deleteGameLog(gameLogId);
    onDeleted();
  }

  return (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            Players{players.length >= MAX_PLAYERS ? ` — max ${MAX_PLAYERS}` : ""}
          </span>
          <button
            type="button"
            onClick={handleAddPlayer}
            disabled={players.length >= MAX_PLAYERS}
            className="text-sm font-medium text-amber-600 disabled:text-neutral-300 dark:text-amber-400 dark:disabled:text-neutral-700"
          >
            + Add player
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {players.map((name, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                onBlur={() => commitPlayers(players)}
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-950"
              />
              <button onClick={() => handleRemovePlayer(i)} className="px-2 text-neutral-400" aria-label="Remove player">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-neutral-500">Rounds</span>
          <button
            type="button"
            onClick={() => addRound(gameLogId)}
            className="text-sm font-medium text-amber-600 dark:text-amber-400"
          >
            + Add round
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {gameLog.rounds.map((round, ri) => (
            <div key={round.id} className="rounded-lg border border-black/10 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">
                  Round {ri + 1} · {formatDisplay(round.playedAt)}
                </span>
                {gameLog.rounds.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => deleteRound(gameLogId, round.id)}
                    className="text-xs text-neutral-400"
                  >
                    Remove round
                  </button>
                ) : null}
              </div>
              <input
                type="datetime-local"
                defaultValue={toInputValue(round.playedAt)}
                onChange={(e) => updateRoundTime(gameLogId, round.id, new Date(e.target.value).toISOString())}
                className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-950"
              />
              {round.scores.map((s) => (
                <div key={s.playerName} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">{s.playerName}</span>
                  <input
                    type="number"
                    placeholder="Score"
                    defaultValue={s.score ?? ""}
                    onBlur={(e) => {
                      const value = e.target.value === "" ? undefined : Number(e.target.value);
                      updateRoundScore(gameLogId, round.id, s.playerName, value);
                    }}
                    className="w-20 rounded-lg border border-black/10 px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className="mt-3 text-sm font-medium text-red-600 dark:text-red-400"
      >
        Delete this session
      </button>
    </div>
  );
}
