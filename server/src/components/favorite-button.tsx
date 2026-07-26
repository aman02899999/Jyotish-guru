"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nested inside an <a> on the astrologer card, so click must be stopped
 * from reaching the anchor's default navigation - Next.js Link checks
 * event.defaultPrevented before it calls router.push.
 */
export function FavoriteButton({
  astrologerId,
  initialFavorited,
  className,
}: {
  astrologerId: number;
  initialFavorited: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const next = !favorited;
    setFavorited(next);
    setPending(true);
    try {
      const response = await fetch(`/api/astrologers/${astrologerId}/favorite`, { method: "POST" });
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      setFavorited(data.favorited);
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-saffron/30 bg-paper/90 transition-colors hover:border-saffron disabled:opacity-60",
        className
      )}
    >
      <Heart className={cn("h-3.5 w-3.5 transition-colors", favorited ? "fill-saffron text-saffron" : "text-clay")} />
    </button>
  );
}
