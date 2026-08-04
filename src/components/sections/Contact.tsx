"use client";

import { useId, useState } from "react";
import { ExternalLink, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getContactContent } from "@/content/contact";
import { getUiContent } from "@/content/ui";
import { contactEmail, contactPhone, socials, whatsappHref } from "@/lib/site";
import { defaultLocale, type Locale } from "@/lib/i18n";

const contactLinks = [
  {
    label: contactEmail,
    href: `mailto:${contactEmail}`,
    icon: Mail,
  },
  {
    label: contactPhone.startsWith("+57") ? contactPhone.replace("+57", "+57 ") : contactPhone,
    href: whatsappHref,
    icon: MessageCircle,
  },
  {
    label: "Facebook",
    href: socials.facebook,
    icon: ExternalLink,
  },
  {
    label: "Instagram",
    href: socials.instagram,
    icon: ExternalLink,
  },
];

const fieldClasses =
  "h-11 rounded-lg border border-foreground/10 bg-background px-4 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";
const labelClasses = "text-sm font-medium text-foreground/80";

export function Contact({ locale = defaultLocale }: { locale?: Locale }) {
  const contactData = getContactContent(locale);
  const uiData = getUiContent(locale);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idPrefix = useId();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const formElement = e.currentTarget;

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitted(true);
        formElement.reset();
      } else {
        setErrorMessage(result.error || contactData.errorGeneral);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(contactData.errorConnection);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contacto" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-xl">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {contactData.title}
          </h2>
          <p className="mt-3 text-foreground/80">
            {contactData.description}
          </p>
          <ul
            aria-label={uiData.contactOtherWaysAria}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            {contactLinks.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-foreground/10 px-4 py-2.5 text-sm text-foreground/80 outline-none transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Icon size={14} />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-name`} className={labelClasses}>
              {contactData.placeholders.name}
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              name="name"
              autoComplete="name"
              required
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-email`} className={labelClasses}>
              {contactData.placeholders.email}
            </label>
            <input
              id={`${idPrefix}-email`}
              type="email"
              name="email"
              autoComplete="email"
              required
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-phone`} className={labelClasses}>
              {contactData.placeholders.phone || "Teléfono de contacto"}
            </label>
            <input
              id={`${idPrefix}-phone`}
              type="tel"
              name="phone"
              autoComplete="tel"
              required
              className={fieldClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-message`} className={labelClasses}>
              {contactData.placeholders.message}
            </label>
            <textarea
              id={`${idPrefix}-message`}
              name="message"
              required
              rows={4}
              className={`${fieldClasses} h-auto py-3`}
            />
            <div className="flex items-start gap-2.5 px-1 py-1">
              <input
                type="checkbox"
                id="habeas-data"
                name="habeasData"
                required
                className="mt-1 h-4 w-4 shrink-0 rounded border-foreground/20 text-accent outline-none focus:ring-2 focus:ring-accent"
              />
              <label htmlFor="habeas-data" className="text-xs text-foreground/75 leading-normal select-none">
                {contactData.habeasData.label}{" "}
                <a
                  href={contactData.habeasData.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  {contactData.habeasData.linkText}
                </a>
              </label>
            </div>
          </div>
          {errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-500">
              {errorMessage}
            </div>
          )}
          <Button type="submit" size="lg" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? contactData.sendingLabel : contactData.submitLabel}
          </Button>
        </form>
      </div>

      <Modal
        open={submitted}
        onClose={() => setSubmitted(false)}
        title={contactData.successModal.title}
        closeLabel={uiData.modalClose}
      >
        <p className="text-sm text-foreground/80">
          {contactData.successModal.body}
        </p>
      </Modal>
    </section>
  );
}
