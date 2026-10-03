import { InlineText } from "@/components/blog/InlineText";

/**
 * Tabla de un documento legal. Server Component, sin JS.
 *
 * En pantallas anchas es una `<table>` real; en móvil cada fila se convierte
 * en una ficha (término → valor) porque una tabla de 5 columnas obliga a
 * hacer scroll horizontal en 375 px y esconde justo la finalidad y la
 * duración. Las dos versiones comparten datos; la que no se ve queda en
 * `display: none`, así que los lectores de pantalla leen solo una.
 */
export function LegalTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <figure className="flex flex-col gap-3 print:break-inside-avoid">
      <figcaption className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
        {caption}
      </figcaption>

      <div className="hidden overflow-hidden rounded-xl border border-foreground/10 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-foreground/[0.04]">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 text-xs font-semibold text-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {rows.map((row) => (
              <tr key={row[0]} className="align-top">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="px-4 py-3 font-semibold text-foreground">
                      {cell.startsWith("skycode") ? (
                        <code className="font-mono text-xs font-medium break-all">{cell}</code>
                      ) : (
                        cell
                      )}
                    </th>
                  ) : (
                    <td key={index} className="px-4 py-3 leading-relaxed text-foreground/80">
                      <InlineText text={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row[0]} className="rounded-xl border border-foreground/10 p-4">
            <p className="text-sm font-semibold text-foreground">
              {row[0].startsWith("skycode") ? (
                <code className="font-mono text-xs break-all">{row[0]}</code>
              ) : (
                row[0]
              )}
            </p>
            <dl className="mt-3 flex flex-col gap-2.5">
              {row.slice(1).map((cell, index) => (
                <div key={index}>
                  <dt className="text-xs font-semibold text-foreground/70">{columns[index + 1]}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-foreground/80">
                    <InlineText text={cell} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </figure>
  );
}
