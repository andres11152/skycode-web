"use client";

import { ChatCircle, Envelope } from "@phosphor-icons/react";
import { ContactForm } from "@/components/contact/ContactForm";
import { RevealText } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getContactContent } from "@/content/contact";
import { getUiContent } from "@/content/ui";
import { contactEmail, contactPhone, socials, whatsappHref } from "@/lib/site";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function FacebookIcon({ size = 16, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 16, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const contactLinks = [
  {
    label: contactEmail,
    href: `mailto:${contactEmail}`,
    icon: Envelope,
    hoverClass: "hover:bg-accent/10 hover:border-accent/30 hover:text-accent",
  },
  {
    label: contactPhone.startsWith("+57") ? contactPhone.replace("+57", "+57 ") : contactPhone,
    href: whatsappHref,
    icon: ChatCircle,
    hoverClass: "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-700",
  },
  {
    label: "Facebook",
    href: socials.facebook,
    icon: FacebookIcon,
    hoverClass: "hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30 hover:text-[#1877F2]",
  },
  {
    label: "Instagram",
    href: socials.instagram,
    icon: InstagramIcon,
    hoverClass: "hover:bg-[#E4405F]/10 hover:border-[#E4405F]/30 hover:text-[#E4405F]",
  },
];


export function Contact({
  locale = defaultLocale,
  showOtherContactMethods = true,
  compact = false,
}: {
  locale?: Locale;
  /** Landing pages de campaña (ej. /landing) no deben ofrecer salidas del formulario. */
  showOtherContactMethods?: boolean;
  /** Para embeber el formulario dentro de otra página (ej. /landing) que ya trae su propio
   * H1/subtítulo: quita el padding de sección y el bloque badge/H2/descripción duplicado. */
  compact?: boolean;
}) {
  const contactData = getContactContent(locale);
  const uiData = getUiContent(locale);

  return (
    <section
      id={compact ? undefined : "contacto"}
      className={compact ? "px-5 py-6 sm:px-8 sm:py-8" : "scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28"}
    >
      <div className={compact ? "" : "mx-auto max-w-xl"}>
        <div className={compact ? "mb-6" : "mb-12 text-center"}>
          {compact ? (
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Cuéntanos de tu proyecto
            </h2>
          ) : (
            <>
              <SectionEyebrow className="reveal-up mb-3">{contactData.badge}</SectionEyebrow>
              <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
                <RevealText text={contactData.title} />
              </h2>
              <p className="mt-3 text-foreground/80">
                {contactData.description}
              </p>
            </>
          )}
          {showOtherContactMethods && (
            <ul
              aria-label={uiData.contactOtherWaysAria}
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
            >
              {contactLinks.map(({ label, href, icon: Icon, hoverClass }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/10 bg-background/50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground/80 outline-none transition duration-300 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm hover:shadow-md hover:-translate-y-0.5",
                      hoverClass
                    )}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ContactForm locale={locale} />
      </div>
    </section>
  );
}
