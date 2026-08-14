"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export interface GameLogStats {
  logCount: number;
  lastPlayedAt: string | null;
}

export function useGameLogStats(gameId: number | undefined, legacyPlayCount = 0): GameLogStats | undefined {
  return useLiveQuery(async () => {
    if (!gameId) return { logCount: legacyPlayCount, lastPlayedAt: null };
    const logs = await db.gameLogs.where("gameId").equals(gameId).toArray();
    let lastPlayedAt: string | null = null;
    for (const log of logs) {
      for (const round of log.rounds) {
        if (!lastPlayedAt || round.playedAt > lastPlayedAt) lastPlayedAt = round.playedAt;
      }
    }
    return { logCount: legacyPlayCount + logs.length, lastPlayedAt };
  }, [gameId, legacyPlayCount]);
}
