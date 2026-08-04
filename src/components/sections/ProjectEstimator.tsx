"use client";

import { useState } from "react";
import { CheckCircle2, Calculator, ArrowRight, Clock, Tag, Zap } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { getProjectEstimatorContent, getDefaultCurrency } from "@/content/projectEstimator";
import { defaultLocale, t, type Locale } from "@/lib/i18n";

export function ProjectEstimator({ locale = defaultLocale }: { locale?: Locale }) {
  const content = getProjectEstimatorContent(locale);
  const { projectTypes, addons } = content;

  const [currency, setCurrency] = useState<"COP" | "USD">(getDefaultCurrency(locale));
  const [selectedType, setSelectedType] = useState<string>(projectTypes[0].id);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([addons[0].id, addons[1].id]);
  const [urgency, setUrgency] = useState<"standard" | "express">("standard");

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

    const contactTextarea = document.querySelector<HTMLTextAreaElement>("textarea[name='mensaje']");
    if (contactTextarea) {
      contactTextarea.value = text;
    }

    const contactSection = document.getElementById("contacto");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="cotizador"
      aria-label={content.sectionAria}
      className="py-20 px-6 bg-gradient-to-b from-transparent via-foreground/[0.02] to-transparent"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
          <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent mb-4">
            <Calculator size={14} /> {content.badge}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-3 text-base text-foreground/70">{content.subtitle}</p>

          {/* Currency Switcher Toggle */}
          <div className="mt-6 flex items-center gap-2 rounded-full border border-foreground/15 bg-background p-1.5 shadow-sm">
            <button
              onClick={() => setCurrency("COP")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                currency === "COP"
                  ? "bg-accent-strong text-white shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <span>{content.currency.copLabel}</span>
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
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
                          {isSelected && <CheckCircle2 size={16} className="text-accent" />}
                        </div>
                        <h4 className="font-bold text-sm text-foreground">{type.title}</h4>
                        <p className="mt-1 text-xs text-foreground/70 leading-relaxed">{type.desc}</p>
                      </div>

                      <div className="mt-3 border-t border-foreground/5 pt-2 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-accent">
                          {content.fromLabel} {formatPrice(displayPrice)}
                        </span>
                        <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-600">
                          {content.discountBadge}
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
                          {isChecked && <CheckCircle2 size={12} />}
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
                  <div className="font-bold mb-0.5 text-accent flex items-center gap-1">
                    <Zap size={12} /> {content.pace.expressTitle}
                  </div>
                  <div className="text-[11px] text-foreground/60">{content.pace.expressDesc}</div>
                </button>
              </div>
            </div>
          </div>

          {/* Estimation Summary Box */}
          <div className="lg:sticky lg:top-28 h-fit">
            <SpotlightCard className="rounded-2xl border border-foreground/15 bg-foreground/95 p-6 text-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-background/10 pb-4 mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-background/60">
                  {content.summary.title}
                </span>
                <span className="rounded-full bg-green-400/20 px-2.5 py-0.5 text-[10px] font-bold text-green-400">
                  {currency}
                </span>
              </div>

              {/* Price Display */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center justify-between text-[11px] text-background/60">
                  <span>{content.summary.investmentLabel}</span>
                  <span className="text-green-400 font-bold text-[10px] flex items-center gap-1">
                    <Tag size={10} /> {content.summary.competitiveRateLabel}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-accent-secondary leading-tight">
                  {formatPrice(totalPrice)}
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
                  <span className="font-bold text-background">{totalWeeks} {content.summary.weeksSuffix}</span>
                </div>
                <div className="flex items-center justify-between text-background/80">
                  <span className="text-background/60">{content.summary.ipLabel}</span>
                  <span className="text-green-400 font-bold">{content.summary.ipValue}</span>
                </div>
                <div className="flex items-center justify-between text-background/80">
                  <span className="text-background/60">{content.summary.paymentLabel}</span>
                  <span className="text-background font-bold">{content.summary.paymentValue}</span>
                </div>
                <div className="flex items-center justify-between text-background/80">
                  <span className="text-background/60">{content.summary.warrantyLabel}</span>
                  <span className="text-green-400 font-bold">{content.summary.warrantyValue}</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handlePreFillContact}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 active:scale-98 transition-all"
              >
                <span>{content.summary.ctaLabel}</span>
                <ArrowRight size={14} />
              </button>

              <p className="mt-3 text-center text-[10px] text-background/50">{content.summary.disclaimer}</p>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </section>
  );
}
