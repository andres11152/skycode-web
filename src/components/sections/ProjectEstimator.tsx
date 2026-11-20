"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, EnvelopeSimple, Lightning, Spinner, Tag, WarningCircle } from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Magnetic } from "@/components/ui/Magnetic";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getProjectEstimatorContent, getDefaultCurrency } from "@/content/projectEstimator";
import { defaultLocale, t, type Locale } from "@/lib/i18n";
import { useGeoCountry } from "@/lib/useGeoCountry";
import { openContactModal } from "@/lib/contactModalEvent";
import { ESTIMATOR_TYPE_TO_SERVICE_SLUG } from "@/lib/leadServices";
import { logError } from "@/lib/logger";
import { trackEvent } from "@/lib/analytics";
import { DURATION, EASE_OUT, SPRING_SOFT } from "@/lib/animations";

export function ProjectEstimator({ locale = defaultLocale }: { locale?: Locale }) {
  const content = getProjectEstimatorContent(locale);
  const { projectTypes, addons } = content;

  const [currency, setCurrency] = useState<"COP" | "USD">(getDefaultCurrency(locale));
  const [selectedType, setSelectedType] = useState<string>(projectTypes[0].id);
  // Solo Colombia ve COP por defecto; cualquier otro país ve USD, sin importar
  // el idioma. Si no hay señal de país (host sin geo-IP, o dev local), se
  // respeta el default por locale que ya trae el estado inicial.
  const geoCountry = useGeoCountry();
  useEffect(() => {
    const applyGeoCurrency = () => {
      if (!geoCountry) return;
      setCurrency(geoCountry === "CO" ? "COP" : "USD");
    };
    applyGeoCurrency();
  }, [geoCountry]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([addons[0].id, addons[1].id]);
  const [urgency, setUrgency] = useState<"standard" | "express">("standard");

  // Captura suave: "Recíbelo por correo" — solo pide el email, sin
  // obligar a llenar el formulario de contacto completo. Ver
  // POST /api/estimator/quote-email y lib/estimatorQuote.ts.
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [captureEmail, setCaptureEmail] = useState("");
  // Autorización de tratamiento de datos (Ley 1581/Decreto 1377) — esta
  // captura solo pedía el correo, sin ningún checkbox de consentimiento,
  // a diferencia del formulario grande de Contact.tsx (bug real de
  // cumplimiento). El backend (/api/estimator/quote-email) ya exige
  // `consent: true` server-side; este checkbox es lo que hace que ese
  // valor sea real, no un `true` fijo mandado sin que la persona lo haya
  // marcado.
  const [captureConsent, setCaptureConsent] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Barra de precio fija (por debajo de `lg`): en móvil la tarjeta de resumen queda ~4 pantallas debajo
  // de las opciones, así que se elegía sin ver cómo cambiaba el precio (hallazgo de la auditoría móvil).
  // Se retira cuando la tarjeta real o el pie están en pantalla, para no mostrar el precio dos veces.
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryInView, setSummaryInView] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const targets = [summaryRef.current, document.querySelector("footer")].filter(
      (el): el is HTMLDivElement | HTMLElement => el !== null,
    );
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setSummaryInView(visible.size > 0);
    });
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scrollToSummary = () => {
    summaryRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  const currentType = projectTypes.find((type) => type.id === selectedType) || projectTypes[0];

  // Price Calculation according to active currency
  const basePrice = currency === "COP" ? currentType.priceCop : currentType.priceUsd;

  const addonsTotal = selectedAddons.reduce((acc, addonId) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon) return acc;
    return acc + (currency === "COP" ? addon.priceCop : addon.priceUsd);
  }, 0);

  const addonsWeeks = selectedAddons.reduce((acc, addonId) => {
    const addon = addons.find((a) => a.id === addonId);
    return acc + (addon ? addon.weeks : 0);
  }, 0);

  const rawPrice = basePrice + addonsTotal;
  const totalPrice = urgency === "express" ? Math.round(rawPrice * 1.25) : rawPrice;

  const rawWeeks = Math.ceil(currentType.baseWeeks + addonsWeeks);
  const totalWeeks = urgency === "express" ? Math.max(2, Math.round(rawWeeks * 0.75)) : rawWeeks;

  // NumberFlow mide layout (getBoundingClientRect/offsetWidth) en cada
  // cambio de valor para su animación FLIP — con el valor directo, ese
  // reflow forzado ocurría dentro del clic en cada opción y sumaba al INP.
  // Diferido, el clic pinta primero la opción seleccionada y el número se
  // actualiza en el render siguiente, fuera de la ventana que mide INP.
  const displayPrice = useDeferredValue(totalPrice);
  const displayWeeks = useDeferredValue(totalWeeks);

  // Medición del cotizador (GA4): `quote_start` una sola vez, con la primera elección de la persona (tipo,
  // extra o ritmo; la moneda no cuenta, la fija también la geolocalización); `quote_complete` al terminar,
  // abriendo el contacto prellenado o recibiendo la cotización por correo.
  const quoteStarted = useRef(false);
  const markQuoteStart = (projectType: string) => {
    if (quoteStarted.current) return;
    quoteStarted.current = true;
    trackEvent("quote_start", { project_type: projectType });
  };
  const trackQuoteComplete = (method: "contact_form" | "email") => {
    trackEvent("quote_complete", {
      method,
      project_type: selectedType,
      pace: urgency,
      addon_count: selectedAddons.length,
      currency,
      estimated_value: totalPrice,
      estimated_weeks: totalWeeks,
    });
  };

  const selectType = (id: string) => {
    markQuoteStart(id);
    setSelectedType(id);
  };

  const selectPace = (pace: "standard" | "express") => {
    markQuoteStart(selectedType);
    setUrgency(pace);
  };

  const toggleAddon = (id: string) => {
    markQuoteStart(selectedType);
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatPrice = (val: number) => {
    if (currency === "COP") {
      return `$${val.toLocaleString("es-CO")} COP`;
    }
    return `$${val.toLocaleString("en-US")} USD`;
  };

  const handlePreFillContact = () => {
    const addonTitles = selectedAddons
      .map((id) => addons.find((a) => a.id === id)?.title)
      .filter(Boolean)
      .join(", ");

    const text = t(content.whatsappMessageTemplate, {
      type: currentType.title,
      addons: addonTitles || content.noAddonsLabel,
      pace: urgency === "express" ? content.pace.expressTitle : content.pace.standardTitle,
      total: formatPrice(totalPrice),
      weeks: String(totalWeeks),
    });

    trackQuoteComplete("contact_form");

    // Abre el modal de contacto ya prellenado (mensaje + servicio real para el
    // CRM): la persona no pierde la página ni el resumen que acaba de armar.
    openContactModal({
      message: text,
      serviceSlug: ESTIMATOR_TYPE_TO_SERVICE_SLUG[selectedType],
      fromEstimator: true,
    });
  };

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captureStatus === "sending" || !captureConsent) return;

    setCaptureStatus("sending");
    try {
      const res = await fetch("/api/estimator/quote-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: captureEmail.trim(),
          typeId: selectedType,
          addonIds: selectedAddons,
          pace: urgency,
          currency,
          locale,
          consent: captureConsent,
        }),
      });

      if (!res.ok) throw new Error("request failed");
      setCaptureStatus("sent");
      // El correo crea un lead en el CRM ("Cotizador (solo email)"): cuenta como cotización terminada y como lead.
      trackQuoteComplete("email");
      trackEvent("generate_lead", { form_location: "estimator_email", lead_source: "Cotizador (solo email)" });
    } catch (err) {
      logError("Error al enviar la cotización por correo", err);
      setCaptureStatus("error");
    }
  };

  return (
    <section
      id="cotizador"
      aria-label={content.sectionAria}
      className="scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28 bg-gradient-to-b from-transparent via-foreground/[0.02] to-transparent"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header — alineado a la izquierda, mismo eje que el resto de
            secciones de la home (antes centrado con `items-center
            text-center`, la única sección así fuera de Contacto — bug real
            de alineación, visto en auditoría visual). El switcher de moneda
            es un control, no texto descriptivo: se mueve a la derecha en
            desktop, mismo patrón de header que Services/Portfolio. */}
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <SectionEyebrow className="mb-3">{content.badge}</SectionEyebrow>
            {/* H1 de la página /cotizador (este componente solo se monta ahí). */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {content.h1}
            </h1>
            <p className="mt-3 text-base text-foreground/80">{content.subtitle}</p>
          </div>

          {/* Currency Switcher Toggle */}
          <div className="flex items-center gap-2 self-start rounded-full border border-foreground/15 bg-background p-1.5 shadow-sm">
            <button
              onClick={() => setCurrency("COP")}
              className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors sm:min-h-0 ${
                currency === "COP"
                  ? "bg-accent-strong text-accent-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <span>{content.currency.copLabel}</span>
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors sm:min-h-0 ${
                currency === "USD"
                  ? "bg-accent-strong text-accent-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <span>{content.currency.usdLabel}</span>
            </button>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Selectors */}
          <div className="space-y-8">
            {/* 1. Tipo de Proyecto. Los títulos de paso son h2 (van directo bajo el h1 de /cotizador):
                como h3 saltaban un nivel (Lighthouse `heading-order`). */}
            <div>
              <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground/60 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-strong text-xs text-accent-foreground">1</span>
                {content.steps.type}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {projectTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  const displayPrice = currency === "COP" ? type.priceCop : type.priceUsd;

                  return (
                    // <button> (antes <div onClick>): una tarjeta clicable sin rol ni
                    // tabIndex no se alcanzaba con el teclado ni se anunciaba. Dentro
                    // solo contenido de frase (span, no div/h4/p) para que el HTML
                    // sea válido.
                    <button
                      type="button"
                      key={type.id}
                      aria-pressed={isSelected}
                      onClick={() => selectType(type.id)}
                      className={`group relative flex w-full cursor-pointer flex-col justify-between rounded-xl border p-4 text-left outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:active:scale-100 ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_15%,transparent)]"
                          : "border-foreground/10 bg-background/50 hover:border-foreground/20"
                      }`}
                    >
                      <span className="block">
                        <span className="mb-2 flex items-center justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 ${
                            isSelected ? "bg-accent-strong text-accent-foreground" : "bg-foreground/5 text-foreground/70"
                          }`}>
                            <Icon size={18} />
                          </span>
                          {isSelected && <CheckCircle size={16} className="animate-pop-in text-accent" />}
                        </span>
                        <span className="block text-sm font-bold text-foreground">{type.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-foreground/70">{type.desc}</span>
                      </span>

                      <span className="mt-3 block border-t border-foreground/5 pt-2 text-xs">
                        <span className="font-mono font-bold text-accent-text">
                          {content.fromLabel} {formatPrice(displayPrice)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Módulos Adicionales */}
            <div>
              <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground/60 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-strong text-xs text-accent-foreground">2</span>
                {content.steps.addons}
              </h2>
              <div className="grid gap-2.5">
                {addons.map((addon) => {
                  const isChecked = selectedAddons.includes(addon.id);
                  const addonPrice = currency === "COP" ? addon.priceCop : addon.priceUsd;

                  return (
                    <button
                      type="button"
                      key={addon.id}
                      aria-pressed={isChecked}
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-3.5 text-left text-xs outline-none transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] motion-reduce:active:scale-100 ${
                        isChecked
                          ? "border-accent/50 bg-accent/5 font-semibold text-foreground"
                          : "border-foreground/10 bg-background/40 text-foreground/80 hover:border-foreground/20"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors duration-200 ${
                          isChecked ? "border-accent bg-accent-strong text-accent-foreground" : "border-foreground/30"
                        }`}>
                          {isChecked && <CheckCircle size={12} className="animate-pop-in" />}
                        </span>
                        <span>{addon.title}</span>
                      </span>
                      <span className="font-mono text-foreground/60">+{formatPrice(addonPrice)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Urgencia */}
            <div>
              <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground/60 mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-strong text-xs text-accent-foreground">3</span>
                {content.steps.pace}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={urgency === "standard"}
                  onClick={() => selectPace("standard")}
                  className={`rounded-xl border p-3 text-left text-xs font-medium outline-none transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:active:scale-100 ${
                    urgency === "standard"
                      ? "border-accent bg-accent/10 text-foreground font-bold"
                      : "border-foreground/10 bg-background/40 text-foreground/70"
                  }`}
                >
                  <div className="font-bold mb-0.5">{content.pace.standardTitle}</div>
                  <div className="text-xs text-foreground/60">{content.pace.standardDesc}</div>
                </button>
                <button
                  type="button"
                  aria-pressed={urgency === "express"}
                  onClick={() => selectPace("express")}
                  className={`rounded-xl border p-3 text-left text-xs font-medium outline-none transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:active:scale-100 ${
                    urgency === "express"
                      ? "border-accent bg-accent/10 text-foreground font-bold"
                      : "border-foreground/10 bg-background/40 text-foreground/70"
                  }`}
                >
                  <div className="font-bold mb-0.5 text-accent-text flex items-center gap-1">
                    <Lightning size={12} /> {content.pace.expressTitle}
                  </div>
                  <div className="text-xs text-foreground/60">{content.pace.expressDesc}</div>
                </button>
              </div>
            </div>
          </div>

          {/* Estimation Summary Box */}
          <div ref={summaryRef} className="scroll-mt-24 lg:sticky lg:top-28 h-fit">
            {/* Sin BorderBeam (ver Highlights.tsx): un borde en loop
                infinito alrededor de la tarjeta de precio compite con el
                número que cambia en vivo (NumberFlow) — demasiado
                movimiento en el mismo punto. */}
            <SpotlightCard className="relative overflow-hidden rounded-xl border border-foreground/15 bg-inverse/95 p-6 text-on-inverse shadow-2xl">
              <div className="flex items-center justify-between border-b border-on-inverse/10 pb-4 mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-inverse/60">
                  {content.summary.title}
                </span>
                <span className="rounded-full bg-on-inverse/10 px-2.5 py-0.5 text-xs font-bold text-on-inverse">
                  {currency}
                </span>
              </div>

              {/* Price Display */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center justify-between text-xs text-on-inverse/60">
                  <span>{content.summary.investmentLabel}</span>
                  <span className="text-accent font-bold text-xs flex items-center gap-1">
                    <Tag size={10} /> {content.summary.competitiveRateLabel}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-accent leading-tight flex items-baseline gap-1">
                  <span>$</span>
                  <NumberFlow
                    value={displayPrice}
                    // Sin `locales`, NumberFlow cae al locale del
                    // navegador (`Intl.NumberFormat` por defecto) — en un
                    // navegador en inglés esto renderizaba "12,850,000"
                    // (comas) justo debajo de tarjetas con "10.500.000"
                    // (puntos, vía `formatPrice`/`toLocaleString("es-CO")`
                    // explícito) — dos formatos distintos en la misma
                    // pantalla (bug real, visto en auditoría visual).
                    locales={currency === "COP" ? "es-CO" : "en-US"}
                    format={{ maximumFractionDigits: 0 }}
                    transformTiming={{ duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                    spinTiming={{ duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                  />
                  <span className="text-sm font-semibold text-on-inverse/70">{currency}</span>
                </div>
                <div className="text-xs text-on-inverse/50">
                  {currency === "COP"
                    ? `(~ $${Math.round(displayPrice / 4100).toLocaleString("en-US")} USD aprox)`
                    : `(~ $${(displayPrice * 4100).toLocaleString("es-CO")} COP aprox)`}
                </div>
              </div>

              {/* Time & Details */}
              <div className="space-y-3 border-t border-on-inverse/10 pt-4 text-xs font-mono">
                <div className="flex items-center justify-between text-on-inverse/80">
                  <span className="flex items-center gap-1.5 text-on-inverse/60">
                    <Clock size={14} className="text-accent" /> {content.summary.timeLabel}
                  </span>
                  <span className="font-bold text-on-inverse flex items-center gap-1">
                    <NumberFlow
                      value={displayWeeks}
                      transformTiming={{ duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                    />
                    <span>{content.summary.weeksSuffix}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-inverse/80">
                  <span className="text-on-inverse/60">{content.summary.ipLabel}</span>
                  <span className="text-on-inverse font-bold">{content.summary.ipValue}</span>
                </div>
                <div className="flex items-center justify-between text-on-inverse/80">
                  <span className="text-on-inverse/60">{content.summary.paymentLabel}</span>
                  <span className="text-on-inverse font-bold">{content.summary.paymentValue}</span>
                </div>
                <div className="flex items-center justify-between text-on-inverse/80">
                  <span className="text-on-inverse/60">{content.summary.warrantyLabel}</span>
                  <span className="text-on-inverse font-bold">{content.summary.warrantyValue}</span>
                </div>
              </div>

              {/* CTA Button */}
              <Magnetic strength={0.25} range={60}>
                <button
                  onClick={handlePreFillContact}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-accent-foreground shadow-lg hover:brightness-90 active:scale-[0.98] motion-reduce:active:scale-100 transition-[filter,transform] duration-200"
                >
                  <span>{content.summary.ctaLabel}</span>
                  <ArrowRight size={14} />
                </button>
              </Magnetic>

              {/* Captura suave: "Recíbelo por correo" — solo el email, sin
                  obligar a llenar el formulario de contacto completo (ver
                  handleEmailCapture arriba y CLAUDE.md, "Cotizador: captura
                  suave por correo"). Acción secundaria (ghost), la primaria
                  sigue siendo el botón de arriba. */}
              <div className="mt-3">
                {captureStatus === "sent" ? (
                  <div role="status" className="animate-enter-pop flex min-h-11 items-center justify-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle size={13} />
                    <span>{content.emailCapture.successMessage}</span>
                  </div>
                ) : showEmailCapture ? (
                  <form onSubmit={handleEmailCapture} className="animate-enter-pop flex origin-top flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        autoFocus
                        value={captureEmail}
                        onChange={(e) => setCaptureEmail(e.target.value)}
                        placeholder={content.emailCapture.placeholder}
                        className="h-11 flex-1 min-w-0 rounded-lg border border-on-inverse/15 bg-on-inverse/10 px-3 text-xs text-on-inverse placeholder:text-on-inverse/40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
                      />
                      <button
                        type="submit"
                        disabled={captureStatus === "sending" || !captureConsent}
                        className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-on-inverse/10 px-3.5 text-xs font-bold text-on-inverse transition-colors hover:bg-on-inverse/20 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
                      >
                        {captureStatus === "sending" ? (
                          <Spinner size={13} className="motion-safe:animate-spin" />
                        ) : (
                          <span>{content.emailCapture.submitLabel}</span>
                        )}
                      </button>
                    </div>
                    {/* Autorización de tratamiento de datos (Ley 1581) —
                        mismo requisito que la casilla grande de
                        Contact.tsx, adaptada a este mini-formulario. */}
                    <label className="flex items-start gap-2 text-xs leading-relaxed text-on-inverse/60">
                      <input
                        type="checkbox"
                        checked={captureConsent}
                        onChange={(e) => setCaptureConsent(e.target.checked)}
                        required
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-on-inverse/30 bg-on-inverse/10 text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                      <span>
                        {content.emailCapture.consent.label}{" "}
                        <a
                          href={content.emailCapture.consent.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-on-inverse"
                        >
                          {content.emailCapture.consent.linkText}
                        </a>
                      </span>
                    </label>
                    {captureStatus === "error" && (
                      <span role="alert" className="animate-enter-error flex items-center gap-1 text-xs font-medium text-red-400">
                        <WarningCircle size={11} /> {content.emailCapture.errorMessage}
                      </span>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEmailCapture(true)}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-on-inverse/60 transition-colors hover:text-on-inverse outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
                  >
                    <EnvelopeSimple size={13} />
                    <span>{content.emailCapture.toggleLabel}</span>
                  </button>
                )}
              </div>

              <p className="mt-3 text-center text-xs text-on-inverse/50">{content.summary.disclaimer}</p>
            </SpotlightCard>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!summaryInView && (
          <motion.div
            key="estimator-price-bar"
            role="region"
            aria-label={content.summary.title}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: "140%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : "140%", transition: { duration: DURATION.fast, ease: EASE_OUT } }}
            transition={SPRING_SOFT}
            // z-40 como la barra de acción móvil; desde `sm` deja libre la esquina del botón de WhatsApp.
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-xl border border-on-inverse/10 bg-inverse p-2 pl-4 text-on-inverse shadow-2xl shadow-black/25 sm:right-24 lg:hidden"
          >
            <button
              type="button"
              onClick={scrollToSummary}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
            >
              {/* Plazo arriba, precio abajo: en 390 px no cabía todo en una línea junto al botón. Sin
                  `aria-label` en el botón (taparía el precio al lector de pantalla): el propósito va en sr-only. */}
              <span className="sr-only">{content.summary.barDetails}: </span>
              <span className="flex items-center gap-1 text-xs text-on-inverse/70">
                <Clock size={12} aria-hidden="true" />
                {displayWeeks} {content.summary.weeksSuffix.toLowerCase()}
              </span>
              <span className="flex items-baseline gap-1 font-mono text-base leading-tight font-bold whitespace-nowrap text-accent">
                <span>$</span>
                <NumberFlow
                  value={displayPrice}
                  locales={currency === "COP" ? "es-CO" : "en-US"}
                  format={{ maximumFractionDigits: 0 }}
                  transformTiming={{ duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                  spinTiming={{ duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
                <span className="text-xs font-semibold text-on-inverse/70">{currency}</span>
              </span>
            </button>
            <motion.button
              type="button"
              onClick={handlePreFillContact}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-lg bg-accent-strong px-4 text-sm font-semibold text-accent-foreground outline-none transition-[filter] hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
            >
              {content.summary.barCta}
              <ArrowRight size={14} aria-hidden="true" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
