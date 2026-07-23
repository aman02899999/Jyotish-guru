import { describe, expect, it } from "vitest";
import { generateReferralCode } from "./referral-code";

describe("generateReferralCode", () => {
  it("generates a code from an alphanumeric name", () => {
    expect(generateReferralCode("John Doe")).toBe("ADI-JOHNDOE");
  });

  it("strips punctuation, not just spaces", () => {
    expect(generateReferralCode("O'Brien")).toBe("ADI-OBRIEN");
  });

  it("falls back to SEEKER for null, blank, or punctuation-only names", () => {
    expect(generateReferralCode(null)).toBe("ADI-SEEKER");
    expect(generateReferralCode(undefined)).toBe("ADI-SEEKER");
    expect(generateReferralCode("")).toBe("ADI-SEEKER");
    expect(generateReferralCode("   ")).toBe("ADI-SEEKER");
    expect(generateReferralCode("!!!")).toBe("ADI-SEEKER");
  });
});
