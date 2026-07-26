package com.example.data

import org.junit.Assert.assertEquals
import org.junit.Test

class ReferralCodeGeneratorTest {

    @Test
    fun generatesCodeFromAlphanumericName() {
        assertEquals("ADI-JOHNDOE", ReferralCodeGenerator.generate("John Doe"))
    }

    @Test
    fun stripsPunctuationNotJustSpaces() {
        assertEquals("ADI-OBRIEN", ReferralCodeGenerator.generate("O'Brien"))
    }

    @Test
    fun fallsBackToSeekerForNullOrBlankOrPunctuationOnlyNames() {
        assertEquals("ADI-SEEKER", ReferralCodeGenerator.generate(null))
        assertEquals("ADI-SEEKER", ReferralCodeGenerator.generate(""))
        assertEquals("ADI-SEEKER", ReferralCodeGenerator.generate("   "))
        assertEquals("ADI-SEEKER", ReferralCodeGenerator.generate("!!!"))
    }
}
