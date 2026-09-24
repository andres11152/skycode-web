import { getProjectEstimatorContent } from "@/content/projectEstimator";
import { getContactContent } from "@/content/contact";
import { localeHtmlLang, t, type Locale } from "@/lib/i18n";
import { siteUrl, whatsappHref } from "@/lib/site";
import { escapeHtml } from "@/lib/utils";
import type { EstimatorQuoteResult } from "./estimatorQuote";
import type { BuiltEmail } from "./leadConfirmationEmail";

/**
 * Correo de "recíbelo por correo" del cotizador (ver ProjectEstimator.tsx
 * y POST /api/estimator/quote-email) — a diferencia de
 * `leadConfirmationEmail.ts`, todo el contenido variable (`quote`) viene
 * de `computeEstimatorQuote()` (lib/estimatorQuote.ts), que solo puede
 * devolver textos del catálogo real de servicios/addons — nunca texto
 * libre que haya mandado el navegador. Aun así se escapa igual (defensa
 * en profundidad: si el catálogo alguna vez incluye un título con
 * caracteres especiales, sigue siendo HTML seguro).
 *
 * Mismo lenguaje visual que `leadConfirmationEmail.ts` (logo, colores,
 * layout de tablas) pero contenido propio — no comparten un "shell" común
 * a propósito: son solo dos correos, extraer una abstracción compartida
 * ahora sería una capa de indirección sin necesidad real todavía.
 */
export function buildEstimatorQuoteEmail({ quote, locale }: { quote: EstimatorQuoteResult; locale: Locale }): BuiltEmail {
  const content = getProjectEstimatorContent(locale);
  const { quoteEmail } = content;
  const { habeasData } = getContactContent(locale);

  const safeTypeTitle = escapeHtml(quote.typeTitle);
  const safeAddons = quote.addonTitles.length > 0 ? quote.addonTitles.map((title) => escapeHtml(title)).join(", ") : escapeHtml(content.noAddonsLabel);
  const safePaceLabel = escapeHtml(quote.paceLabel);

  const subject = t(quoteEmail.subject, { type: quote.typeTitle });
  const privacyUrl = `${siteUrl}${habeasData.linkUrl}`;

  const html = `<!DOCTYPE html>
<html lang="${localeHtmlLang[locale]}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(quoteEmail.preheader)}</div>
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
              <td style="padding:32px 40px 0;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#0a0a0a;font-weight:600;">${escapeHtml(quoteEmail.greeting)}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:rgba(10,10,10,0.75);">${escapeHtml(quoteEmail.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border-radius:14px;">
                  <tr>
                    <td style="padding:24px 24px 20px;">
                      <div style="font-size:11px;font-family:'SF Mono',Consolas,monospace;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.5);margin-bottom:6px;">${escapeHtml(quoteEmail.priceLabel)}</div>
                      <div style="font-size:32px;font-weight:700;font-family:'SF Mono',Consolas,monospace;color:#0089cd;line-height:1.1;">${escapeHtml(quote.formattedTotal)}</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
                        <tr>
                          <td style="padding:14px 0 0;font-size:12px;color:rgba(255,255,255,0.5);width:50%;">${escapeHtml(quoteEmail.typeLabel)}</td>
                          <td style="padding:14px 0 0;font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${safeTypeTitle}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0 0;font-size:12px;color:rgba(255,255,255,0.5);vertical-align:top;">${escapeHtml(quoteEmail.addonsLabel)}</td>
                          <td style="padding:10px 0 0;font-size:12px;color:#ffffff;text-align:right;">${safeAddons}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">${escapeHtml(quoteEmail.paceLabel)}</td>
                          <td style="padding:10px 0 0;font-size:12px;color:#ffffff;text-align:right;">${safePaceLabel}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">${escapeHtml(quoteEmail.weeksLabel)}</td>
                          <td style="padding:10px 0 0;font-size:12px;color:#ffffff;text-align:right;">~${quote.totalWeeks} ${escapeHtml(content.summary.weeksSuffix)}</td>
                        </tr>
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
                      <a href="${whatsappHref}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(quoteEmail.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 32px;border-top:1px solid #eef0f2;">
                <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:rgba(10,10,10,0.5);">${escapeHtml(quoteEmail.footerNote)}</p>
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
    quoteEmail.greeting,
    "",
    quoteEmail.intro,
    "",
    `${quoteEmail.typeLabel}: ${quote.typeTitle}`,
    `${quoteEmail.addonsLabel}: ${quote.addonTitles.length > 0 ? quote.addonTitles.join(", ") : content.noAddonsLabel}`,
    `${quoteEmail.paceLabel}: ${quote.paceLabel}`,
    `${quoteEmail.priceLabel}: ${quote.formattedTotal}`,
    `${quoteEmail.weeksLabel}: ~${quote.totalWeeks} ${content.summary.weeksSuffix}`,
    "",
    `${quoteEmail.ctaLabel}: ${whatsappHref}`,
    "",
    quoteEmail.footerNote,
  ];

  return { subject, html, text: textLines.join("\n") };
}
