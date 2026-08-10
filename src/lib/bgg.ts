export const BGG_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// BGG's own site frontend calls this endpoint (not the official, Cloudflare-blocked
// xmlapi2) for both search and item lookups. Undocumented but reachable server-side.
export const GEEKDO_ITEMS_URL = "https://api.geekdo.com/api/geekitems";

export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished?: number;
}

export interface BggGameDetails {
  id: number;
  name: string;
  yearPublished?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playingTime?: number;
}
