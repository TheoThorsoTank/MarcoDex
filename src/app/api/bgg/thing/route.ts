import { NextRequest, NextResponse } from "next/server";
import { bggFetch, BggAuthError } from "@/lib/bggClient";
import type { BggGameDetails } from "@/lib/bgg";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface ParsedNameField {
  "@_type"?: string;
  "@_value"?: string;
}

interface ParsedThingItem {
  "@_id"?: string;
  name?: ParsedNameField | ParsedNameField[];
  image?: string;
  thumbnail?: string;
  description?: string;
  yearpublished?: { "@_value"?: string };
  minplayers?: { "@_value"?: string };
  maxplayers?: { "@_value"?: string };
  playingtime?: { "@_value"?: string };
  statistics?: { ratings?: { average?: { "@_value"?: string } } };
}

interface ParsedThingResponse {
  items?: { item?: ParsedThingItem | ParsedThingItem[] };
}

function num(field: { "@_value"?: string } | undefined): number | undefined {
  const n = Number(field?.["@_value"]);
  return Number.isFinite(n) && field?.["@_value"] !== undefined ? n : undefined;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let parsed: ParsedThingResponse;
  try {
    parsed = (await bggFetch(`/thing?id=${encodeURIComponent(id)}&stats=1`)) as ParsedThingResponse;
  } catch (err) {
    if (err instanceof BggAuthError) {
      console.error("BGG auth error", err.message);
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("BGG thing request failed", err);
    return NextResponse.json({ error: "BoardGameGeek lookup failed." }, { status: 502 });
  }

  const item = asArray(parsed.items?.item)[0];
  if (!item) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const names = asArray(item.name);
  const primaryName = names.find((n) => n["@_type"] === "primary") ?? names[0];

  const bggRatingRaw = num(item.statistics?.ratings?.average);

  const details: BggGameDetails = {
    id: Number(item["@_id"]),
    name: primaryName?.["@_value"] ?? "Unknown",
    yearPublished: num(item.yearpublished),
    imageUrl: item.image,
    thumbnailUrl: item.thumbnail,
    minPlayers: num(item.minplayers),
    maxPlayers: num(item.maxplayers),
    playingTime: num(item.playingtime),
    description: item.description?.trim() || undefined,
    // BGG's average rating is 0 before enough ratings exist — not meaningful yet.
    bggRating: bggRatingRaw && bggRatingRaw > 0 ? bggRatingRaw : undefined,
  };

  return NextResponse.json(details);
}
