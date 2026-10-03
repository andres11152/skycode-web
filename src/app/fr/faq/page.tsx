import type { Metadata } from "next";
import { FaqPage } from "@/components/faq/FaqPage";
import { buildFaqMetadata } from "@/lib/faqMetadata";

export const metadata: Metadata = buildFaqMetadata("fr");

export default function FaqPageFr() {
  return <FaqPage locale="fr" />;
}
