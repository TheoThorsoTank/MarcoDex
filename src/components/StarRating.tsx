"use client";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

export default function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const editable = Boolean(onChange);
  const textSize = size === "sm" ? "text-sm" : "text-2xl";

  return (
    <div className={`flex gap-0.5 ${textSize}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!editable}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={`leading-none ${editable ? "cursor-pointer" : "cursor-default"} ${
            star <= value ? "text-amber-500" : "text-neutral-300 dark:text-neutral-700"
          }`}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
