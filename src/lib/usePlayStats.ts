"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export interface PlayStats {
  playCount: number;
  lastPlayedAt: string | null;
}

export function usePlayStats(gameId: number | undefined, legacyPlayCount = 0): PlayStats | undefined {
  return useLiveQuery(async () => {
    if (!gameId) return { playCount: legacyPlayCount, lastPlayedAt: null };
    const plays = await db.plays.where("gameId").equals(gameId).sortBy("playedAt");
    return {
      playCount: legacyPlayCount + plays.length,
      lastPlayedAt: plays.length ? plays[plays.length - 1].playedAt : null,
    };
  }, [gameId, legacyPlayCount]);
}
