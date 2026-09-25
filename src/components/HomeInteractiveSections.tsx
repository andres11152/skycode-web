"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n";

const Testimonials = dynamic(
  () => import("@/components/sections/Testimonials").then((mod) => mod.Testimonials),
  { ssr: false }
);
const ClosingStatement = dynamic(
  () => import("@/components/sections/ClosingStatement").then((mod) => mod.ClosingStatement),
  { ssr: false }
);
const Contact = dynamic(
  () => import("@/components/sections/Contact").then((mod) => mod.Contact),
  { ssr: false }
);

export function HomeInteractiveTestimonials({ locale }: { locale: Locale }) {
  return <Testimonials locale={locale} />;
}

export function HomeInteractiveClosing({ locale }: { locale: Locale }) {
  return <ClosingStatement locale={locale} />;
}

export function HomeInteractiveContact({ locale }: { locale: Locale }) {
  return <Contact locale={locale} />;
}
