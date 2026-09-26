"use client";

import { useEffect, useId, useState } from "react";
import { ChatCircle, Envelope, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/ui/PhoneField";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getContactContent } from "@/content/contact";
import { getServicesContent } from "@/content/services";
import { getUiContent } from "@/content/ui";
import { contactEmail, contactPhone, socials, whatsappHref } from "@/lib/site";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getAttribution } from "@/lib/attribution";
import { logError } from "@/lib/logger";
import {
  CONTACT_PREFILL_EVENT,
  consumePendingContactPrefill,
  type ContactPrefillDetail,
} from "@/lib/contactPrefillEvent";

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
  const { services } = getServicesContent(locale);
  // Ruta de gracias por locale — mismo criterio que localeHomePath (es sin
  // prefijo, el resto con /{locale}), pero /blog y lo legal son las únicas
  // rutas sin prefijo hoy documentadas en CLAUDE.md; esta sí tiene versión
  // por idioma (ver src/app/{en,fr}/gracias/page.tsx).
  const thankYouPath = locale === defaultLocale ? "/gracias" : `/${locale}/gracias`;

  // Controlled form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [serviceOther, setServiceOther] = useState("");
  // "Cotizador" cuando el envío llegó prellenado desde ProjectEstimator —
  // permite distinguir en el CRM a quien ya vio precios de quien solo
  // escribió el formulario directo (ver lib/leadServices.ts).
  const [formContext, setFormContext] = useState<"Formulario Web" | "Cotizador">("Formulario Web");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    message: false,
    serviceOther: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Se marca en el primer intento de envío fallido — antes de esto el botón
  // quedaba deshabilitado y en gris hasta marcar la casilla de datos, lo que
  // se leía como un botón roto (bug real, visto en auditoría visual). Ahora
  // el botón siempre está habilitado; un envío inválido marca todos los
  // campos como "touched" (para mostrar sus errores) y mueve el foco al
  // primer campo inválido, como pide CLAUDE.md.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const idPrefix = useId();

  // Escucha el prefill del cotizador (ver lib/contactPrefillEvent.ts) — ya
  // no escribe directo en el DOM del textarea, así que el estado de React
  // (y por lo tanto lo que se envía) siempre refleja lo que se ve en pantalla.
  useEffect(() => {
    function handlePrefill(event: Event) {
      const detail = (event as CustomEvent<ContactPrefillDetail>).detail;
      if (!detail) return;
      setMessage(detail.message);
      if (detail.serviceSlug) setServiceSlug(detail.serviceSlug);
      setFormContext("Cotizador");
    }

    window.addEventListener(CONTACT_PREFILL_EVENT, handlePrefill);

    // Traspaso entre páginas: si el visitante vino de /cotizador (su propia
    // ruta, ya no vive en la misma página que este formulario — ver
    // CotizadorPageView.tsx), el evento de arriba no llegó a tener quién lo
    // escuche a tiempo. `consumePendingContactPrefill()` revisa el mismo
    // dato guardado en sessionStorage antes de esa navegación. En un
    // microtask (no directo en el cuerpo del efecto) por el mismo motivo
    // que CookieBanner — el setState queda dentro de un callback y no
    // dispara `react-hooks/set-state-in-effect`.
    queueMicrotask(() => {
      const pending = consumePendingContactPrefill();
      if (pending) {
        setMessage(pending.message);
        if (pending.serviceSlug) setServiceSlug(pending.serviceSlug);
        setFormContext("Cotizador");
      }
    });

    return () => window.removeEventListener(CONTACT_PREFILL_EVENT, handlePrefill);
  }, []);

  // Validations
  const isNameValid = name.trim().length >= 2;
  const isEmailValid = isValidRealEmail(email);
  const isMessageValid = message.trim().length >= 10;
  const isServiceOtherValid = serviceSlug !== "otro" || serviceOther.trim().length >= 3;

  const isFormValid = isNameValid && isEmailValid && isMessageValid && isServiceOtherValid && acceptedPolicies;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isFormValid) {
      setSubmitAttempted(true);
      setTouched({ name: true, email: true, message: true, serviceOther: true });
      const firstInvalidId = !isNameValid
        ? `${idPrefix}-name`
        : !isEmailValid
          ? `${idPrefix}-email`
          : !isMessageValid
            ? `${idPrefix}-message`
            : !isServiceOtherValid
              ? `${idPrefix}-service-other`
              : !acceptedPolicies
                ? "habeas-data"
                : null;
      if (firstInvalidId) {
        document.getElementById(firstInvalidId)?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: name.trim(),
      email: email.trim(),
      phone: formData.get("phone") || "",
      message: message.trim(),
      serviceSlug: serviceSlug || undefined,
      serviceOther: serviceSlug === "otro" ? serviceOther.trim() : undefined,
      formContext,
      // El correo de confirmación (ver lib/leadConfirmationEmail.ts) se
      // manda en el mismo idioma en que la persona vio y llenó el
      // formulario — este componente ya conoce su propio locale por prop.
      locale,
      // `acceptedPolicies` ya bloqueaba el envío en el navegador, pero
      // nunca viajaba al servidor — el backend no tenía forma de
      // demostrar que hubo autorización real (bug real de cumplimiento,
      // ver ContactSchema en /api/contact/route.ts, que ahora la exige).
      consent: acceptedPolicies,
      ...getAttribution(),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Navegación completa del navegador (no router.push): la acción de
        // conversión de Google Ads "Envío de formulario para clientes
        // potenciales" es de tipo "Carga de página" con condición de URL
        // sobre /gracias — el tag de Google (gtag.js, ver layout.tsx) solo
        // reevalúa la URL actual en una carga de documento real. Un
        // router.push (navegación SPA de Next.js) no dispara esa carga, así
        // que la conversión nunca se registraba aunque el formulario
        // funcionara. No reemplazar por router.push sin agregar un disparo
        // manual de gtag('config'|'event', ...) equivalente.
        window.location.href = thankYouPath;
      } else {
        setErrorMessage(result.error || contactData.errorGeneral);
      }
    } catch (err) {
      logError("Error al enviar el formulario de contacto", err);
      setErrorMessage(contactData.errorConnection);
    } finally {
      setIsSubmitting(false);
    }
  }

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
              <SectionEyebrow className="mb-3">{contactData.badge}</SectionEyebrow>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {contactData.title}
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
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nombre completo */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-name`} className={labelClasses}>
              {contactData.placeholders.name} <span className="text-accent-strong">*</span>
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
              placeholder={contactData.placeholders.namePlaceholder}
              className={`${baseFieldClasses} ${
                touched.name && !isNameValid
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                  : isNameValid
                  ? "border-emerald-500/60 focus:border-accent focus:ring-accent/30"
                  : "border-foreground/10 focus:border-accent focus:ring-accent/30"
              }`}
            />
            {touched.name && !isNameValid && (
              <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <WarningCircle size={12} /> {contactData.validation.nameError}
              </p>
            )}
          </div>

          {/* Correo electrónico */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-email`} className={labelClasses}>
              {contactData.placeholders.email} <span className="text-accent-strong">*</span>
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
              placeholder={contactData.placeholders.emailPlaceholder}
              className={`${baseFieldClasses} ${
                touched.email && !isEmailValid
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                  : isEmailValid
                  ? "border-emerald-500/60 focus:border-accent focus:ring-accent/30"
                  : "border-foreground/10 focus:border-accent focus:ring-accent/30"
              }`}
            />
            {touched.email && !isEmailValid && (
              <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <WarningCircle size={12} /> {contactData.validation.emailError}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <PhoneField
            locale={locale}
            id={`${idPrefix}-phone`}
            label={contactData.placeholders.phone}
            countryLabel={contactData.placeholders.phoneCountry}
            countryPlaceholder={contactData.placeholders.phoneCountryEmpty}
            fieldClassName={`${baseFieldClasses} border-foreground/10 focus:border-accent focus:ring-accent/30`}
            labelClassName={labelClasses}
          />

          {/* Servicio solicitado (opcional) — antes el CRM registraba todo
              lead como "Contacto Web" sin importar qué necesitara la
              persona; ahora se le deja elegir del catálogo real de
              servicios o teclear el suyo. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-service`} className={labelClasses}>
              {contactData.placeholders.service}
            </label>
            <select
              id={`${idPrefix}-service`}
              name="serviceSlug"
              value={serviceSlug}
              onChange={(e) => setServiceSlug(e.target.value)}
              className={`${baseFieldClasses} border-foreground/10 focus:border-accent focus:ring-accent/30`}
            >
              <option value="">{contactData.placeholders.serviceEmptyOption}</option>
              {services.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.title}
                </option>
              ))}
              <option value="otro">{contactData.placeholders.serviceOtherOption}</option>
            </select>
          </div>

          {serviceSlug === "otro" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${idPrefix}-service-other`} className={labelClasses}>
                {contactData.placeholders.serviceOtherLabel}
              </label>
              <input
                id={`${idPrefix}-service-other`}
                type="text"
                name="serviceOther"
                value={serviceOther}
                onChange={(e) => setServiceOther(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, serviceOther: true }))}
                maxLength={120}
                placeholder={contactData.placeholders.serviceOtherPlaceholder}
                className={`${baseFieldClasses} ${
                  touched.serviceOther && !isServiceOtherValid
                    ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                    : "border-foreground/10 focus:border-accent focus:ring-accent/30"
                }`}
              />
              {touched.serviceOther && !isServiceOtherValid && (
                <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <WarningCircle size={12} /> {contactData.validation.serviceOtherError}
                </p>
              )}
            </div>
          )}

          {/* Mensaje */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-message`} className={labelClasses}>
              {contactData.placeholders.message} <span className="text-accent-strong">*</span>
            </label>
            <textarea
              id={`${idPrefix}-message`}
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
              required
              rows={4}
              placeholder={contactData.placeholders.messagePlaceholder}
              className={`${baseFieldClasses} h-auto py-3 ${
                touched.message && !isMessageValid
                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                  : isMessageValid
                  ? "border-emerald-500/60 focus:border-accent focus:ring-accent/30"
                  : "border-foreground/10 focus:border-accent focus:ring-accent/30"
              }`}
            />
            {touched.message && !isMessageValid && (
              <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <WarningCircle size={12} /> {contactData.validation.messageError}
              </p>
            )}
          </div>

          {/* Habeas Data Checkbox */}
          <div>
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border bg-foreground/[0.02] px-3.5 py-3 transition-colors hover:border-foreground/20",
                submitAttempted && !acceptedPolicies
                  ? "border-red-500/80"
                  : "border-foreground/10"
              )}
            >
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
                  className="font-semibold underline hover:text-accent-strong transition-colors"
                >
                  {contactData.habeasData.linkText}
                </a>
              </label>
            </div>
            {submitAttempted && !acceptedPolicies && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-medium">
                <WarningCircle size={12} /> {contactData.validation.acceptPolicyHint}
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-600 font-medium flex items-center gap-2">
              <WarningCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón Submit & Notificación de estado — siempre habilitado
              (salvo mientras envía): un botón gris hasta marcar la casilla
              se leía como roto. Un envío inválido marca los campos y mueve
              el foco al primero con error, en vez de bloquear el clic. */}
          <div className="flex flex-col gap-2 mt-1">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? contactData.sendingLabel : contactData.submitLabel}
            </Button>

            {submitAttempted && !isFormValid && acceptedPolicies && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-foreground/60 text-center">
                <ShieldCheck size={13} className="text-accent shrink-0" />
                <span>{contactData.validation.completeFieldsHint}</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
