/**
 * @jest-environment node
 */
import { getZodiacSign, getZodiacEmoji, getZodiacSignEs } from "@/lib/zodiac";

describe("getZodiacSign", () => {
  const testCases: [string, number, number, string][] = [
    // [description, month (1-12), day, expected sign]
    // Aries: March 21 - April 19
    ["March 21 - Aries start", 3, 21, "Aries"],
    ["April 10 - Aries middle", 4, 10, "Aries"],
    ["April 19 - Aries end", 4, 19, "Aries"],

    // Taurus: April 20 - May 20
    ["April 20 - Taurus start", 4, 20, "Taurus"],
    ["May 10 - Taurus middle", 5, 10, "Taurus"],
    ["May 20 - Taurus end", 5, 20, "Taurus"],

    // Gemini: May 21 - June 20
    ["May 21 - Gemini start", 5, 21, "Gemini"],
    ["June 10 - Gemini middle", 6, 10, "Gemini"],
    ["June 20 - Gemini end", 6, 20, "Gemini"],

    // Cancer: June 21 - July 22
    ["June 21 - Cancer start", 6, 21, "Cancer"],
    ["July 10 - Cancer middle", 7, 10, "Cancer"],
    ["July 22 - Cancer end", 7, 22, "Cancer"],

    // Leo: July 23 - August 22
    ["July 23 - Leo start", 7, 23, "Leo"],
    ["August 10 - Leo middle", 8, 10, "Leo"],
    ["August 22 - Leo end", 8, 22, "Leo"],

    // Virgo: August 23 - September 22
    ["August 23 - Virgo start", 8, 23, "Virgo"],
    ["September 10 - Virgo middle", 9, 10, "Virgo"],
    ["September 22 - Virgo end", 9, 22, "Virgo"],

    // Libra: September 23 - October 22
    ["September 23 - Libra start", 9, 23, "Libra"],
    ["October 10 - Libra middle", 10, 10, "Libra"],
    ["October 22 - Libra end", 10, 22, "Libra"],

    // Scorpio: October 23 - November 21
    ["October 23 - Scorpio start", 10, 23, "Scorpio"],
    ["November 10 - Scorpio middle", 11, 10, "Scorpio"],
    ["November 21 - Scorpio end", 11, 21, "Scorpio"],

    // Sagittarius: November 22 - December 21
    ["November 22 - Sagittarius start", 11, 22, "Sagittarius"],
    ["December 10 - Sagittarius middle", 12, 10, "Sagittarius"],
    ["December 21 - Sagittarius end", 12, 21, "Sagittarius"],

    // Capricorn: December 22 - January 19
    ["December 22 - Capricorn start", 12, 22, "Capricorn"],
    ["January 10 - Capricorn middle", 1, 10, "Capricorn"],
    ["January 19 - Capricorn end", 1, 19, "Capricorn"],

    // Aquarius: January 20 - February 18
    ["January 20 - Aquarius start", 1, 20, "Aquarius"],
    ["February 10 - Aquarius middle", 2, 10, "Aquarius"],
    ["February 18 - Aquarius end", 2, 18, "Aquarius"],

    // Pisces: February 19 - March 20
    ["February 19 - Pisces start", 2, 19, "Pisces"],
    ["March 10 - Pisces middle", 3, 10, "Pisces"],
    ["March 20 - Pisces end", 3, 20, "Pisces"],
  ];

  test.each(testCases)("%s should return %s", (_, month, day, expected) => {
    // Month in Date is 0-indexed, but our test cases use 1-indexed
    const date = new Date(2000, month - 1, day);
    expect(getZodiacSign(date)).toBe(expected);
  });

  it("handles edge cases at sign boundaries", () => {
    // Day before Aries starts (March 20) should be Pisces
    expect(getZodiacSign(new Date(2000, 2, 20))).toBe("Pisces");

    // Day after Pisces ends (March 21) should be Aries
    expect(getZodiacSign(new Date(2000, 2, 21))).toBe("Aries");
  });

  it("handles year transition (Capricorn spans December-January)", () => {
    expect(getZodiacSign(new Date(2000, 11, 31))).toBe("Capricorn"); // Dec 31
    expect(getZodiacSign(new Date(2001, 0, 1))).toBe("Capricorn");   // Jan 1
  });
});

describe("getZodiacEmoji", () => {
  const emojiMap: [string, string][] = [
    ["Aries", "♈"],
    ["Taurus", "♉"],
    ["Gemini", "♊"],
    ["Cancer", "♋"],
    ["Leo", "♌"],
    ["Virgo", "♍"],
    ["Libra", "♎"],
    ["Scorpio", "♏"],
    ["Sagittarius", "♐"],
    ["Capricorn", "♑"],
    ["Aquarius", "♒"],
    ["Pisces", "♓"],
  ];

  test.each(emojiMap)("%s returns %s", (sign, emoji) => {
    expect(getZodiacEmoji(sign)).toBe(emoji);
  });

  it("returns fallback for unknown sign", () => {
    expect(getZodiacEmoji("Unknown")).toBe("⭐");
    expect(getZodiacEmoji("")).toBe("⭐");
  });
});

describe("getZodiacSignEs", () => {
  const translations: [string, string][] = [
    ["Aries", "Aries"],
    ["Taurus", "Tauro"],
    ["Gemini", "Géminis"],
    ["Cancer", "Cáncer"],
    ["Leo", "Leo"],
    ["Virgo", "Virgo"],
    ["Libra", "Libra"],
    ["Scorpio", "Escorpio"],
    ["Sagittarius", "Sagitario"],
    ["Capricorn", "Capricornio"],
    ["Aquarius", "Acuario"],
    ["Pisces", "Piscis"],
  ];

  test.each(translations)("%s translates to %s", (english, spanish) => {
    expect(getZodiacSignEs(english)).toBe(spanish);
  });

  it("returns original for unknown sign", () => {
    expect(getZodiacSignEs("Unknown")).toBe("Unknown");
  });
});
