"use client";

import { useEffect, useId, useState } from "react";
import { Plus, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { PhoneField } from "@/components/ui/PhoneField";
import { getContactContent } from "@/content/contact";
import { getServicesContent } from "@/content/services";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getAttribution } from "@/lib/attribution";
import { logError } from "@/lib/logger";
import {
  CONTACT_PREFILL_EVENT,
  consumePendingContactPrefill,
  type ContactPrefillDetail,
} from "@/lib/contactPrefillEvent";
import { clearContactDraft, readContactDraft, saveContactDraft } from "@/lib/contactDraft";


export const baseFieldClasses =
  "h-11 rounded-lg border bg-background px-4 text-sm outline-none transition-all duration-200 focus:ring-2";
export const labelClasses = "text-sm font-medium text-foreground/80";

export function isValidRealEmail(emailStr: string): boolean {
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


export interface ContactFormPrefill {
  name?: string;
  email?: string;
  message?: string;
  serviceSlug?: string;
  /** Llegó desde el cotizador: el CRM lo registra como "Cotizador". */
  fromEstimator?: boolean;
}

export function ContactForm({
  locale = defaultLocale,
  variant = "section",
  prefill,
}: {
  locale?: Locale;
  variant?: "section" | "modal";
  prefill?: ContactFormPrefill;
}) {
  const isModal = variant === "modal";
  // Borrador en memoria (no en storage): sobrevive a cerrar y reabrir el modal
  // dentro de la misma visita, sin guardar datos personales en el navegador.
  const [draft] = useState(readContactDraft);
  const contactData = getContactContent(locale);
  const { services } = getServicesContent(locale);
  // Ruta de gracias por locale — mismo criterio que localeHomePath (es sin
  // prefijo, el resto con /{locale}), pero /blog y lo legal son las únicas
  // rutas sin prefijo hoy documentadas en CLAUDE.md; esta sí tiene versión
  // por idioma (ver src/app/{en,fr}/gracias/page.tsx).
  const thankYouPath = locale === defaultLocale ? "/gracias" : `/${locale}/gracias`;

  // Controlled form state
  const [name, setName] = useState(() => prefill?.name ?? draft.name);
  const [email, setEmail] = useState(() => prefill?.email ?? draft.email);
  const [message, setMessage] = useState(() => prefill?.message ?? draft.message);
  const [serviceSlug, setServiceSlug] = useState(() => prefill?.serviceSlug ?? draft.serviceSlug);
  const [serviceOther, setServiceOther] = useState("");
  // "Cotizador" cuando el envío llegó prellenado desde ProjectEstimator —
  // permite distinguir en el CRM a quien ya vio precios de quien solo
  // escribió el formulario directo (ver lib/leadServices.ts).
  const [formContext, setFormContext] = useState<"Formulario Web" | "Cotizador">(prefill?.fromEstimator ? "Cotizador" : "Formulario Web");
  const [showPhone, setShowPhone] = useState(variant === "section");
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
  // Temblor corto del bloque del botón en un envío fallido (inválido o error
  // del servidor). Es una clase CSS que se quita al terminar (`onAnimationEnd`):
  // no se usa `key` para reiniciarla porque remontar el botón le quitaría el
  // foco a quien envía con teclado. Con reduced motion la animación no corre.
  const [shaking, setShaking] = useState(false);
  const idPrefix = useId();

  // Escucha el prefill del cotizador (ver lib/contactPrefillEvent.ts) — ya
  // no escribe directo en el DOM del textarea, así que el estado de React
  // (y por lo tanto lo que se envía) siempre refleja lo que se ve en pantalla.
  useEffect(() => {
    if (variant !== "section") return;
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
  }, [variant]);

  useEffect(() => {
    saveContactDraft({ name, email, message, serviceSlug });
  }, [name, email, message, serviceSlug]);

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
      setShaking(true);
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
                ? `${idPrefix}-consent`
                : null;
      if (firstInvalidId) {
        document.getElementById(firstInvalidId)?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    // En un envío exitoso el navegador navega a /gracias; el botón debe
    // seguir en "enviando" hasta que la página se descarga (antes volvía a
    // "Enviar" un instante, un parpadeo que invitaba a un segundo clic).
    let navigating = false;

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
        navigating = true;
        clearContactDraft();
        window.location.href = thankYouPath;
      } else {
        setErrorMessage(result.error || contactData.errorGeneral);
        setShaking(true);
      }
    } catch (err) {
      logError("Error al enviar el formulario de contacto", err);
      setErrorMessage(contactData.errorConnection);
      setShaking(true);
    } finally {
      if (!navigating) setIsSubmitting(false);
    }
  }

  // noValidate: sin él, `required` hace que el navegador intercepte el envío con
  // su burbuja nativa (en el idioma del SO, no del sitio) y `handleSubmit` — que
  // marca los campos, muestra los errores traducidos y mueve el foco — nunca
  // corría con campos vacíos. `required` se queda por semántica (aria-required).
  return (
        <form noValidate onSubmit={handleSubmit} className={cn("flex flex-col", isModal ? "gap-4" : "gap-5")}>
          <div className={cn("flex flex-col", isModal ? "gap-4 sm:grid sm:grid-cols-2" : "gap-5")}>
          {/* Nombre completo */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-name`} className={labelClasses}>
              {contactData.placeholders.name} <span className="text-accent-strong">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              aria-invalid={touched.name && !isNameValid ? true : undefined}
              aria-describedby={touched.name && !isNameValid ? `${idPrefix}-name-error` : undefined}
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
              <FieldError id={`${idPrefix}-name-error`}>{contactData.validation.nameError}</FieldError>
            )}
          </div>

          {/* Correo electrónico */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-email`} className={labelClasses}>
              {contactData.placeholders.email} <span className="text-accent-strong">*</span>
            </label>
            <input
              id={`${idPrefix}-email`}
              aria-invalid={touched.email && !isEmailValid ? true : undefined}
              aria-describedby={touched.email && !isEmailValid ? `${idPrefix}-email-error` : undefined}
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
              <FieldError id={`${idPrefix}-email-error`}>{contactData.validation.emailError}</FieldError>
            )}
          </div>

          </div>

          {/* Teléfono — en el modal queda tras un enlace: es opcional y cada
              campo visible de más baja la tasa de envío. */}
          {showPhone ? (
          <PhoneField
            locale={locale}
            id={`${idPrefix}-phone`}
            label={contactData.placeholders.phone}
            countryLabel={contactData.placeholders.phoneCountry}
            countryPlaceholder={contactData.placeholders.phoneCountryEmpty}
            fieldClassName={`${baseFieldClasses} border-foreground/10 focus:border-accent focus:ring-accent/30`}
            labelClassName={labelClasses}
          />
          ) : (
            <button
              type="button"
              onClick={() => setShowPhone(true)}
              className="-mt-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-1 text-sm font-medium text-foreground/80 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              {contactData.placeholders.addPhone}
            </button>
          )}

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
                aria-invalid={touched.serviceOther && !isServiceOtherValid ? true : undefined}
                aria-describedby={touched.serviceOther && !isServiceOtherValid ? `${idPrefix}-service-other-error` : undefined}
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
                <FieldError id={`${idPrefix}-service-other-error`}>{contactData.validation.serviceOtherError}</FieldError>
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
              aria-invalid={touched.message && !isMessageValid ? true : undefined}
              aria-describedby={touched.message && !isMessageValid ? `${idPrefix}-message-error` : undefined}
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
              required
              rows={isModal ? 3 : 4}
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
              <FieldError id={`${idPrefix}-message-error`}>{contactData.validation.messageError}</FieldError>
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
                id={`${idPrefix}-consent`}
                name="habeasData"
                checked={acceptedPolicies}
                onChange={(e) => setAcceptedPolicies(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-foreground/30 text-accent outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              />
              <label htmlFor={`${idPrefix}-consent`} className="text-xs text-foreground/80 leading-relaxed select-none cursor-pointer">
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
            <div
              role="alert"
              className="animate-enter-error flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-sm font-medium text-red-600"
            >
              <WarningCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón Submit & Notificación de estado — siempre habilitado
              (salvo mientras envía): un botón gris hasta marcar la casilla
              se leía como roto. Un envío inválido marca los campos y mueve
              el foco al primero con error, en vez de bloquear el clic. */}
          <div
            className={cn(
              "mt-1 flex flex-col gap-2",
              isModal && "sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-foreground/10 bg-background px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-8 sm:-mb-8 sm:px-8",
              shaking && "animate-shake",
            )}
            onAnimationEnd={(e) => {
              if (e.animationName === "shake") setShaking(false);
            }}
          >
            <Button type="submit" size="lg" loading={isSubmitting}>
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
  );
}
