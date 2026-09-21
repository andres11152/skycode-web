import type { Metadata } from "next";
import { ThankYouView } from "@/components/ThankYouView";

export const metadata: Metadata = {
  title: "Request Received | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return <ThankYouView locale="en" />;
}
