"use client";

import dynamic from "next/dynamic";
import { ClosingStatementFallback } from "@/components/sections/ClosingStatementFallback";
import { ContactSectionSkeleton } from "@/components/contact/ContactFormSkeleton";
import { useLocale } from "@/components/LocaleProvider";
import { LOADING_LABEL } from "@/lib/loadingLabel";
import type { Locale } from "@/lib/i18n";

// Los dos son solo cliente (efecto de scroll, formulario), pero ninguno deja un hueco vacío mientras
// carga: el cierre muestra su texto con la misma altura y el contacto, un skeleton con la forma exacta
// del formulario. Así no hay salto de layout al hidratar y el texto del cierre sí está en el HTML.
function ContactLoading() {
  return <ContactSectionSkeleton label={LOADING_LABEL[useLocale()]} />;
}

const ClosingStatement = dynamic(
  () => import("@/components/sections/ClosingStatement").then((mod) => mod.ClosingStatement),
  { ssr: false, loading: () => <ClosingStatementFallback /> }
);
const Contact = dynamic(
  () => import("@/components/sections/Contact").then((mod) => mod.Contact),
  { ssr: false, loading: () => <ContactLoading /> }
);

export function HomeInteractiveClosing({ locale }: { locale: Locale }) {
  return <ClosingStatement locale={locale} />;
}

export function HomeInteractiveContact({ locale }: { locale: Locale }) {
  return <Contact locale={locale} />;
}
