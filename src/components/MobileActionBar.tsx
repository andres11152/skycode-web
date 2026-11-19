"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m as motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ArrowRight, WhatsappLogo } from "@phosphor-icons/react";
import { getNavContent } from "@/content/nav";
import { getUiContent } from "@/content/ui";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { whatsappHref } from "@/lib/site";
import { DURATION, EASE_OUT, SPRING_SOFT } from "@/lib/animations";

/**
 * Barra de acción fija para móvil (por debajo de `sm`): la auditoría móvil mostró que, pasado el Hero,
 * no quedaba ningún CTA visible y el botón flotante de WhatsApp tapaba texto en todas las páginas.
 * Esta barra lo reemplaza en móvil (el flotante sigue en escritorio) y une las dos acciones:
 * contacto (abre el modal: el enlace a `#contacto` lo intercepta `ContactModalProvider`) y WhatsApp.
 *
 * Aparece con un resorte cuando el primer pantallazo queda atrás y se retira cuando ya no aporta:
 * con el formulario de contacto o el pie en pantalla (ahí la acción ya está a la vista). No se monta
 * en /cotizador, que tiene su propia barra con el precio en vivo.
 */
export function MobileActionBar({ locale }: { locale: Locale }) {
  const navData = getNavContent(locale);
  const uiData = getUiContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const [pastFold, setPastFold] = useState(false);
  const [targetInView, setTargetInView] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > window.innerHeight * 0.6;
    setPastFold((prev) => (prev === next ? prev : next));
  });

  // Se esconde mientras el formulario de contacto o el pie estén en pantalla. Se vuelve a buscar en
  // cada ruta: el formulario solo existe en la home y el pie se vuelve a montar con la página.
  useEffect(() => {
    const targets = [document.getElementById("contacto"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setTargetInView(visible.size > 0);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  const onEstimator = pathname.endsWith("/cotizador");
  const show = pastFold && !targetInView && !onEstimator;
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, y: "140%" };
  const waLink = `${whatsappHref}?text=${encodeURIComponent(uiData.whatsappDefaultMessage)}`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="mobile-action-bar"
          role="region"
          aria-label={navData.quickActionsAria}
          initial={hidden}
          animate={{ opacity: 1, y: 0 }}
          exit={{ ...hidden, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
          transition={SPRING_SOFT}
          // z-40: la misma capa que tenía el botón flotante (bajo Navbar 50 y CookieBanner 65).
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-full border border-foreground/10 bg-surface-raised/90 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:hidden"
        >
          <motion.a
            href={`${prefix}/#contacto`}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-foreground outline-none transition-[filter] hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {navData.quickContact}
            <ArrowRight size={16} aria-hidden="true" />
          </motion.a>
          <motion.a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={navData.quickWhatsapp}
            whileTap={reduced ? undefined : { scale: 0.92 }}
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-background text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <WhatsappLogo size={22} aria-hidden="true" />
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
