import { NextRequest, NextResponse } from "next/server";
import { BGG_FETCH_HEADERS, GEEKDO_ITEMS_URL, type BggSearchResult } from "@/lib/bgg";

interface GeekdoSearchItem {
  objectid: string;
  objecttype: string;
  name: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const url = `${GEEKDO_ITEMS_URL}?nosession=1&objecttype=boardgame&search=${encodeURIComponent(q)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: BGG_FETCH_HEADERS });
  } catch (err) {
    console.error("BGG search request failed", err);
    return NextResponse.json({ error: "Couldn't reach BoardGameGeek." }, { status: 502 });
  }

  if (!res.ok) {
    console.error("BGG search returned", res.status, await res.text());
    return NextResponse.json(
      { error: `BoardGameGeek search failed (${res.status}).` },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { items?: GeekdoSearchItem[] };
  const items = data.items ?? [];
  const needle = q.toLowerCase();

  // This endpoint has no subtype filter, so expansions/accessories/organizers all
  // come back mixed in with base games. Rank closer name matches first so the
  // actual game the user is looking for tends to surface near the top.
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === needle) return 0;
    if (lower.startsWith(needle)) return 1;
    if (lower.includes(needle)) return 2;
    return 3;
  };

  const seen = new Set<number>();
  const results: BggSearchResult[] = items
    .filter((item) => item.objecttype === "thing")
    .map((item) => ({ id: Number(item.objectid), name: item.name }))
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.length - b.name.length)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .slice(0, 20);

  return NextResponse.json({ results });
}
