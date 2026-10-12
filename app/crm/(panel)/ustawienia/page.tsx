import type { Metadata } from "next";
import { headers } from "next/headers";
import { asc, desc, eq } from "drizzle-orm";
import { NotifyButton } from "@/components/crm/LeadPing";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Badge, Field, PageHead, btnGhost, card, input, when } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { auditLabels } from "@/lib/crm/labels";
import { audit, users } from "@/lib/crm/schema";
import { storageReady } from "@/lib/crm/storage";
import { changePassword } from "../../auth-actions";
import { mailReady } from "@/lib/crm/mail";
import { createUser, importNbot, resetUser2fa, toggleEmailOtp, toggleUser } from "../actions";

export const metadata: Metadata = { title: "Ustawienia" };

const script = (url: string, key: string) => `// Elstate CRM: przesyłanie maili z nbot (Google Apps Script, uruchamiany co 5 minut)
var URL = "${url}";
var KEY = "${key}";

function przeslijNbot() {
  var props = PropertiesService.getScriptProperties();
  var since = Number(props.getProperty("since") || 0);
  var newest = since, failed = false;
  GmailApp.search("label:nbot newer_than:2d", 0, 50).forEach(function (t) {
    t.getMessages().forEach(function (m) {
      var ts = m.getDate().getTime();
      if (ts <= since) return;
      var r = UrlFetchApp.fetch(URL, {
        method: "post",
        contentType: "application/json",
        headers: { "x-elstate-key": KEY },
        payload: JSON.stringify({ subject: m.getSubject(), from: m.getFrom(), html: m.getBody(), text: m.getPlainBody() }),
        muteHttpExceptions: true,
      });
      if (r.getResponseCode() === 200) newest = Math.max(newest, ts);
      else failed = true;
    });
  });
  if (!failed) props.setProperty("since", String(newest));
}`;

export default async function Ustawienia() {
  const me = await requireUser();
  const d = await db();
  const [team, log] = await Promise.all([
    d.select().from(users).orderBy(asc(users.id)),
    d.select({ a: audit, who: users.name }).from(audit).leftJoin(users, eq(users.id, audit.userId)).orderBy(desc(audit.createdAt)).limit(40),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const inbound = process.env.CRM_INBOUND_KEY;

  return (
    <>
      <PageHead title="Ustawienia" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section id="nbot" className={`${card} lg:col-span-2`}>
          <h2 className="font-display text-xl text-plum-900">nbot → CRM</h2>
          <p className="mt-1 max-w-3xl text-sm text-graphite/60">
            Każde nowe ogłoszenie z alertów nbot trafia do „Do kontaktu”. Można wkleić mail ręcznie albo ustawić automat w Gmailu, który przesyła alerty co 5 minut.
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <ActionForm action={importNbot} resetOnOk className="flex flex-col gap-3">
              <Field label="Temat maila (opcjonalnie)">
                <input name="subject" className={input} />
              </Field>
              <Field label="Treść maila z nbot" hint="W Gmailu: otwórz mail → zaznacz całość → skopiuj → wklej tutaj.">
                <textarea name="mail" rows={7} required className={input} />
              </Field>
              <div>
                <Submit pending="Czytam…">Dodaj ogłoszenia</Submit>
              </div>
            </ActionForm>
            <div className="text-sm">
              <p className="font-semibold">Automat w Gmailu</p>
              {inbound ? (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-graphite/70">
                  <li>W Gmailu utwórz filtr na maile od nbot i ustaw im etykietę <b>nbot</b>.</li>
                  <li>Wejdź na script.google.com → Nowy projekt, wklej kod poniżej, zapisz.</li>
                  <li>Wyzwalacze (ikona zegara) → Dodaj → funkcja przeslijNbot, zegar, co 5 minut. Zezwól na dostęp do Gmaila.</li>
                </ol>
              ) : (
                <p className="mt-2 text-graphite/70">Najpierw dodaj w Vercelu zmienną <code>CRM_INBOUND_KEY</code> (losowy ciąg, min. 24 znaki) i wdróż stronę ponownie. Wtedy pojawi się tu gotowy kod.</p>
              )}
              {inbound && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold text-plum-900">Pokaż kod skryptu (zawiera klucz, nie udostępniaj)</summary>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-graphite p-4 text-xs leading-relaxed text-pearl">{script(`${origin}/api/crm/nbot`, inbound)}</pre>
                </details>
              )}
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-4 font-display text-xl text-plum-900">Zespół</h2>
          <ul className="divide-y divide-graphite/8">
            {team.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{u.name} {u.id === me.id && <span className="text-graphite/45">(Ty)</span>}</span>
                  <span className="block truncate text-sm text-graphite/55">{u.email}</span>
                </span>
                {!u.active ? <Badge tone="red">wyłączone</Badge> : !u.totpEnabled ? <Badge tone="gold">czeka na 1. logowanie</Badge> : <Badge tone="green">{[u.totpEnabled && "aplikacja", u.emailOtp && "e-mail"].filter(Boolean).join(" + ")}</Badge>}
                {u.id !== me.id && (
                  <div className="flex gap-1.5">
                    <form action={toggleUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className={btnGhost}>{u.active ? "Wyłącz" : "Włącz"}</button>
                    </form>
                    <ActionForm action={resetUser2fa} className="contents">
                      <input type="hidden" name="id" value={u.id} />
                      <Submit className={btnGhost} pending="…">Reset hasła i 2FA</Submit>
                    </ActionForm>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <ActionForm action={createUser} className="mt-5 grid gap-3 border-t border-graphite/10 pt-5 sm:grid-cols-2">
            <Field label="Imię i nazwisko">
              <input name="name" required className={input} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" required className={input} />
            </Field>
            <div className="sm:col-span-2">
              <Submit pending="Tworzę…">Dodaj osobę</Submit>
            </div>
          </ActionForm>
        </section>

        <section className={card}>
          <h2 className="mb-4 font-display text-xl text-plum-900">Moje konto</h2>
          <ActionForm action={changePassword} resetOnOk className="grid gap-3">
            <input type="hidden" name="from" value="ustawienia" />
            <Field label="Obecne hasło">
              <input name="current" type="password" autoComplete="current-password" required className={input} />
            </Field>
            <Field label="Nowe hasło" hint="Min. 12 znaków, mała i wielka litera, cyfra.">
              <input name="password" type="password" autoComplete="new-password" minLength={12} required className={input} />
            </Field>
            <Field label="Powtórz nowe hasło">
              <input name="password2" type="password" autoComplete="new-password" minLength={12} required className={input} />
            </Field>
            <div>
              <Submit>Zmień hasło</Submit>
            </div>
          </ActionForm>
          <div className="mt-6 border-t border-graphite/10 pt-5">
            <p className="text-sm font-semibold">Drugi krok logowania</p>
            <p className="mt-1 text-sm text-graphite/60">
              {[me.totpEnabled && "kod z aplikacji", me.emailOtp && "kod na e-mail"].filter(Boolean).join(" albo ")}
            </p>
            {mailReady() && me.totpEnabled && (
              <form action={toggleEmailOtp} className="mt-3">
                <input type="hidden" name="on" value={me.emailOtp ? "0" : "1"} />
                <button className={btnGhost}>{me.emailOtp ? "Wyłącz kod na e-mail" : "Pozwól też na kod na e-mail"}</button>
              </form>
            )}
            {!mailReady() && <p className="mt-2 text-xs text-graphite/50">Kod na e-mail zadziała po ustawieniu wysyłki maili (RESEND_API_KEY lub SMTP_URL w Vercelu).</p>}
          </div>
          <div className="mt-6 border-t border-graphite/10 pt-5">
            <p className="mb-2 text-sm font-semibold">Powiadomienia o nowych zgłoszeniach</p>
            <NotifyButton />
            <p className="mt-2 text-xs text-graphite/50">Działają, gdy CRM jest otwarty w karcie przeglądarki. Licznik w menu odświeża się co minutę.</p>
          </div>
          {!storageReady() && <p className="mt-5 rounded-xl bg-gold-200 p-3 text-sm">Brak magazynu zdjęć: podłącz Vercel Blob, żeby dodawać zdjęcia ofert.</p>}
        </section>

        <section className={`${card} lg:col-span-2`}>
          <h2 className="mb-4 font-display text-xl text-plum-900">Dziennik zdarzeń</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-graphite/8">
                {log.map(({ a, who }) => (
                  <tr key={a.id} className={a.action === "login_fail" ? "text-red-800" : ""}>
                    <td className="py-2 pr-4 whitespace-nowrap text-graphite/55">{when(a.createdAt)}</td>
                    <td className="py-2 pr-4 font-semibold whitespace-nowrap">{auditLabels[a.action] ?? a.action}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{who ?? a.subject ?? "—"}</td>
                    <td className="py-2 pr-4 text-graphite/55">{a.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
