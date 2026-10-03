"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { cn, formatDate } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n";
import { getCookieBannerContent } from "@/content/cookieBanner";
import { entriesByCategory, type ConsentCategory } from "@/content/cookieInventory";
import {
  CONSENT_ALL,
  CONSENT_DENIED,
  type ConsentChoices,
  type ConsentRecord,
} from "@/lib/consent";

const CATEGORY_ORDER: readonly ConsentCategory[] = ["necessary", "preferences", "measurement"];

const secondaryButton =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-foreground/20 bg-background px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none";

interface CookiePreferencesProps {
  open: boolean;
  locale: Locale;
  record: ConsentRecord | null;
  onClose: () => void;
  onSave: (choices: ConsentChoices) => void;
}

/**
 * Centro de preferencias. Cada interruptor es un `<input type="checkbox"
 * role="switch">` nativo (estado, teclado y lector de pantalla gratis); el
 * trazo visual es solo CSS. "Rechazar todo" pesa igual que "Aceptar todo": que
 * rechazar cueste más clics o se vea menos es un patrón oscuro sancionado.
 */
export function CookiePreferences({ open, locale, record, onClose, onSave }: CookiePreferencesProps) {
  const copy = getCookieBannerContent(locale).preferences;
  // El borrador se reinicia en cada apertura porque el padre remonta el
  // componente con `key` (ver CookieBanner): así no hace falta sincronizarlo con un efecto.
  const [draft, setDraft] = useState<ConsentChoices>({
    preferences: record?.preferences ?? false,
    measurement: record?.measurement ?? false,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={copy.title}
      description={copy.description}
      closeLabel={copy.close}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButton} onClick={() => onSave(CONSENT_DENIED)}>
            {getCookieBannerContent(locale).rejectAll}
          </button>
          <button type="button" className={secondaryButton} onClick={() => onSave(CONSENT_ALL)}>
            {getCookieBannerContent(locale).acceptAll}
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-foreground outline-none transition-colors hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none"
          >
            {copy.save}
          </button>
        </div>
      }
    >
      <ul className="flex flex-col divide-y divide-foreground/10 rounded-xl border border-foreground/10">
        {CATEGORY_ORDER.map((category) => (
          <CategoryRow
            key={category}
            category={category}
            locale={locale}
            checked={category === "necessary" ? true : draft[category]}
            onChange={(next) => {
              if (category !== "necessary") setDraft((d) => ({ ...d, [category]: next }));
            }}
          />
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-1.5 text-sm text-foreground/80 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {record
            ? t(copy.lastDecision, { date: formatDate(record.decidedAt, locale) })
            : copy.noDecision}
        </p>
        <Link
          href={getCookieBannerContent(locale).linkUrl}
          prefetch={false}
          onClick={onClose}
          className="rounded font-medium text-foreground underline decoration-foreground/30 underline-offset-2 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copy.policyLink}
        </Link>
      </div>
    </Modal>
  );
}

function CategoryRow({
  category,
  locale,
  checked,
  onChange,
}: {
  category: ConsentCategory;
  locale: Locale;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const copy = getCookieBannerContent(locale).preferences;
  const info = copy.categories[category];
  const locked = category === "necessary";
  const [expanded, setExpanded] = useState(false);
  const switchId = useId();
  const descId = useId();
  const detailId = useId();
  const entries = entriesByCategory(category);

  return (
    <li className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={switchId} className="text-base font-semibold text-foreground">
          {info.label}
        </label>

        <div className="flex min-h-11 shrink-0 items-center gap-2.5">
          {locked && (
            <span className="text-xs font-semibold text-foreground/60">{copy.alwaysOn}</span>
          )}
          <span className="relative inline-flex">
            <input
              id={switchId}
              type="checkbox"
              role="switch"
              checked={checked}
              disabled={locked}
              aria-describedby={descId}
              onChange={(e) => onChange(e.target.checked)}
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <span
              aria-hidden="true"
              className={cn(
                "relative h-6 w-11 rounded-full bg-foreground/25 transition-colors duration-150 ease-out",
                "after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-background after:shadow-sm after:transition-transform after:duration-150 after:ease-out",
                "peer-checked:bg-accent-strong peer-checked:after:translate-x-5",
                "peer-disabled:opacity-60",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                "motion-reduce:transition-none motion-reduce:after:transition-none",
              )}
            />
          </span>
        </div>
      </div>
      {/* Debajo y a todo el ancho: junto al interruptor quedaba en una columna estrecha en móvil. */}
      <p id={descId} className="-mt-1 text-sm leading-relaxed text-foreground/80">
        {info.description}
      </p>

      {entries.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-medium text-foreground/80 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {expanded ? copy.hideDetails : copy.showDetails}
            <CaretDown
              size={14}
              aria-hidden="true"
              className={cn("transition-transform duration-150", expanded && "rotate-180")}
            />
          </button>
          {expanded && (
            <ul id={detailId} className="mt-1 flex flex-col gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.name}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-lg bg-foreground/[0.04] px-3 py-2"
                >
                  <code className="font-mono text-xs text-foreground">{entry.name}</code>
                  <span className="text-xs text-foreground/70">{copy.kinds[entry.kind]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
