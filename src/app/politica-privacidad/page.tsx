import type { Metadata } from "next";
import { getLegalDocBySlug } from "@/content/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";

const doc = getLegalDocBySlug("politica-privacidad")!;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/politica-privacidad" },
};

export default function PoliticaPrivacidadPage() {
  return <LegalDocumentView doc={doc} />;
}
