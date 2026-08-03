import type { Metadata } from "next";
import { HomeSections } from "@/components/HomeSections";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import { buildHomeMetadata } from "@/lib/localeMetadata";

export const metadata: Metadata = buildHomeMetadata("fr", "/fr");

export default function HomeFr() {
  return (
    <>
      <FaqJsonLd locale="fr" />
      <HomeSections locale="fr" />
    </>
  );
}
