import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";

/**
 * Barra de paginación compartida (antes copiada en 5 tablas). En móvil se
 * apila: el texto "Mostrando X a Y de Z" arriba y los botones abajo, en vez de
 * apretar todo en una sola fila de 343px.
 */
export function Pagination({
  page,
  pageSize,
  total,
  noun,
  onPageChange,
  disabled,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Plural del registro: "gastos", "clientes"… */
  noun: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const button =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 transition-colors hover:bg-foreground/5 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col gap-3 border-t border-foreground/10 px-5 py-3.5 text-xs text-foreground/70 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Mostrando {from} a {to} de {total} {noun}
      </span>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || disabled} className={button} aria-label="Página anterior">
          <CaretLeft size={16} />
        </button>
        <span className="tabular-nums">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
          className={button}
          aria-label="Página siguiente"
        >
          <CaretRight size={16} />
        </button>
      </div>
    </nav>
  );
}
