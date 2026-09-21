import { CURRENCIES, type Currency } from "@/lib/currency";

/**
 * Selector COP/USD reutilizado en cada formulario que crea un monto
 * (campaña, inversión diaria, propuesta, factura) — antes esos formularios
 * no tenían selector alguno y todo quedaba en COP por defecto sin que el
 * usuario pudiera elegir.
 */
export function CurrencySelect({
  value,
  onChange,
  id,
  className,
}: {
  value: Currency;
  onChange: (value: Currency) => void;
  id?: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as Currency)}
      className={
        className ??
        "rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
      }
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c} className="bg-background text-foreground">{c}</option>
      ))}
    </select>
  );
}
