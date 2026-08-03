import type { Metadata } from "next";
import { ServicesIndexView } from "@/components/services/ServicesIndexView";
import { buildServicesIndexMetadata } from "@/lib/serviceMetadata";

export const metadata: Metadata = buildServicesIndexMetadata("es");

export default function ServiciosPage() {
  return <ServicesIndexView locale="es" />;
}
