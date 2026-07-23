"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AstrologerCard } from "@/components/astrologer-card";
import { filterAstrologers } from "@/lib/astrologer-search-filter";
import type { AstrologerWithStats } from "@/lib/astrologer-stats";
import { cn } from "@/lib/utils";

export function AstrologerBrowser({ astrologers }: { astrologers: AstrologerWithStats[] }) {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);

  const specialties = useMemo(
    () => Array.from(new Set(astrologers.map((a) => a.specialty))).sort(),
    [astrologers]
  );

  const filtered = useMemo(
    () => filterAstrologers(astrologers, query, specialty),
    [astrologers, query, specialty]
  );

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-celestial-gold" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search astrologers or specialties..."
          className="pl-11 pr-11"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-space-lavender hover:text-galactic-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSpecialty(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-bold",
            specialty === null
              ? "border-celestial-gold bg-celestial-gold text-deep-midnight"
              : "border-space-lavender/30 text-space-lavender hover:border-celestial-gold/50"
          )}
        >
          All
        </button>
        {specialties.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpecialty(specialty === s ? null : s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold",
              specialty === s
                ? "border-celestial-gold bg-celestial-gold text-deep-midnight"
                : "border-space-lavender/30 text-space-lavender hover:border-celestial-gold/50"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-space-lavender">No astrologers match your search.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((astrologer) => (
            <AstrologerCard key={astrologer.id} astrologer={astrologer} />
          ))}
        </div>
      )}
    </div>
  );
}
