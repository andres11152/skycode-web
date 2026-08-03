import type { Metadata } from "next";
import { ServicesIndexView } from "@/components/services/ServicesIndexView";
import { buildServicesIndexMetadata } from "@/lib/serviceMetadata";

export const metadata: Metadata = buildServicesIndexMetadata("fr");

export default function ServicesPageFr() {
  return <ServicesIndexView locale="fr" />;
}
