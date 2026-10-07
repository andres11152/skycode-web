"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { Cookie } from "@phosphor-icons/react";
import { useLocale } from "@/components/LocaleProvider";
import { getCookieBannerContent } from "@/content/cookieBanner";
import { EsBadge } from "@/components/ui/EsBadge";
import { OPEN_PREFERENCES_EVENT, type ConsentChoices, CONSENT_ALL, CONSENT_DENIED } from "@/lib/consent";
import { saveConsent, useConsentRecord } from "@/lib/useConsent";

// El centro de preferencias solo se descarga la primera vez que se abre: el
// banner está en la primera visita de todo el mundo y no debe cargarle ese JS.
const CookiePreferences = dynamic(
  () => import("@/components/CookiePreferences").then((mod) => mod.CookiePreferences),
  { ssr: false },
);

// Los tres botones pesan lo mismo a propósito (ver CookiePreferences): rechazar
// no puede verse como la opción de segunda.
const actionButton =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-foreground/20 bg-background px-2.5 text-[13px] font-semibold whitespace-nowrap sm:text-sm text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none sm:px-5";

export function CookieBanner() {
  const locale = useLocale();
  const cookieData = getCookieBannerContent(locale);
  // Una frase por bloque (ver el comentario del JSX): `message` trae dos frases en es/en/fr.
  const [messageFirst, ...messageTail] = cookieData.message.split(/(?<=[.!?])\s+/);
  const messageRest = messageTail.join(" ");
  // `undefined` = aún no se leyó el almacenamiento (servidor/hidratación): no se muestra nada.
  const record = useConsentRecord();
  const reduced = useReducedMotion();
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, y: 16 };

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefsEverOpened, setPrefsEverOpened] = useState(false);
  // Cambia en cada apertura para remontar el modal con el borrador al día.
  const [prefsSession, setPrefsSession] = useState(0);

  useEffect(() => {
    const open = () => {
      setPrefsSession((n) => n + 1);
      setPrefsEverOpened(true);
      setPrefsOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, []);

  function decide(choices: ConsentChoices) {
    saveConsent(choices);
    setPrefsOpen(false);
  }

  function openPreferences() {
    setPrefsSession((n) => n + 1);
    setPrefsEverOpened(true);
    setPrefsOpen(true);
  }

  // El banner NO se oculta mientras el modal está abierto: el modal lo cubre y
  // así su botón "Configurar" sigue existiendo para recibir de vuelta el foco al cerrar.
  const bannerVisible = record === null;

  return (
    <>
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            role="region"
            aria-label={cookieData.ariaLabel}
            initial={hidden}
            animate={{ opacity: 1, y: 0 }}
            // Sale en ~70% de lo que tarda en entrar (regla de CLAUDE.md).
            exit={{ ...hidden, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            className="fixed inset-x-0 bottom-0 z-[65] border-t border-foreground/10 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
          >
            {/* Compacto en mobile a propósito: una versión anterior apilada
                ocupaba ~22% del viewport de un teléfono y tapaba los CTA del
                Hero. El icono se oculta bajo `sm:`; los tres botones comparten
                una sola fila. */}
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent sm:flex"
                >
                  <Cookie size={18} />
                </span>
                {/* El texto va en DOS bloques (una frase cada uno) a propósito: el LCP toma el bloque de texto
                    más grande, y este párrafo en móvil medía casi lo mismo que el H1 (±1 %), así que a veces
                    el banner (que aparece tras hidratar) se convertía en el LCP de la página. Con dos bloques
                    ninguno puede superar al titular. */}
                <p className="text-xs leading-relaxed text-foreground/80 sm:text-sm">
                  <span className="block">{messageFirst}</span>
                  <span className="block">
                    {messageRest}
                    {messageRest ? " " : ""}
                    {/* Sin prefetch: el banner está en pantalla en toda primera
                        visita y prefetchear la política le costaba red a cada
                        visitante para un link que casi nadie abre. */}
                    <Link
                      href={cookieData.linkUrl}
                      prefetch={false}
                      className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
                    >
                      {cookieData.linkText}
                    </Link>
                    {locale !== "es" && <EsBadge className="ml-1.5" />}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={openPreferences} className={actionButton}>
                  {cookieData.customize}
                </button>
                <button type="button" onClick={() => decide(CONSENT_DENIED)} className={actionButton}>
                  {cookieData.rejectAll}
                </button>
                <button type="button" onClick={() => decide(CONSENT_ALL)} className={actionButton}>
                  {cookieData.acceptAll}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {prefsEverOpened && (
        <CookiePreferences
          key={prefsSession}
          open={prefsOpen}
          locale={locale}
          record={record ?? null}
          onClose={() => setPrefsOpen(false)}
          onSave={decide}
        />
      )}
    </>
  );
}
