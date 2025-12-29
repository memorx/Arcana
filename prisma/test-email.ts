import { Resend } from "resend";
import * as dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const to = "alxfetisova@gmail.com";

  console.log(`\nSending test email to: ${to}\n`);

  const result = await resend.emails.send({
    from: "Arcana <daily@readarcana.com>",
    to,
    subject: "Test - Verificando que los correos lleguen",
    html: `
      <div style="font-family: Georgia, serif; padding: 20px; background: #1e1b4b; color: white; border-radius: 12px;">
        <h1 style="color: #f59e0b;">Hola Alexandra!</h1>
        <p>Este es un correo de prueba para verificar que los emails de Arcana te lleguen correctamente.</p>
        <p style="color: #a78bfa;">Si recibes este mensaje, todo está funcionando bien.</p>
        <br>
        <p style="color: #64748b; font-size: 12px;">- Arcana</p>
      </div>
    `,
  });

  console.log("Result:", result);
  console.log("\n✓ Email sent successfully!\n");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
