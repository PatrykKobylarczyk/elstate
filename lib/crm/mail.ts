import "server-only";

// Wysyłka maili z CRM (na razie: kody logowania). Dwie drogi, wystarczy jedna:
// - RESEND_API_KEY: usługa Resend (resend.com), domena elstate.pl zweryfikowana w Resend;
// - SMTP_URL: zwykła skrzynka, np. smtps://crm%40elstate.pl:HASLO@serwer.home.pl:465
// Nadawca: MAIL_FROM, np. "Elstate CRM <crm@elstate.pl>".
// Do testów lokalnych: ELSTATE_MAIL_LOG=1 wypisuje maile w konsoli serwera zamiast je wysyłać.

const from = () => process.env.MAIL_FROM || "Elstate CRM <crm@elstate.pl>";

export const mailReady = () => Boolean(process.env.RESEND_API_KEY || process.env.SMTP_URL || process.env.ELSTATE_MAIL_LOG);

export async function sendMail(to: string, subject: string, text: string, html: string) {
  if (process.env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to: [to], subject, text, html }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (process.env.SMTP_URL) {
    const nodemailer = await import("nodemailer");
    await nodemailer.createTransport(process.env.SMTP_URL).sendMail({ from: from(), to, subject, text, html });
    return;
  }
  if (process.env.ELSTATE_MAIL_LOG) {
    console.log(`[mail] do: ${to} | ${subject}\n${text}`);
    return;
  }
  throw new Error("Wysyłka maili nie jest skonfigurowana.");
}

export function codeMail(name: string, code: string) {
  const text = `Cześć ${name},\n\nTwój kod logowania do CRM Elstate: ${code}\n\nKod jest ważny 10 minut. Jeśli to nie Ty się logujesz, zmień hasło i daj znać wspólnikowi.`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;background:#F9F5EF;padding:32px">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;color:#2A2A2D">
    <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#C19A5B">elstate<span style="color:#320920">.</span></p>
    <p style="margin:0 0 8px">Cześć ${name.replace(/[<>&"]/g, "")},</p>
    <p style="margin:0 0 20px">Twój kod logowania do CRM:</p>
    <p style="margin:0 0 20px;font-size:34px;letter-spacing:8px;font-weight:700;color:#320920">${code}</p>
    <p style="margin:0;font-size:13px;color:#777">Kod jest ważny 10 minut. Jeśli to nie Ty się logujesz, zmień hasło.</p>
  </div></div>`;
  return { subject: `${code} to Twój kod do CRM Elstate`, text, html };
}
