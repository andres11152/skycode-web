import type { Metadata } from "next";
import { HomeSections } from "@/components/HomeSections";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import { buildHomeMetadata } from "@/lib/localeMetadata";

export const metadata: Metadata = buildHomeMetadata("es", "/");

// La home lee blog y portafolio de Postgres: sin esto quedaba estática
// hasta el siguiente deploy.
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <FaqJsonLd locale="es" />
      <HomeSections locale="es" />
    </>
  );
}
