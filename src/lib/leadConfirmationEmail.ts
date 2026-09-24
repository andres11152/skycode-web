import { getContactContent } from "@/content/contact";
import { localeHtmlLang, t, type Locale } from "@/lib/i18n";
import { siteUrl, whatsappHref } from "@/lib/site";
import { escapeHtml } from "@/lib/utils";

const MESSAGE_EXCERPT_LIMIT = 400;

export interface LeadConfirmationEmailInput {
  name: string;
  message: string;
  /** Etiqueta ya resuelta por lib/leadServices.ts (español, canónica) — o
   * null cuando el visitante no eligió ningún servicio en el formulario. */
  service?: string | null;
  locale: Locale;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;
}

/**
 * Correo de confirmación que recibe el visitante al enviar el formulario de
 * contacto (home, /landing o el prefill del cotizador — todos comparten el
 * mismo <Contact/>, ver Contact.tsx). Reutiliza el copy ya aprobado de
 * `successModal` (el mismo que se ve en /gracias, ver ThankYouView.tsx) más
 * un puñado de strings propios del correo (`confirmationEmail` en
 * content/locales/{locale}/contact.json) — nunca duplica el mensaje base.
 *
 * HTML armado a mano con estilos inline y layout de tablas (no JSX/React):
 * es lo que exige la compatibilidad real de clientes de correo (Outlook en
 * particular ignora <style> externo y flexbox/grid). `name`/`service`/
 * `message` vienen de un formulario público sin autenticar — se escapan
 * SIEMPRE antes de interpolarse en el HTML (ver lib/utils.ts::escapeHtml),
 * o un nombre con `<img onerror=...>` se ejecutaría como HTML real en el
 * cliente de correo de quien lo reciba.
 */
export function buildLeadConfirmationEmail({ name, message, service, locale }: LeadConfirmationEmailInput): BuiltEmail {
  const content = getContactContent(locale);
  const { successModal, confirmationEmail, habeasData } = content;

  const safeName = escapeHtml(name);
  const safeService = service ? escapeHtml(service) : null;
  const safeMessage = escapeHtml(truncate(message, MESSAGE_EXCERPT_LIMIT)).replace(/\n/g, "<br />");

  const subject = t(confirmationEmail.subject, { name });
  const preheader = confirmationEmail.preheader;
  const greetingHtml = t(confirmationEmail.greeting, { name: safeName });
  const greetingText = t(confirmationEmail.greeting, { name });
  const privacyUrl = `${siteUrl}${habeasData.linkUrl}`;

  const summaryRows = [
    safeService
      ? `<tr><td style="padding:4px 0;font-size:12px;font-weight:700;color:#0a0a0a;width:140px;vertical-align:top;">${escapeHtml(confirmationEmail.serviceLabel)}</td><td style="padding:4px 0;font-size:13px;color:rgba(10,10,10,0.8);">${safeService}</td></tr>`
      : "",
    `<tr><td style="padding:4px 0;font-size:12px;font-weight:700;color:#0a0a0a;width:140px;vertical-align:top;">${escapeHtml(confirmationEmail.messageLabel)}</td><td style="padding:4px 0;font-size:13px;color:rgba(10,10,10,0.8);line-height:1.5;">${safeMessage}</td></tr>`,
  ]
    .filter(Boolean)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${localeHtmlLang[locale]}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:32px 40px 24px;border-bottom:1px solid #eef0f2;">
                <img src="${siteUrl}/logo-full.png" width="140" alt="SkyCode.Agency" style="display:block;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;border-radius:14px;background-color:#ecfdf5;border:1px solid #a7f3d0;">
                      <span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1;color:#059669;">&#10003;</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 0;">
                <h1 style="margin:0;font-size:22px;line-height:1.35;color:#0a0a0a;font-weight:700;">${escapeHtml(successModal.title)}</h1>
                <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#0a0a0a;font-weight:600;">${greetingHtml}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:rgba(10,10,10,0.75);">${escapeHtml(successModal.body)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border:1px solid #eef0f2;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;font-size:13px;color:#0a0a0a;">
                      <div style="margin-bottom:8px;"><span style="color:#059669;">&#9679;</span> ${escapeHtml(successModal.statusCrm)}</div>
                      <div><span style="color:#0089cd;">&#9679;</span> ${escapeHtml(successModal.slaGuarantee)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f2;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        ${summaryRows}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#006998;">
                      <a href="${whatsappHref}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(successModal.whatsappCta)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 32px;border-top:1px solid #eef0f2;">
                <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:rgba(10,10,10,0.5);">${escapeHtml(confirmationEmail.footerNote)}</p>
                <p style="margin:0;font-size:12px;color:rgba(10,10,10,0.4);">SkyCode.Agency &middot; <a href="${privacyUrl}" style="color:rgba(10,10,10,0.4);">${escapeHtml(habeasData.linkText)}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    greetingText,
    "",
    successModal.body,
    "",
    `- ${successModal.statusCrm}`,
    `- ${successModal.slaGuarantee}`,
    "",
    ...(service ? [`${confirmationEmail.serviceLabel}: ${service}`] : []),
    `${confirmationEmail.messageLabel}: ${truncate(message, MESSAGE_EXCERPT_LIMIT)}`,
    "",
    `${successModal.whatsappCta}: ${whatsappHref}`,
    "",
    confirmationEmail.footerNote,
  ];

  return { subject, html, text: textLines.join("\n") };
}
