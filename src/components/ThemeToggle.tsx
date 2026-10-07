"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons/UiIcons";
import { useLocale } from "@/components/LocaleProvider";
import { getNavContent } from "@/content/nav";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ENABLE_DARK_MODE, type ThemePreference } from "@/lib/theme";
import {
  readAppliedTheme,
  readThemePreference,
  setThemePreference,
  subscribeAppliedTheme,
  subscribeThemePreference,
} from "@/lib/themeStore";

const ORDER: readonly ThemePreference[] = ["system", "light", "dark"];
const ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon } as const;

function usePreference(): ThemePreference {
  // El servidor no conoce el tema: renderiza "Sistema" y el cliente corrige tras hidratar.
  return useSyncExternalStore(subscribeThemePreference, readThemePreference, () => "system");
}

function labelsFor(locale: ReturnType<typeof useLocale>): Record<ThemePreference, string> {
  const nav = getNavContent(locale);
  return { system: nav.themeSystem, light: nav.themeLight, dark: nav.themeDark };
}

/** Centro del elemento pulsado: el círculo de revelado nace del botón, también con teclado (clic sintético sin coordenadas). */
function originOf(event: MouseEvent<HTMLElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Un solo botón de 44 px que rota Sistema → Claro → Oscuro. Cabe en el Navbar sin añadir
 * ancho. El icono es el tema que se está VIENDO (sol o luna), no la preferencia: un monitor
 * fino para "Sistema" se perdía en el header y no decía nada. La preferencia (incluido
 * "Sistema") la dicen el nombre accesible, el tooltip y el lector de pantalla.
 */
function ThemeCycleButton({ className }: { className?: string }) {
  const locale = useLocale();
  const preference = usePreference();
  const applied = useSyncExternalStore(subscribeAppliedTheme, readAppliedTheme, () => "light" as const);
  const labels = labelsFor(locale);
  const Icon = applied === "dark" ? MoonIcon : SunIcon;
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
  const ariaLabel = t(getNavContent(locale).themeCycleAria, { current: labels[preference] });

  return (
    <>
      <button
        type="button"
        onClick={(event) => setThemePreference(next, originOf(event))}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground outline-none transition-colors duration-150 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        <Icon size={19} />
      </button>
      {/* Anuncia el cambio: el nombre del botón cambia pero no se vuelve a leer solo. */}
      <span role="status" className="sr-only">
        {labels[preference]}
      </span>
    </>
  );
}

/** Selector de tres opciones (radiogroup) para el cajón móvil: todas visibles, sin adivinar el orden del ciclo. */
function ThemeSegmented({ className }: { className?: string }) {
  const locale = useLocale();
  const preference = usePreference();
  const labels = labelsFor(locale);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const index = ORDER.indexOf(preference);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const target = ORDER[(current + step + ORDER.length) % ORDER.length];
    refs.current[target]?.focus();
    const rect = refs.current[target]?.getBoundingClientRect();
    setThemePreference(target, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
  }

  return (
    <div
      role="radiogroup"
      aria-label={getNavContent(locale).themeLabel}
      className={cn("relative grid grid-cols-3 rounded-full border border-foreground/10 bg-foreground/[0.04] p-1", className)}
    >
      {/* Píldora deslizante: solo `transform`, y se queda quieta con reduced motion. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-background shadow-sm shadow-black/10 ring-1 ring-foreground/10 transition-transform duration-[250ms] ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {ORDER.map((option, i) => {
        const Icon = ICONS[option];
        const selected = option === preference;
        return (
          <button
            key={option}
            ref={(node) => {
              refs.current[option] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={(event) => setThemePreference(option, originOf(event))}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={cn(
              "relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
              selected ? "text-foreground" : "text-foreground/70 hover:text-foreground",
            )}
          >
            <Icon size={14} />
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggle({ variant = "cycle", className }: { variant?: "cycle" | "segmented"; className?: string }) {
  if (!ENABLE_DARK_MODE) return null;
  return variant === "segmented" ? <ThemeSegmented className={className} /> : <ThemeCycleButton className={className} />;
}
