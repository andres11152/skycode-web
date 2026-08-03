import type { Metadata } from "next";
import { ServicesIndexView } from "@/components/services/ServicesIndexView";
import { buildServicesIndexMetadata } from "@/lib/serviceMetadata";

export const metadata: Metadata = buildServicesIndexMetadata("en");

export default function ServicesPageEn() {
  return <ServicesIndexView locale="en" />;
}
