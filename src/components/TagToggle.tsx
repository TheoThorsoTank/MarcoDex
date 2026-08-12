"use client";

import type { GameTag } from "@/lib/db";

const TAG_LABELS: Record<GameTag, string> = {
  owned: "Owned",
  wishlist: "Wishlist",
  played: "Played",
};

const ALL_TAGS: GameTag[] = ["owned", "wishlist", "played"];

export default function TagToggle({
  value,
  onChange,
}: {
  value: GameTag[];
  onChange: (tags: GameTag[]) => void;
}) {
  function toggle(tag: GameTag) {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  }

  return (
    <div className="flex gap-2">
      {ALL_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            value.includes(tag)
              ? "bg-amber-600 text-white"
              : "bg-neutral-100 dark:bg-neutral-800"
          }`}
        >
          {TAG_LABELS[tag]}
        </button>
      ))}
    </div>
  );
}
