"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, Clock, EnvelopeSimple, Lightning, Spinner, Tag, WarningCircle } from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { Magnetic } from "@/components/ui/Magnetic";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getProjectEstimatorContent, getDefaultCurrency } from "@/content/projectEstimator";
import { defaultLocale, t, type Locale } from "@/lib/i18n";
import { useGeoCountry } from "@/lib/useGeoCountry";
import { dispatchContactPrefill } from "@/lib/contactPrefillEvent";
import { ESTIMATOR_TYPE_TO_SERVICE_SLUG } from "@/lib/leadServices";
import { logError } from "@/lib/logger";

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
  const [captureStatus, setCaptureStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  const toggleAddon = (id: string) => {
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

    // Se despacha como evento (ver lib/contactPrefillEvent.ts) en vez de
    // escribir directo en el DOM del textarea: ese textarea es un campo
    // controlado por React en Contact.tsx, así que asignar `.value` a mano
    // se veía en pantalla pero nunca actualizaba el estado `message` — el
    // envío real (que lee el estado, no el DOM) mandaba el mensaje vacío y
    // el botón de enviar seguía deshabilitado. El evento también manda el
    // tipo de proyecto elegido como `service` real, algo que el prefill
    // anterior (solo texto libre) nunca comunicaba al CRM.
    dispatchContactPrefill({
      message: text,
      serviceSlug: ESTIMATOR_TYPE_TO_SERVICE_SLUG[selectedType],
    });

    const contactSection = document.getElementById("contacto");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captureStatus === "sending") return;

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
        }),
      });

      if (!res.ok) throw new Error("request failed");
      setCaptureStatus("sent");
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
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
          <SectionEyebrow className="mb-3">{content.badge}</SectionEyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-3 text-base text-foreground/70">{content.subtitle}</p>

          {/* Currency Switcher Toggle */}
          <div className="mt-6 flex items-center gap-2 rounded-full border border-foreground/15 bg-background p-1.5 shadow-sm">
            <button
              onClick={() => setCurrency("COP")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                currency === "COP"
                  ? "bg-accent-strong text-white shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <span>{content.currency.copLabel}</span>
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                currency === "USD"
                  ? "bg-accent-strong text-white shadow-sm"
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
            {/* 1. Tipo de Proyecto */}
            <div>
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground/60 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-strong text-[10px] text-white">1</span>
                {content.steps.type}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {projectTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  const displayPrice = currency === "COP" ? type.priceCop : type.priceUsd;

                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(0,137,205,0.15)]"
                          : "border-foreground/10 bg-background/50 hover:border-foreground/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            isSelected ? "bg-accent-strong text-white" : "bg-foreground/5 text-foreground/70"
                          }`}>
                            <Icon size={18} />
                          </div>
                          {isSelected && <CheckCircle size={16} className="text-accent" />}
                        </div>
                        <h4 className="font-bold text-sm text-foreground">{type.title}</h4>
                        <p className="mt-1 text-xs text-foreground/70 leading-relaxed">{type.desc}</p>
                      </div>

                      <div className="mt-3 border-t border-foreground/5 pt-2 text-[11px]">
                        <span className="font-mono font-bold text-accent-strong">
                          {content.fromLabel} {formatPrice(displayPrice)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Módulos Adicionales */}
            <div>
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground/60 mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-strong text-[10px] text-white">2</span>
                {content.steps.addons}
              </h3>
              <div className="grid gap-2.5">
                {addons.map((addon) => {
                  const isChecked = selectedAddons.includes(addon.id);
                  const addonPrice = currency === "COP" ? addon.priceCop : addon.priceUsd;

                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition-all ${
                        isChecked
                          ? "border-accent/50 bg-accent/5 font-semibold text-foreground"
                          : "border-foreground/10 bg-background/40 text-foreground/80 hover:border-foreground/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked ? "border-accent bg-accent-strong text-white" : "border-foreground/30"
                        }`}>
                          {isChecked && <CheckCircle size={12} />}
                        </div>
                        <span>{addon.title}</span>
                      </div>
                      <span className="font-mono text-foreground/60">+{formatPrice(addonPrice)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Urgencia */}
            <div>
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground/60 mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-strong text-[10px] text-white">3</span>
                {content.steps.pace}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUrgency("standard")}
                  className={`rounded-xl border p-3 text-left text-xs font-medium transition-all ${
                    urgency === "standard"
                      ? "border-accent bg-accent/10 text-foreground font-bold"
                      : "border-foreground/10 bg-background/40 text-foreground/70"
                  }`}
                >
                  <div className="font-bold mb-0.5">{content.pace.standardTitle}</div>
                  <div className="text-[11px] text-foreground/60">{content.pace.standardDesc}</div>
                </button>
                <button
                  onClick={() => setUrgency("express")}
                  className={`rounded-xl border p-3 text-left text-xs font-medium transition-all ${
                    urgency === "express"
                      ? "border-accent bg-accent/10 text-foreground font-bold"
                      : "border-foreground/10 bg-background/40 text-foreground/70"
                  }`}
                >
                  <div className="font-bold mb-0.5 text-accent-strong flex items-center gap-1">
                    <Lightning size={12} /> {content.pace.expressTitle}
                  </div>
                  <div className="text-[11px] text-foreground/60">{content.pace.expressDesc}</div>
                </button>
              </div>
            </div>
          </div>

          {/* Estimation Summary Box */}
          <div className="lg:sticky lg:top-28 h-fit">
            <SpotlightCard className="relative overflow-hidden rounded-xl border border-foreground/15 bg-foreground/95 p-6 text-background shadow-2xl">
              <BorderBeam size={240} duration={10} borderWidth={1.5} colorFrom="#0089cd" colorTo="#006998" />
              <div className="flex items-center justify-between border-b border-background/10 pb-4 mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-background/60">
                  {content.summary.title}
                </span>
                <span className="rounded-full bg-background/10 px-2.5 py-0.5 text-[10px] font-bold text-background">
                  {currency}
                </span>
              </div>

              {/* Price Display */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center justify-between text-[11px] text-background/60">
                  <span>{content.summary.investmentLabel}</span>
                  <span className="text-accent font-bold text-[10px] flex items-center gap-1">
                    <Tag size={10} /> {content.summary.competitiveRateLabel}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-accent leading-tight flex items-baseline gap-1">
                  <span>$</span>
                  <NumberFlow
                    value={totalPrice}
                    format={{ maximumFractionDigits: 0 }}
                    transformTiming={{ duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                    spinTiming={{ duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                  />
                  <span className="text-sm font-semibold text-background/70">{currency}</span>
                </div>
                <div className="text-[10px] text-background/50">
                  {currency === "COP"
                    ? `(~ $${Math.round(totalPrice / 4100).toLocaleString("en-US")} USD aprox)`
                    : `(~ $${(totalPrice * 4100).toLocaleString("es-CO")} COP aprox)`}
                </div>
              </div>

              {/* Time & Details */}
              <div className="space-y-3 border-t border-background/10 pt-4 text-xs font-mono">
                <div className="flex items-center justify-between text-background/80">
                  <span className="flex items-center gap-1.5 text-background/60">
                    <Clock size={14} className="text-accent" /> {content.summary.timeLabel}
                  </span>
                  <span className="font-bold text-background flex items-center gap-1">
                    <NumberFlow
                      value={totalWeeks}
                      transformTiming={{ duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                    />
                    <span>{content.summary.weeksSuffix}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-background/80">
                  <span className="text-background/60">{content.summary.ipLabel}</span>
                  <span className="text-background font-bold">{content.summary.ipValue}</span>
                </div>
                <div className="flex items-center justify-between text-background/80">
                  <span className="text-background/60">{content.summary.paymentLabel}</span>
                  <span className="text-background font-bold">{content.summary.paymentValue}</span>
                </div>
                <div className="flex items-center justify-between text-background/80">
                  <span className="text-background/60">{content.summary.warrantyLabel}</span>
                  <span className="text-background font-bold">{content.summary.warrantyValue}</span>
                </div>
              </div>

              {/* CTA Button */}
              <Magnetic strength={0.25} range={60}>
                <button
                  onClick={handlePreFillContact}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 active:scale-98 transition-all"
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
                  <div className="flex min-h-11 items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <CheckCircle size={13} />
                    <span>{content.emailCapture.successMessage}</span>
                  </div>
                ) : showEmailCapture ? (
                  <form onSubmit={handleEmailCapture} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        autoFocus
                        value={captureEmail}
                        onChange={(e) => setCaptureEmail(e.target.value)}
                        placeholder={content.emailCapture.placeholder}
                        className="h-11 flex-1 min-w-0 rounded-lg border border-background/15 bg-background/10 px-3 text-xs text-background placeholder:text-background/40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      />
                      <button
                        type="submit"
                        disabled={captureStatus === "sending"}
                        className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-background/10 px-3.5 text-xs font-bold text-background transition-colors hover:bg-background/20 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      >
                        {captureStatus === "sending" ? (
                          <Spinner size={13} className="animate-spin" />
                        ) : (
                          <span>{content.emailCapture.submitLabel}</span>
                        )}
                      </button>
                    </div>
                    {captureStatus === "error" && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-red-400">
                        <WarningCircle size={11} /> {content.emailCapture.errorMessage}
                      </span>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEmailCapture(true)}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold text-background/60 transition-colors hover:text-background outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    <EnvelopeSimple size={13} />
                    <span>{content.emailCapture.toggleLabel}</span>
                  </button>
                )}
              </div>

              <p className="mt-3 text-center text-[10px] text-background/50">{content.summary.disclaimer}</p>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </section>
  );
}
