"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db, type GameTag } from "@/lib/db";
import type { BggGameDetails, BggSearchResult } from "@/lib/bgg";
import StarRating from "@/components/StarRating";
import TagToggle from "@/components/TagToggle";

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
  const [existing, setExisting] = useState<{ id: number; tags: GameTag[] } | null>(null);

  const [tags, setTags] = useState<GameTag[]>(["played"]);
  const [rating, setRating] = useState(0);
  const [legacyPlayCount, setLegacyPlayCount] = useState(1);
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
        setExisting({ id: found.id!, tags: found.tags });
      }
      const res = await fetch(`/api/bgg/thing?id=${result.id}`);
      const details: BggGameDetails = await res.json();
      setSelected(details);
      setTags(["played"]);
      setRating(0);
      setLegacyPlayCount(1);
      setNotes("");
    } finally {
      setLoadingDetails(false);
    }
  }

  async function save() {
    if (!selected || tags.length === 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    const isPlayed = tags.includes("played");
    await db.games.add({
      bggId: selected.id,
      name: selected.name,
      yearPublished: selected.yearPublished,
      imageUrl: selected.imageUrl,
      thumbnailUrl: selected.thumbnailUrl,
      minPlayers: selected.minPlayers,
      maxPlayers: selected.maxPlayers,
      playingTime: selected.playingTime,
      description: selected.description,
      bggRating: selected.bggRating,
      tags,
      rating: isPlayed ? rating || undefined : undefined,
      legacyPlayCount: isPlayed ? legacyPlayCount : undefined,
      notes: notes.trim() || undefined,
      dateAdded: now,
      dateUpdated: now,
    });
    setSaving(false);
    router.push(tags.includes("wishlist") && !isPlayed ? "/wishlist" : "/");
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
              {selected.bggRating ? (
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  BGG rating: {selected.bggRating.toFixed(1)}
                </p>
              ) : null}
            </div>
          </div>

          {selected.description ? (
            <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">
              {selected.description}
            </p>
          ) : null}

          {existing ? (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Already added — tagged {existing.tags.join(", ") || "(no tags)"}.{" "}
              <button onClick={() => router.push(`/game/${existing.id}`)} className="underline">
                Edit it instead
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
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
                      className="w-24 rounded-lg border border-black/10 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-neutral-950"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Use &ldquo;Log a game&rdquo; afterwards to track dated sessions going forward.
                    </p>
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
                disabled={saving || tags.length === 0}
                className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : tags.length === 0 ? "Pick at least one tag" : "Add game"}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
