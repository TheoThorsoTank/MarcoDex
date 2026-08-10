"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db, type GameStatus } from "@/lib/db";
import type { BggGameDetails, BggSearchResult } from "@/lib/bgg";
import StarRating from "@/components/StarRating";

// BGG's search endpoint is slow (multi-second server-side lookups) and sends
// no-cache headers, so we cache results per query string for this session to
// avoid re-paying that cost when a user retypes or revisits a term.
const searchCache = new Map<string, BggSearchResult[]>();

export default function AddPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<BggGameDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [existing, setExisting] = useState<{ id: number; status: GameStatus } | null>(null);

  const [status, setStatus] = useState<GameStatus>("library");
  const [rating, setRating] = useState(0);
  const [playCount, setPlayCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    const key = value.trim().toLowerCase();
    if (!key) {
      setResults([]);
      setSearchError(null);
    } else if (searchCache.has(key)) {
      setResults(searchCache.get(key)!);
      setSearchError(null);
    } else {
      setSearching(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const key = query.trim().toLowerCase();
    if (!key || searchCache.has(key)) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(key)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setResults([]);
          setSearchError(data.error ?? "BoardGameGeek search failed.");
          return;
        }
        searchCache.set(key, data.results ?? []);
        setResults(data.results ?? []);
        setSearchError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
        setSearchError("Couldn't reach BoardGameGeek. Check your connection.");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function pickResult(result: BggSearchResult) {
    setLoadingDetails(true);
    setSelected(null);
    setExisting(null);
    try {
      const found = await db.games.where("bggId").equals(result.id).first();
      if (found) {
        setExisting({ id: found.id!, status: found.status });
      }
      const res = await fetch(`/api/bgg/thing?id=${result.id}`);
      const details: BggGameDetails = await res.json();
      setSelected(details);
      setStatus("library");
      setRating(0);
      setPlayCount(1);
      setNotes("");
    } finally {
      setLoadingDetails(false);
    }
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const now = new Date().toISOString();
    const id = await db.games.add({
      bggId: selected.id,
      name: selected.name,
      yearPublished: selected.yearPublished,
      imageUrl: selected.imageUrl,
      thumbnailUrl: selected.thumbnailUrl,
      minPlayers: selected.minPlayers,
      maxPlayers: selected.maxPlayers,
      playingTime: selected.playingTime,
      status,
      rating: status === "library" ? rating || undefined : undefined,
      playCount: status === "library" ? playCount : undefined,
      notes: notes.trim() || undefined,
      dateAdded: now,
      dateUpdated: now,
    });
    setSaving(false);
    router.push(status === "library" ? `/` : `/wishlist`);
    void id;
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-semibold">Add a game</h1>

      <input
        autoFocus
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Search BoardGameGeek…"
        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
      />

      {searchError ? <p className="mt-3 text-sm text-red-600">{searchError}</p> : null}
      {searching ? (
        <p className="mt-3 text-sm text-neutral-500">Searching BoardGameGeek… this can take a few seconds.</p>
      ) : null}

      {!selected && results.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => pickResult(r)}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {r.name} {r.yearPublished ? <span className="text-neutral-500">({r.yearPublished})</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {loadingDetails ? <p className="mt-3 text-sm text-neutral-500">Loading details…</p> : null}

      {selected ? (
        <div className="mt-5 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex gap-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {selected.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.imageUrl} alt={selected.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {selected.yearPublished ?? ""}
                {selected.minPlayers && selected.maxPlayers
                  ? ` · ${selected.minPlayers}–${selected.maxPlayers} players`
                  : ""}
                {selected.playingTime ? ` · ~${selected.playingTime} min` : ""}
              </p>
            </div>
          </div>

          {existing ? (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Already in your {existing.status === "library" ? "Library" : "Wishlist"}.{" "}
              <button
                onClick={() => router.push(`/game/${existing.id}`)}
                className="underline"
              >
                Edit it instead
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus("library")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    status === "library"
                      ? "bg-amber-600 text-white"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  Played
                </button>
                <button
                  onClick={() => setStatus("wishlist")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    status === "wishlist"
                      ? "bg-amber-600 text-white"
                      : "bg-neutral-100 dark:bg-neutral-800"
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
                      className="w-24 rounded-lg border border-black/10 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-neutral-950"
                    />
                  </div>
                </>
              ) : null}

              <div>
                <label className="mb-1 block text-sm text-neutral-500">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. great with 4 players"
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : `Add to ${status === "library" ? "Library" : "Wishlist"}`}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
