import { NextRequest, NextResponse } from "next/server";
import { bggFetch, BggAuthError } from "@/lib/bggClient";
import type { BggSearchResult } from "@/lib/bgg";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface ParsedNameField {
  "@_value"?: string;
}

interface ParsedSearchItem {
  "@_id"?: string;
  name?: ParsedNameField | ParsedNameField[];
  yearpublished?: { "@_value"?: string };
}

interface ParsedSearchResponse {
  items?: { item?: ParsedSearchItem | ParsedSearchItem[] };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  let parsed: ParsedSearchResponse;
  try {
    parsed = (await bggFetch(
      `/search?type=boardgame&query=${encodeURIComponent(q)}`
    )) as ParsedSearchResponse;
  } catch (err) {
    if (err instanceof BggAuthError) {
      console.error("BGG auth error", err.message);
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("BGG search request failed", err);
    return NextResponse.json({ error: "BoardGameGeek search failed." }, { status: 502 });
  }

  const items = asArray(parsed.items?.item);
  const mapped: BggSearchResult[] = items.map((item) => {
    const names = asArray(item.name);
    return {
      id: Number(item["@_id"]),
      name: names[0]?.["@_value"] ?? "Unknown",
      yearPublished: item.yearpublished?.["@_value"]
        ? Number(item.yearpublished["@_value"])
        : undefined,
    };
  });

  const needle = q.toLowerCase();
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === needle) return 0;
    if (lower.startsWith(needle)) return 1;
    if (lower.includes(needle)) return 2;
    return 3;
  };

  const seen = new Set<number>();
  const results = mapped
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.length - b.name.length)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .slice(0, 20);

  return NextResponse.json({ results });
}
