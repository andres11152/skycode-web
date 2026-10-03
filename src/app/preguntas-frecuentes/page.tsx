import type { Metadata } from "next";
import { FaqPage } from "@/components/faq/FaqPage";
import { buildFaqMetadata } from "@/lib/faqMetadata";

export const metadata: Metadata = buildFaqMetadata("es");

export default function FaqPageEs() {
  return <FaqPage locale="es" />;
}
