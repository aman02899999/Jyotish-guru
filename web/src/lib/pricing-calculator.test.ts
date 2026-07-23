import { describe, expect, it } from "vitest";
import { getConsultationPrice } from "./pricing-calculator";

describe("getConsultationPrice", () => {
  it("Gold tier is always free", () => {
    expect(getConsultationPrice(2, 199, "Mahadasha Gold")).toBe(0);
    expect(getConsultationPrice(9, 39, "Mahadasha Gold")).toBe(0);
  });

  it("Silver tier waives price for its bundled astrologers", () => {
    for (const id of [1, 3, 4, 6, 7]) {
      expect(getConsultationPrice(id, 100, "Rashifal Silver")).toBe(0);
    }
  });

  it("Silver tier applies a 25% discount to other astrologers", () => {
    expect(getConsultationPrice(5, 100, "Rashifal Silver")).toBe(75);
    expect(getConsultationPrice(2, 199, "Rashifal Silver")).toBe(149);
  });

  it("Bronze tier waives price for its bundled astrologers", () => {
    for (const id of [1, 3, 6]) {
      expect(getConsultationPrice(id, 100, "Nakshatra Bronze")).toBe(0);
    }
  });

  it("Bronze tier applies a 10% discount to other astrologers", () => {
    expect(getConsultationPrice(5, 100, "Nakshatra Bronze")).toBe(90);
    expect(getConsultationPrice(2, 199, "Nakshatra Bronze")).toBe(179);
  });

  it("Free tier always charges the full base price", () => {
    expect(getConsultationPrice(2, 199, "Free")).toBe(199);
    expect(getConsultationPrice(1, 49, "Free")).toBe(49);
  });
});
