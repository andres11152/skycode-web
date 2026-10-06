// Auditoría de SEO técnico del sitio: `npm run seo:check` (BASE_URL=... para elegir entorno).
//
//   BASE_URL=https://skycode.agency npm run seo:check
//   BASE_URL=http://localhost:3000   npm run seo:check   # contra `next start` local
//
// Sale con código 1 si alguna URL del sitemap falla (canonical distinto de sí
// misma, título duplicado o de más de 60 caracteres, descripción ausente o de
// más de 160, H1 != 1, status != 200, noindex dentro del sitemap). La lógica
// vive en src/lib/seoHealth.ts y la comparte el cron diario del dashboard.
import { runSeoHealthCheck, type SeoPageResult } from "../src/lib/seoHealth.ts";

const baseUrl = (process.env.BASE_URL ?? "https://skycode.agency").replace(/\/+$/, "");
const concurrency = Number(process.env.SEO_CHECK_CONCURRENCY ?? 6);

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width - 1) + "…" : value.padEnd(width);
}

function printTable(rows: { url: string; code: string; message: string }[]) {
  const urlWidth = Math.min(64, Math.max(3, ...rows.map((r) => r.url.length)));
  console.log(`${pad("URL", urlWidth)}  ${pad("PROBLEMA", 20)}  DETALLE`);
  console.log(`${"-".repeat(urlWidth)}  ${"-".repeat(20)}  ${"-".repeat(40)}`);
  for (const row of rows) console.log(`${pad(row.url, urlWidth)}  ${pad(row.code, 20)}  ${row.message}`);
}

async function main() {
  console.log(`Auditando ${baseUrl}/sitemap.xml (concurrencia ${concurrency})…`);
  const report = await runSeoHealthCheck({
    baseUrl,
    concurrency,
    onProgress: (done, total) => {
      if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${total} URLs`);
    },
  });
  if (process.stdout.isTTY) process.stdout.write("\n");

  const problems = report.pages.flatMap((page: SeoPageResult) =>
    page.issues.map((i) => ({ url: page.url, code: i.code, message: i.message, severity: i.severity }))
  );
  const errors = problems.filter((p) => p.severity === "error");

  const t = report.totals;
  console.log(
    `\n${t.pages} URLs · ${t.pages - t.withErrors} sin errores · ${t.withErrors} con errores · ` +
      `TTFB medio ${t.avgTtfbMs ?? "—"} ms, máx. ${t.maxTtfbMs ?? "—"} ms\n`
  );

  if (problems.length > 0) {
    printTable(problems);
    console.log("");
  }

  if (errors.length > 0) {
    console.error(`✖ ${errors.length} error(es) en ${t.withErrors} URL(s).`);
    process.exit(1);
  }
  console.log(`✔ Las ${t.pages} URLs pasan todas las comprobaciones.`);
}

main().catch((error) => {
  console.error("seo:check no pudo completarse:", error instanceof Error ? error.message : error);
  process.exit(2);
});
