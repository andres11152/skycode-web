import type { Metadata } from "next";
import { getLegalDocBySlug } from "@/content/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";

const doc = getLegalDocBySlug("politica-cookies")!;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/politica-cookies" },
};

export default function PoliticaCookiesPage() {
  return <LegalDocumentView doc={doc} />;
}
