import type { Metadata } from "next";
import { ThankYouView } from "@/components/ThankYouView";

export const metadata: Metadata = {
  title: "Demande Reçue | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default function MerciPage() {
  return <ThankYouView locale="fr" />;
}
