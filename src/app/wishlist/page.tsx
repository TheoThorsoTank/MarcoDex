"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db } from "@/lib/db";
import WishlistRow from "@/components/WishlistRow";

export default function WishlistPage() {
  const games = useLiveQuery(
    () => db.games.where("status").equals("wishlist").reverse().sortBy("dateAdded"),
    []
  );

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-semibold">Wishlist</h1>

      {games && games.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-neutral-500 dark:text-neutral-400">
          <span className="text-4xl">⭐</span>
          <p>No games on your wishlist yet.</p>
          <Link href="/add" className="text-amber-600 underline dark:text-amber-400">
            Search for a game to add
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {games?.map((game) => (
            <WishlistRow key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
