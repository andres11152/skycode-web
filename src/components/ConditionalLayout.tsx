"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { CookieBanner } from "@/components/CookieBanner";
import { SkipLink } from "@/components/SkipLink";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import { CustomCursor } from "@/components/ui/CustomCursor";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardOrLogin = pathname === "/dashboard" || pathname === "/login";

  if (isDashboardOrLogin) {
    return (
      <main className="min-h-screen flex flex-col bg-foreground text-background">
        {children}
      </main>
    );
  }

  return (
    <>
      <SkipLink />
      <Navbar />
      {children}
      <Footer />
      <HtmlLangSync />
      <CustomCursor />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
