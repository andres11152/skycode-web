"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { findCountry, flagEmoji, getCountryOptions, getFallbackCountryOptions } from "@/lib/countries";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useGeoCountry } from "@/lib/useGeoCountry";

// País por defecto según el idioma, usado solo mientras no haya señal de IP
// (o si el host no expone geolocalización). Es el mismo criterio de mercado
// principal que ya aplica `getDefaultCurrency` en content/projectEstimator.ts.
const LOCALE_DEFAULT_COUNTRY: Record<Locale, string> = {
  es: "CO",
  en: "US",
  fr: "FR",
};

/** Compone el valor E.164 que se envía al API: "+" + indicativo + dígitos. */
export function composePhone(dial: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  if (!dial || !digits) return "";
  return `+${dial}${digits}`;
}

export function PhoneField({
  locale = defaultLocale,
  id,
  name = "phone",
  label,
  countryLabel,
  countryPlaceholder,
  fieldClassName,
  labelClassName,
}: {
  locale?: Locale;
  id: string;
  name?: string;
  label: string;
  countryLabel: string;
  countryPlaceholder: string;
  fieldClassName: string;
  labelClassName: string;
}) {
  // Arranca con la lista "SSR-segura" (nombre = código, ver getFallbackCountryOptions)
  // y se reemplaza por la localizada real en un efecto de montaje — evita un
  // mismatch de hidratación si el ICU del navegador ordena distinto al de Node.
  const [countries, setCountries] = useState(getFallbackCountryOptions);
  useEffect(() => {
    const applyLocalizedCountries = () => {
      setCountries(getCountryOptions(locale));
    };
    applyLocalizedCountries();
  }, [locale]);
  const [countryCode, setCountryCode] = useState<string>(LOCALE_DEFAULT_COUNTRY[locale]);
  const [localNumber, setLocalNumber] = useState("");

  // País resuelto por IP (ver useGeoCountry) — se lee una sola vez al montar,
  // nunca durante el render, para no romper la hidratación. Si el país no
  // está en la lista o no hay señal (dev local, host sin geo-IP), se conserva
  // el default por idioma que ya trae el estado inicial.
  const geoCountry = useGeoCountry();
  useEffect(() => {
    const applyGeoCountry = () => {
      if (!geoCountry) return;
      // Si sí hubo señal de IP pero el país no está en la lista (territorio raro),
      // se limpia la selección en vez de dejar el default por idioma: es preferible
      // que el visitante elija a que mande su número con un indicativo ajeno.
      setCountryCode(findCountry(geoCountry) ? geoCountry : "");
    };
    applyGeoCountry();
  }, [geoCountry]);

  const selected = findCountry(countryCode);
  const composed = composePhone(selected?.dial ?? "", localNumber);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>

      <div className="flex items-start gap-2">
        {/*
          El `<select>` nativo pinta en su botón el mismo texto de la opción
          elegida, así que no permite "compacto afuera, nombre completo adentro".
          Se resuelve superponiendo el select real transparente sobre una
          etiqueta compacta (bandera + indicativo): la lista desplegable sigue
          siendo la nativa —con nombres completos, buscador por teclado y el
          picker de iOS/Android— y el campo cerrado ocupa solo lo necesario.
        */}
        <div className="relative shrink-0">
          <select
            aria-label={countryLabel}
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          >
            <option value="">{countryPlaceholder}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name} +{country.dial}
              </option>
            ))}
          </select>

          <div
            aria-hidden="true"
            className={cn(
              fieldClassName,
              "flex w-28 items-center gap-1.5 px-3 pr-7",
              "peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30",
            )}
          >
            {selected ? (
              <>
                <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
                <span className="font-medium tabular-nums">+{selected.dial}</span>
              </>
            ) : (
              <span className="text-foreground/50">—</span>
            )}
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50"
            />
          </div>
        </div>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={localNumber}
          // El indicativo lo pone el selector — aquí solo se aceptan dígitos y
          // separadores, para que nunca llegue un "+57" duplicado ni un "0057".
          onChange={(event) => setLocalNumber(event.target.value.replace(/[^\d\s-]/g, ""))}
          className={cn(fieldClassName, "min-w-0 flex-1")}
        />
      </div>

      {/* Valor real que viaja en el submit: el formulario sigue leyendo
          formData.get("phone") sin cambios. */}
      <input type="hidden" name={name} value={composed} />
    </div>
  );
}
