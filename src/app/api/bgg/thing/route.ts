import { NextRequest, NextResponse } from "next/server";
import { BGG_FETCH_HEADERS, GEEKDO_ITEMS_URL, type BggGameDetails } from "@/lib/bgg";

interface GeekdoItem {
  objectid: string;
  name: string;
  yearpublished?: string | number;
  minplayers?: string | number;
  maxplayers?: string | number;
  minplaytime?: string | number;
  maxplaytime?: string | number;
  images?: {
    original?: string;
    square200?: string;
    thumb?: string;
  };
}

function toNumber(v: string | number | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const url = `${GEEKDO_ITEMS_URL}?nosession=1&objecttype=boardgame&objectid=${encodeURIComponent(id)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: BGG_FETCH_HEADERS });
  } catch (err) {
    console.error("BGG thing request failed", err);
    return NextResponse.json({ error: "Couldn't reach BoardGameGeek." }, { status: 502 });
  }

  if (!res.ok) {
    console.error("BGG thing returned", res.status, await res.text());
    return NextResponse.json(
      { error: `BoardGameGeek lookup failed (${res.status}).` },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { item?: GeekdoItem };
  const item = data.item;

  if (!item) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const details: BggGameDetails = {
    id: Number(item.objectid),
    name: item.name,
    yearPublished: toNumber(item.yearpublished),
    imageUrl: item.images?.original,
    thumbnailUrl: item.images?.square200 ?? item.images?.thumb,
    minPlayers: toNumber(item.minplayers),
    maxPlayers: toNumber(item.maxplayers),
    playingTime: toNumber(item.maxplaytime) ?? toNumber(item.minplaytime),
  };

  return NextResponse.json(details);
}
