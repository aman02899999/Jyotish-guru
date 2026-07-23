package com.example.data

/**
 * Filters the astrologer list by a free-text query (matched against name and
 * specialty) and an optional exact specialty filter, extracted out of the
 * Composable so the matching rules are unit testable.
 */
object AstrologerSearchFilter {
    fun apply(astrologers: List<Astrologer>, query: String, specialty: String?): List<Astrologer> {
        return astrologers.filter { astrologer ->
            val matchesSpecialty = specialty == null || astrologer.specialty == specialty
            val matchesQuery = query.isBlank() ||
                astrologer.name.contains(query, ignoreCase = true) ||
                astrologer.specialty.contains(query, ignoreCase = true)
            matchesSpecialty && matchesQuery
        }
    }
}
