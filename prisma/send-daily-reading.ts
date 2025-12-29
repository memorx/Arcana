import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getZodiacEmoji(sign: string): string {
  const emojis: Record<string, string> = {
    Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
    Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
    Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓"
  };
  return emojis[sign] || "✨";
}

async function generateInterpretation(params: {
  cardName: string;
  cardNameEs: string;
  isReversed: boolean;
  zodiacSign: string;
  focusArea: string;
  userName: string;
  locale: string;
}): Promise<string> {
  const { cardName, isReversed, zodiacSign, focusArea, userName, locale } = params;
  const isSpanish = locale === "es";

  const prompt = isSpanish
    ? `Eres un lector de tarot sabio y compasivo. Genera una interpretación diaria breve para ${userName}, un ${zodiacSign}.
       La carta de hoy es: ${cardName}${isReversed ? " (Invertida)" : ""}.
       Área de enfoque: ${focusArea}.
       Escribe 2-3 párrafos cortos, cálidos y perspicaces. Sé específico pero esperanzador.`
    : `You are a wise and compassionate tarot reader. Generate a brief daily interpretation for ${userName}, a ${zodiacSign}.
       Today's card is: ${cardName}${isReversed ? " (Reversed)" : ""}.
       Focus area: ${focusArea}.
       Write 2-3 short, warm, and insightful paragraphs. Be specific but hopeful.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { text: string }).text;
}

async function main() {
  const email = "alxfetisova@gmail.com";

  console.log(`\nSending daily reading to: ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    console.log("User or profile not found");
    return;
  }

  const profile = user.profile;
  const locale = profile.locale || "en";
  const isSpanish = locale === "es";

  // Get all cards and pick a random one
  const allCards = await prisma.card.findMany();
  const selectedCard = allCards[Math.floor(Math.random() * allCards.length)];
  const isReversed = Math.random() < 0.3;

  console.log(`Card: ${selectedCard.name}${isReversed ? " (Reversed)" : ""}`);
  console.log(`Locale: ${locale}`);
  console.log(`Generating interpretation...`);

  const interpretation = await generateInterpretation({
    cardName: selectedCard.name,
    cardNameEs: selectedCard.nameEs,
    isReversed,
    zodiacSign: profile.zodiacSign,
    focusArea: profile.focusArea,
    userName: profile.fullName.split(" ")[0],
    locale,
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString(
    locale === "es" ? "es-ES" : "en-US",
    { weekday: "long", day: "numeric", month: "long" }
  );

  const displayCardName = isSpanish ? selectedCard.nameEs : selectedCard.name;
  const cardImageUrl = `https://www.readarcana.com${selectedCard.imageUrl}`;

  const subject = isSpanish
    ? `Tu carta del día: ${selectedCard.nameEs}`
    : `Your daily card: ${selectedCard.name}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #0f172a;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${displayCardName} - ${isSpanish ? "Tu carta del día te espera ✨" : "Your daily card awaits ✨"}
  </div>
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
              <div style="font-size: 32px; margin-bottom: 8px;">☀</div>
              <div style="color: #f59e0b; font-size: 24px; font-weight: bold; letter-spacing: 2px;">ARCANA</div>
              <p style="color: #94a3b8; font-size: 14px; margin: 10px 0 0;">
                ${isSpanish ? "Tu mensaje del universo para hoy" : "Your message from the universe today"}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px 10px; text-align: center;">
              <p style="color: #e2e8f0; font-size: 16px; margin: 0;">
                ${isSpanish ? `Hola ${profile.fullName.split(" ")[0]}` : `Hello ${profile.fullName.split(" ")[0]}`} ${getZodiacEmoji(profile.zodiacSign)}
              </p>
              <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">${dateStr}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center;">
              <div style="display: inline-block; padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                <img src="${cardImageUrl}" alt="${displayCardName}" style="max-width: 180px; height: auto; border-radius: 8px;" />
              </div>
              <h2 style="color: #a78bfa; font-size: 22px; margin: 20px 0 8px; font-weight: normal;">${displayCardName}</h2>
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px; letter-spacing: 1px;">
                ${selectedCard.keywords.slice(0, 3).join(" • ")}
              </p>
              ${isReversed ? `<div style="background: #dc2626; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; display: inline-block;">↺ ${isSpanish ? "INVERTIDA" : "REVERSED"}</div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px;">
              <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 25px; border-left: 3px solid #f59e0b;">
                <p style="color: #d1d5db; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-line;">${interpretation}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center;">
              <a href="https://www.readarcana.com/daily" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                ${isSpanish ? "Ver más en Arcana" : "See more in Arcana"}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; text-align: center; background: rgba(0, 0, 0, 0.2);">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 10px;">Arcana - AI Tarot Readings</p>
              <a href="https://www.readarcana.com/api/stripe/portal" style="color: #64748b; font-size: 11px; text-decoration: underline;">
                ${isSpanish ? "Gestionar suscripción" : "Manage subscription"}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  console.log(`Sending email...`);

  const result = await resend.emails.send({
    from: "Arcana <daily@readarcana.com>",
    to: email,
    subject,
    html,
  });

  if (result.error) {
    console.error("Error:", result.error);
  } else {
    console.log(`\n✓ Daily reading sent to ${email}`);
    console.log(`  Card: ${selectedCard.name}${isReversed ? " (Reversed)" : ""}`);
    console.log(`  Language: ${locale === "es" ? "Spanish" : "English"}\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
