import type { Metadata } from "next";
import { getLegalDocBySlug } from "@/content/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";

const doc = getLegalDocBySlug("terminos-uso")!;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/terminos-uso" },
};

export default function TerminosUsoPage() {
  return <LegalDocumentView doc={doc} />;
}
