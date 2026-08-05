"use client";

import { useId, useState } from "react";
import { AlertCircle, CheckCircle2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PhoneField } from "@/components/ui/PhoneField";
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
    icon: Mail,
    hoverClass: "hover:bg-accent/10 hover:border-accent/30 hover:text-accent",
  },
  {
    label: contactPhone.startsWith("+57") ? contactPhone.replace("+57", "+57 ") : contactPhone,
    href: whatsappHref,
    icon: MessageCircle,
    hoverClass: "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500",
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

const baseFieldClasses =
  "h-11 rounded-lg border bg-background px-4 text-sm outline-none transition-all duration-200 focus:ring-2";
const labelClasses = "text-sm font-medium text-foreground/80";

function isValidRealEmail(emailStr: string): boolean {
  const trimmed = emailStr.trim().toLowerCase();
  if (!trimmed) return false;

  // RFC 5322 regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return false;

  // Block fake / dummy email domains
  const fakeDomains = [
    "test.com",
    "asdf.com",
    "fake.com",
    "xxx.com",
    "example.com",
    "mailinator.com",
    "tempmail.com",
    "dispostable.com",
    "gmai.com",
    "hotmai.com",
  ];
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];

  if (fakeDomains.includes(domain)) return false;
  if (parts[0].length < 1 || domain.length < 4 || !domain.includes(".")) return false;

  return true;
}

export function Contact({ locale = defaultLocale }: { locale?: Locale }) {
  const contactData = getContactContent(locale);
  const uiData = getUiContent(locale);

  // Controlled form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    message: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneFieldKey, setPhoneFieldKey] = useState(0);
  const idPrefix = useId();

  // Validations
  const isNameValid = name.trim().length >= 2;
  const isEmailValid = isValidRealEmail(email);
  const isMessageValid = message.trim().length >= 10;

  const isFormValid = isNameValid && isEmailValid && isMessageValid && acceptedPolicies;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: name.trim(),
      email: email.trim(),
      phone: formData.get("phone") || "",
      message: message.trim(),
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
        setName("");
        setEmail("");
        setMessage("");
        setAcceptedPolicies(false);
        setTouched({ name: false, email: false, message: false });
        setPhoneFieldKey((value) => value + 1);
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
    <section id="contacto" className="scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-xl">
        <div className="mb-12 text-center">
          <SectionEyebrow className="mb-3">Contacto &amp; Diagnóstico</SectionEyebrow>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {contactData.title}
          </h2>
          <p className="mt-3 text-foreground/80">
            {contactData.description}
          </p>
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
                    "inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/10 bg-background/50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground/80 outline-none transition-all duration-300 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    hoverClass
                  )}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nombre completo */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-name`} className={labelClasses}>
              {contactData.placeholders.name} <span className="text-accent">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              autoComplete="name"
              required
              placeholder="Ej. Juan Pérez o Empresa S.A.S."
              className={`${baseFieldClasses} ${
                touched.name && !isNameValid
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                  : isNameValid
                  ? "border-emerald-500/60 focus:border-accent focus:ring-accent/30"
                  : "border-foreground/10 focus:border-accent focus:ring-accent/30"
              }`}
            />
            {touched.name && !isNameValid && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={12} /> El nombre o empresa es obligatorio (mínimo 2 caracteres).
              </p>
            )}
          </div>

          {/* Correo electrónico */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-email`} className={labelClasses}>
              {contactData.placeholders.email} <span className="text-accent">*</span>
            </label>
            <input
              id={`${idPrefix}-email`}
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              autoComplete="email"
              required
              placeholder="ejemplo@empresa.com"
              className={`${baseFieldClasses} ${
                touched.email && !isEmailValid
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                  : isEmailValid
                  ? "border-emerald-500/60 focus:border-accent focus:ring-accent/30"
                  : "border-foreground/10 focus:border-accent focus:ring-accent/30"
              }`}
            />
            {touched.email && !isEmailValid && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={12} /> Ingrese un correo electrónico real y válido (ej: usuario@empresa.com).
              </p>
            )}
          </div>

          {/* Teléfono */}
          <PhoneField
            key={phoneFieldKey}
            locale={locale}
            id={`${idPrefix}-phone`}
            label={contactData.placeholders.phone}
            countryLabel={contactData.placeholders.phoneCountry}
            countryPlaceholder={contactData.placeholders.phoneCountryEmpty}
            fieldClassName={`${baseFieldClasses} border-foreground/10 focus:border-accent focus:ring-accent/30`}
            labelClassName={labelClasses}
          />

          {/* Mensaje */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-message`} className={labelClasses}>
              {contactData.placeholders.message} <span className="text-accent">*</span>
            </label>
            <textarea
              id={`${idPrefix}-message`}
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
              required
              rows={4}
              placeholder="Describa brevemente el desafío técnico o requerimientos de su proyecto..."
              className={`${baseFieldClasses} h-auto py-3 ${
                touched.message && !isMessageValid
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                  : isMessageValid
                  ? "border-emerald-500/60 focus:border-accent focus:ring-accent/30"
                  : "border-foreground/10 focus:border-accent focus:ring-accent/30"
              }`}
            />
            {touched.message && !isMessageValid && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={12} /> Describa su proyecto con al menos 10 caracteres.
              </p>
            )}
          </div>

          {/* Habeas Data Checkbox */}
          <div className="flex items-start gap-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3.5 py-3 transition-colors hover:border-foreground/20">
            <input
              type="checkbox"
              id="habeas-data"
              name="habeasData"
              checked={acceptedPolicies}
              onChange={(e) => setAcceptedPolicies(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-foreground/30 text-accent outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            />
            <label htmlFor="habeas-data" className="text-xs text-foreground/80 leading-relaxed select-none cursor-pointer">
              {contactData.habeasData.label}{" "}
              <a
                href={contactData.habeasData.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-accent transition-colors"
              >
                {contactData.habeasData.linkText}
              </a>
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-500 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón Submit & Notificación de estado */}
          <div className="flex flex-col gap-2 mt-1">
            <Button
              type="submit"
              size="lg"
              disabled={!isFormValid || isSubmitting}
              className={!isFormValid ? "opacity-50 cursor-not-allowed pointer-events-none" : "shadow-[0_0_25px_rgba(0,137,205,0.3)]"}
            >
              {isSubmitting ? contactData.sendingLabel : contactData.submitLabel}
            </Button>

            {!isFormValid && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-foreground/60 text-center">
                <ShieldCheck size={13} className="text-accent shrink-0" />
                <span>
                  {!acceptedPolicies
                    ? "Debe aceptar la política de tratamiento de datos para activar el envío."
                    : "Complete los campos requeridos con datos válidos para activar el botón."}
                </span>
              </div>
            )}
          </div>
        </form>
      </div>

      <Modal
        open={submitted}
        onClose={() => setSubmitted(false)}
        closeLabel={uiData.modalClose}
      >
        <div className="flex flex-col items-center text-center pt-2 pb-1">
          {/* Animated Success Checkmark Badge */}
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
            <CheckCircle2 size={42} className="stroke-[2.2]" />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-md">
              <ShieldCheck size={16} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {contactData.successModal.title}
          </h3>

          {/* Body */}
          <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-sm">
            {contactData.successModal.body}
          </p>

          {/* Enterprise SLA Details Box */}
          <div className="mt-6 w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-left space-y-2.5 text-xs text-foreground/80">
            <div className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Estado: Registrado en nuestro CRM</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>Garantía SLA de respuesta: Menos de 24h hábiles</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3 w-full">
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={() => setSubmitted(false)}
              className="w-full justify-center"
            >
              Entendido
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 text-sm font-bold text-emerald-500 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 w-full"
            >
              <MessageCircle size={16} />
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </Modal>
    </section>
  );
}
