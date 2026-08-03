import type { Metadata } from "next";
import { HomeSections } from "@/components/HomeSections";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import { buildHomeMetadata } from "@/lib/localeMetadata";

export const metadata: Metadata = buildHomeMetadata("en", "/en");

export default function HomeEn() {
  return (
    <>
      <FaqJsonLd locale="en" />
      <HomeSections locale="en" />
    </>
  );
}
