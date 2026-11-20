import type { Metadata } from "next";
import { ThankYouView } from "@/components/ThankYouView";

export const metadata: Metadata = {
  title: "Solicitud registrada",
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  return <ThankYouView locale="es" />;
}
