// Server-only. BGG's XML API requires a registered application + bearer token
// (see https://boardgamegeek.com/wiki/page/Using_the_XML_API) and does not send
// CORS headers, so this must run behind our own API routes (app/api/bgg/*) —
// never call this from a client component.

import { XMLParser } from "fast-xml-parser";

const BGG_ROOT = "https://boardgamegeek.com/xmlapi2";
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BggAuthError extends Error {}

// BGG throttles aggressively (500/503 when hit too fast — docs suggest ~5s
// spacing between requests) and returns 202 while a request is queued.
// Retry both cases with backoff instead of failing immediately.
export async function bggFetch(path: string, retries = 3): Promise<unknown> {
  const token = process.env.BGG_API_TOKEN;
  if (!token) {
    throw new BggAuthError(
      "BGG_API_TOKEN is not configured. Add it to .env.local (see .env.local.example)."
    );
  }

  const res = await fetch(`${BGG_ROOT}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new BggAuthError(`BGG rejected the request (${res.status}) — check BGG_API_TOKEN.`);
  }

  if (res.status === 202) {
    if (retries <= 0) throw new Error("BGG request still queued after retries");
    await sleep(2000);
    return bggFetch(path, retries - 1);
  }

  if (res.status === 500 || res.status === 503) {
    if (retries <= 0) throw new Error(`BGG returned ${res.status} after retries`);
    await sleep(5000);
    return bggFetch(path, retries - 1);
  }

  if (!res.ok) {
    throw new Error(`BGG request failed: ${res.status}`);
  }

  const xml = await res.text();
  return parser.parse(xml);
}
