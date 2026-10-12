"use client";

import { useId, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { PhoneField } from "@/components/ui/PhoneField";
import { getAttribution } from "@/lib/attribution";
import { isValidRealEmail } from "@/lib/emailValidation";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";

export interface LandingFormCopy {
  title: string;
  intro: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  phoneCountry: string;
  phoneCountryEmpty: string;
  typeLegend: string;
  typeOptions: { label: string; service: string }[];
  message: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  consent: string;
  privacyLink: string;
  privacyUrl: string;
  nameError: string;
  emailError: string;
  consentHint: string;
  errorGeneral: string;
  errorConnection: string;
}

// Ruta fija: la navegación completa (no `router.push`) es a propósito, ver LandingForm.
const THANK_YOU_PATH = "/gracias";

const fieldClasses =
  "h-11 w-full rounded-lg border bg-background px-4 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30";
const labelClasses = "text-sm font-medium text-foreground/80";

/**
 * Formulario corto de la landing de campaña. Envía al mismo `/api/contact` que el de la home (mismo CRM,
 * mismo correo de confirmación, misma conversión en /gracias), pero con menos campos: nombre, correo,
 * qué necesita (botones, no desplegable) y, opcionales, WhatsApp y un mensaje. En el CRM entra como
 * "Landing Ads". Se envía con navegación completa a /gracias (no `router.push`): la conversión de Google
 * Ads se mide por la carga de esa página.
 */
export function LandingForm({ copy, defaultService }: { copy: LandingFormCopy; defaultService: string }) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(defaultService);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false });
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  const nameValid = name.trim().length >= 2;
  const emailValid = isValidRealEmail(email);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!nameValid || !emailValid || !consent) {
      setAttempted(true);
      setShaking(true);
      setTouched({ name: true, email: true });
      const firstInvalid = !nameValid ? `${id}-name` : !emailValid ? `${id}-email` : `${id}-consent`;
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);
    // En un envío exitoso el navegador navega a /gracias: el botón se queda en "Enviando" hasta que la página se descarga.
    let navigating = false;

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: formData.get("phone") || "",
          message: message.trim(),
          serviceSlug: service || undefined,
          formContext: "Landing Ads",
          locale: "es",
          consent,
          ...getAttribution(),
          // La variante de la página desde la que se envía (/landing, /landing/precio…): es el dato del
          // formulario, no del navegador, así que viaja siempre, haya o no consentimiento de medición.
          landing_page: window.location.pathname,
        }),
      });

      if (response.ok) {
        navigating = true;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- carga completa a propósito: la conversión de Google Ads se mide por la carga de /gracias.
        window.location.href = THANK_YOU_PATH;
      } else {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error || copy.errorGeneral);
        setShaking(true);
      }
    } catch (err) {
      logError("Error al enviar el formulario de la landing", err);
      setError(copy.errorConnection);
      setShaking(true);
    } finally {
      if (!navigating) setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{copy.title}</h2>
        <p className="mt-1 text-sm text-foreground/80">{copy.intro}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-name`} className={labelClasses}>
          {copy.name}
        </label>
        <input
          id={`${id}-name`}
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          autoComplete="name"
          required
          aria-invalid={touched.name && !nameValid ? true : undefined}
          aria-describedby={touched.name && !nameValid ? `${id}-name-error` : undefined}
          placeholder={copy.namePlaceholder}
          className={cn(fieldClasses, touched.name && !nameValid ? "border-red-500/80" : "border-foreground/10")}
        />
        {touched.name && !nameValid && <FieldError id={`${id}-name-error`}>{copy.nameError}</FieldError>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-email`} className={labelClasses}>
          {copy.email}
        </label>
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          autoComplete="email"
          required
          aria-invalid={touched.email && !emailValid ? true : undefined}
          aria-describedby={touched.email && !emailValid ? `${id}-email-error` : undefined}
          placeholder={copy.emailPlaceholder}
          className={cn(fieldClasses, touched.email && !emailValid ? "border-red-500/80" : "border-foreground/10")}
        />
        {touched.email && !emailValid && <FieldError id={`${id}-email-error`}>{copy.emailError}</FieldError>}
      </div>

      <fieldset className="min-w-0">
        <legend className={labelClasses}>{copy.typeLegend}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {copy.typeOptions.map((option) => {
            const selected = service === option.service;
            return (
              <label
                key={option.label}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                  selected
                    ? "border-foreground bg-foreground font-medium text-background"
                    : "border-foreground/15 text-foreground/80 hover:border-foreground/30",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-type`}
                  value={option.service}
                  checked={selected}
                  onChange={() => setService(option.service)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <PhoneField
        locale="es"
        id={`${id}-phone`}
        label={copy.phone}
        countryLabel={copy.phoneCountry}
        countryPlaceholder={copy.phoneCountryEmpty}
        fieldClassName={cn(fieldClasses, "border-foreground/10")}
        labelClassName={labelClasses}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-message`} className={labelClasses}>
          {copy.message}
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder={copy.messagePlaceholder}
          className={cn(fieldClasses, "h-auto border-foreground/10 py-3")}
        />
      </div>

      <div>
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-3.5 py-3",
            attempted && !consent ? "border-red-500/80" : "border-foreground/10",
          )}
        >
          <input
            id={`${id}-consent`}
            type="checkbox"
            name="habeasData"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-foreground/30 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <label htmlFor={`${id}-consent`} className="cursor-pointer text-xs leading-relaxed text-foreground/80">
            {copy.consent}{" "}
            <a
              href={copy.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-accent-text"
            >
              {copy.privacyLink}
            </a>
          </label>
        </div>
        {attempted && !consent && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
            <WarningCircle size={12} aria-hidden="true" /> {copy.consentHint}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="animate-enter-error flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-sm font-medium text-red-600"
        >
          <WarningCircle size={16} className="shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div
        className={cn(shaking && "animate-shake")}
        onAnimationEnd={(e) => {
          if (e.animationName === "shake") setShaking(false);
        }}
      >
        <Button type="submit" size="lg" variant="accent" loading={submitting} className="w-full">
          {submitting ? copy.sending : copy.submit}
        </Button>
      </div>
    </form>
  );
}
