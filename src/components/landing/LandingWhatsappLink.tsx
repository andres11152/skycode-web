"use client";

import { usePathname } from "next/navigation";
import { ChatCircle } from "@phosphor-icons/react";
import { trackWhatsappClick } from "@/lib/landingEvents";

/** Enlace a WhatsApp de la landing: cuenta el clic (contador propio y, si hay etiqueta, conversión en Ads) y abre el chat. */
export function LandingWhatsappLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsappClick(pathname)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/20 px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:border-foreground/35 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ChatCircle size={18} aria-hidden="true" />
      {children}
    </a>
  );
}
