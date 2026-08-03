import type { Metadata } from "next";
import { getLegalDocBySlug } from "@/content/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";

const doc = getLegalDocBySlug("terminos-y-condiciones")!;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/terminos-y-condiciones" },
};

export default function TerminosYCondicionesPage() {
  return <LegalDocumentView doc={doc} />;
}
