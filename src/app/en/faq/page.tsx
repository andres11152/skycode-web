import type { Metadata } from "next";
import { FaqPage } from "@/components/faq/FaqPage";
import { buildFaqMetadata } from "@/lib/faqMetadata";

export const metadata: Metadata = buildFaqMetadata("en");

export default function FaqPageEn() {
  return <FaqPage locale="en" />;
}
