/**
 * @jest-environment node
 */
const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

import { sendDailyReadingEmail } from "@/lib/email";

type SentEmail = { from: string; to: string; subject: string; html: string };

const baseParams = {
  to: "ana@example.com",
  userName: "Ana",
  cardName: "The Sun",
  cardNameEs: "El Sol",
  cardImage: "https://upload.wikimedia.org/sun.jpg",
  isReversed: false,
  interpretation: "Buenos días, Ana.",
  date: "miércoles, 4 de noviembre",
  locale: "es",
  zodiacSign: "Leo",
  keywords: ["alegría", "éxito", "vitalidad"],
};

const dayContext = [
  "Tonalli del día (tradición mexica): 13 Miquiztli · 13 Muerte, trecena Ce Océlotl. La transformación y los ancestros.",
  "Fase lunar: Luna menguante, 28% de iluminación. Descansa y escucha.",
  "Día personal 2: cooperación, sensibilidad, diplomacia.",
].join("\n");

async function send(extra: Record<string, unknown> = {}): Promise<SentEmail> {
  await sendDailyReadingEmail({ ...baseParams, ...extra });
  expect(mockSend).toHaveBeenCalledTimes(1);
  return mockSend.mock.calls[0][0] as SentEmail;
}

describe("sendDailyReadingEmail", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  it("keeps working for callers that don't pass the new fields", async () => {
    const email = await send();

    expect(email.to).toBe("ana@example.com");
    expect(email.subject).toBe("Tu carta del día: El Sol");
    expect(email.html).toContain("El Sol");
    expect(email.html).not.toContain("Energías del día");
    expect(email.html).not.toContain("Feliz cumpleaños");
  });

  it("shows the day energies under the card, one line each", async () => {
    const email = await send({ dayContext });

    expect(email.html).toContain("Energías del día");
    expect(email.html).toContain("13 Miquiztli · 13 Muerte, trecena Ce Océlotl.");
    expect(email.html).toContain("Fase lunar: Luna menguante, 28% de iluminación.");
    expect(email.html).toContain("Día personal 2: cooperación, sensibilidad, diplomacia.");
    // Under the card, before the interpretation
    const energies = email.html.indexOf("Energías del día");
    expect(energies).toBeGreaterThan(email.html.indexOf("<!-- Card -->"));
    expect(energies).toBeLessThan(email.html.indexOf("<!-- Interpretation -->"));
  });

  it("uses English labels in English", async () => {
    const email = await send({ locale: "en", dayContext: "Moon phase: Full Moon, 100% illuminated." });

    expect(email.html).toContain("Today's energies");
    expect(email.html).toContain("Moon phase: Full Moon, 100% illuminated.");
  });

  it("escapes the energies text", async () => {
    const email = await send({ dayContext: "<script>alert(1)</script> & co" });

    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; co");
  });

  it("ignores an empty day context", async () => {
    const email = await send({ dayContext: "  \n " });

    expect(email.html).not.toContain("Energías del día");
  });

  it("greets on the birthday, in the subject and with the gift", async () => {
    const email = await send({ isBirthday: true, birthdayGiftCredits: 3 });

    expect(email.subject).toBe("¡Feliz cumpleaños, Ana! Tu carta del día: El Sol");
    expect(email.html).toContain("¡Feliz cumpleaños, Ana!");
    expect(email.html).toContain("Te dejamos 3 créditos de regalo en tu cuenta.");
    // The greeting goes before the card
    expect(email.html.indexOf("<!-- Birthday -->")).toBeLessThan(email.html.indexOf("<!-- Card -->"));
  });

  it("greets without promising credits when the gift could not be confirmed", async () => {
    const email = await send({ isBirthday: true });

    expect(email.html).toContain("¡Feliz cumpleaños, Ana!");
    expect(email.html).not.toContain("créditos de regalo");
  });

  it("greets in English", async () => {
    const email = await send({ locale: "en", isBirthday: true, birthdayGiftCredits: 3 });

    expect(email.subject).toBe("Happy birthday, Ana! Your daily card: The Sun");
    expect(email.html).toContain("We've left 3 gift credits in your account.");
  });

  it("escapes the name, the card, the keywords and the interpretation", async () => {
    const email = await send({
      userName: "Ana <img src=x>",
      cardNameEs: "El <b>Sol</b>",
      keywords: ["<i>alegría</i>", "éxito"],
      interpretation: "Línea uno <script>x</script>\nLínea dos & más",
    });

    expect(email.html).not.toMatch(/<img src=x>|<b>Sol<\/b>|<i>alegría<\/i>|<script>x<\/script>/);
    expect(email.html).toContain("Hola Ana &lt;img src=x&gt;");
    expect(email.html).toContain("El &lt;b&gt;Sol&lt;/b&gt;");
    expect(email.html).toContain(`alt="El &lt;b&gt;Sol&lt;/b&gt;"`);
    expect(email.html).toContain("&lt;i&gt;alegría&lt;/i&gt; • éxito");
    // Line breaks stay as they were (the paragraph uses white-space: pre-line)
    expect(email.html).toContain("Línea uno &lt;script&gt;x&lt;/script&gt;\nLínea dos &amp; más");
  });

  it("treats any language other than English as Spanish", async () => {
    const email = await send({ locale: "fr", dayContext: "Fase lunar: Luna llena." });

    expect(email.subject).toBe("Tu carta del día: El Sol");
    expect(email.html).toContain("Energías del día");
  });

  it("escapes the name in the birthday greeting and the title", async () => {
    const email = await send({ userName: "<b>Ana</b>", isBirthday: true });

    expect(email.html).toContain("¡Feliz cumpleaños, &lt;b&gt;Ana&lt;/b&gt;!");
    expect(email.html).toContain("<title>¡Feliz cumpleaños, &lt;b&gt;Ana&lt;/b&gt;!");
  });
});
