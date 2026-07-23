import type { Astrologer } from "./astrologers";

/**
 * Filters the astrologer list by a free-text query (matched against name and
 * specialty) and an optional exact specialty filter. Ported from the Android
 * app's AstrologerSearchFilter.kt.
 */
export function filterAstrologers<T extends Astrologer>(
  astrologers: T[],
  query: string,
  specialty: string | null
): T[] {
  const trimmedQuery = query.trim().toLowerCase();
  return astrologers.filter((astrologer) => {
    const matchesSpecialty = specialty === null || astrologer.specialty === specialty;
    const matchesQuery =
      trimmedQuery.length === 0 ||
      astrologer.name.toLowerCase().includes(trimmedQuery) ||
      astrologer.specialty.toLowerCase().includes(trimmedQuery);
    return matchesSpecialty && matchesQuery;
  });
}
