import type { Metadata } from "next";
import { HomeSections } from "@/components/HomeSections";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import { buildHomeMetadata } from "@/lib/localeMetadata";

export const metadata: Metadata = buildHomeMetadata("en", "/en");

// La home lee blog y portafolio de Postgres: sin esto quedaba estática
// hasta el siguiente deploy.
export const revalidate = 3600;

export default function HomeEn() {
  return (
    <>
      <FaqJsonLd locale="en" />
      <HomeSections locale="en" />
    </>
  );
}
