import { Resend } from "resend";

// Lazy initialize to avoid build-time errors when API key is not set
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface DailyReadingEmailParams {
  to: string;
  userName: string;
  cardName: string;
  cardNameEs: string;
  cardImage: string;
  isReversed: boolean;
  interpretation: string;
  date: string;
  locale: string;
}

export async function sendDailyReadingEmail(params: DailyReadingEmailParams) {
  const {
    to,
    userName,
    cardName,
    cardNameEs,
    cardImage,
    isReversed,
    interpretation,
    date,
    locale,
  } = params;

  const isSpanish = locale === "es";

  const subject = isSpanish
    ? `Tu carta del dia: ${cardNameEs}`
    : `Your daily card: ${cardName}`;

  const displayCardName = isSpanish ? cardNameEs : cardName;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
              <div style="font-size: 32px; margin-bottom: 8px;">&#9788;</div>
              <div style="color: #f59e0b; font-size: 24px; font-weight: bold; letter-spacing: 2px;">ARCANA</div>
              <p style="color: #94a3b8; font-size: 14px; margin: 10px 0 0;">
                ${isSpanish ? "Tu mensaje del universo para hoy" : "Your message from the universe today"}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 25px 30px 10px; text-align: center;">
              <p style="color: #e2e8f0; font-size: 16px; margin: 0;">
                ${isSpanish ? `Hola ${userName},` : `Hello ${userName},`}
              </p>
              <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">
                ${date}
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="padding: 20px 30px; text-align: center;">
              <div style="display: inline-block; padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                <img
                  src="${cardImage}"
                  alt="${displayCardName}"
                  style="max-width: 180px; height: auto; border-radius: 8px; ${isReversed ? "transform: rotate(180deg);" : ""}"
                />
              </div>
              <h2 style="color: #a78bfa; font-size: 22px; margin: 20px 0 8px; font-weight: normal;">
                ${displayCardName}
              </h2>
              ${
                isReversed
                  ? `<span style="display: inline-block; background: #7c3aed; color: white; padding: 4px 16px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                      ${isSpanish ? "Invertida" : "Reversed"}
                     </span>`
                  : ""
              }
            </td>
          </tr>

          <!-- Interpretation -->
          <tr>
            <td style="padding: 20px 30px;">
              <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 25px; border-left: 3px solid #f59e0b;">
                <p style="color: #d1d5db; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-line;">
                  ${interpretation}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 20px 30px; text-align: center;">
              <a href="https://www.readarcana.com/daily"
                 style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                ${isSpanish ? "Ver mas en Arcana" : "See more in Arcana"}
              </a>
            </td>
          </tr>

          <!-- Upsell -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(139, 92, 246, 0.2);">
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 12px;">
                ${isSpanish ? "Quieres una lectura mas profunda?" : "Want a deeper reading?"}
              </p>
              <a href="https://www.readarcana.com/reading/new"
                 style="color: #a78bfa; font-size: 14px; text-decoration: none;">
                ${isSpanish ? "Hacer una lectura completa" : "Get a complete reading"} &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; text-align: center; background: rgba(0, 0, 0, 0.2);">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 10px;">
                Arcana - AI Tarot Readings
              </p>
              <a href="https://www.readarcana.com/subscribe"
                 style="color: #64748b; font-size: 11px; text-decoration: underline;">
                ${isSpanish ? "Gestionar suscripcion" : "Manage subscription"}
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

  const result = await getResend().emails.send({
    from: "Arcana <daily@readarcana.com>",
    to,
    subject,
    html,
  });

  return result;
}
