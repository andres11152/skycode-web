import PDFDocument from "pdfkit";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { formatMoney, formatDate } from "./utils";
import { contactEmail, contactPhone, siteName, siteUrl } from "./site";
import type { InvoicePdfData } from "./queries/invoices";
import type { Currency } from "./currency";

const STATUS_LABELS: Record<InvoicePdfData["status"], string> = {
  paid: "PAGADA",
  pending: "PENDIENTE",
  overdue: "VENCIDA",
};

/**
 * Genera el PDF de una factura como Buffer — `pdfkit` es puro JS (sin
 * binario nativo tipo Chromium), a diferencia de renderizar HTML con
 * Puppeteer/Playwright, que sería mucho más pesado para un documento de
 * una sola página con layout simple (texto y tablas, no diseño complejo).
 * El logo se lee del propio `public/` en cada llamada — no se cachea en
 * memoria porque un PDF de factura se descarga con poca frecuencia
 * (ocasional por factura), no vale la pena la complejidad de un caché
 * para esto.
 */
export async function generateInvoicePdfBuffer(invoice: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const currency = invoice.currency as Currency;

  // --- Encabezado: logo + datos de la agencia a la izquierda, "FACTURA" a la derecha ---
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-full.png");
    const logoBuffer = await readFile(logoPath);
    doc.image(logoBuffer, 50, 45, { width: 130 });
  } catch {
    // Sin logo (ej. entorno donde no existe el archivo) — el PDF sigue
    // siendo válido y legible sin él, no es motivo para fallar la descarga.
    doc.fontSize(16).font("Helvetica-Bold").text(siteName, 50, 50);
  }

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("FACTURA", 350, 50, { align: "right", width: 195 });
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(invoice.invoice_number, 350, 75, { align: "right", width: 195 });

  doc.moveDown(3);
  doc.y = 130;

  // --- Datos de la agencia (izquierda) y del cliente (derecha) ---
  const infoTop = doc.y;
  doc.fontSize(9).font("Helvetica").fillColor("#666666");
  doc.text(contactEmail, 50, infoTop);
  doc.text(contactPhone, 50, infoTop + 14);
  doc.text(siteUrl.replace(/^https?:\/\//, ""), 50, infoTop + 28);

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000").text("Facturar a:", 350, infoTop, { width: 195, align: "right" });
  doc.font("Helvetica").text(invoice.client_name, 350, infoTop + 14, { width: 195, align: "right" });
  if (invoice.client_company) {
    doc.text(invoice.client_company, 350, infoTop + 28, { width: 195, align: "right" });
  }
  doc.fontSize(8).fillColor("#666666").text(invoice.client_email, 350, infoTop + (invoice.client_company ? 42 : 28), {
    width: 195,
    align: "right",
  });

  // --- Fechas y proyecto ---
  const detailsTop = infoTop + 70;
  doc.moveTo(50, detailsTop - 10).lineTo(545, detailsTop - 10).strokeColor("#dddddd").stroke();
  doc.fontSize(9).fillColor("#666666").font("Helvetica");
  doc.text("Fecha de emisión", 50, detailsTop);
  doc.text("Fecha de vencimiento", 220, detailsTop);
  doc.text("Proyecto", 390, detailsTop);
  doc.fontSize(10).fillColor("#000000").font("Helvetica-Bold");
  doc.text(formatDate(invoice.created_at), 50, detailsTop + 14);
  doc.text(formatDate(invoice.due_date), 220, detailsTop + 14);
  doc.text(invoice.project_title, 390, detailsTop + 14, { width: 155 });

  // --- Partida (descripción + monto) ---
  const tableTop = detailsTop + 60;
  doc.moveTo(50, tableTop).lineTo(545, tableTop).strokeColor("#000000").stroke();
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
  doc.text("Descripción", 50, tableTop + 8);
  doc.text("Monto", 450, tableTop + 8, { width: 95, align: "right" });
  doc.moveTo(50, tableTop + 24).lineTo(545, tableTop + 24).strokeColor("#dddddd").stroke();

  doc.fontSize(10).font("Helvetica").fillColor("#000000");
  doc.text(invoice.description, 50, tableTop + 34, { width: 380 });
  doc.text(formatMoney(invoice.amount, currency), 450, tableTop + 34, { width: 95, align: "right" });

  // --- Total y estado ---
  const totalsTop = tableTop + 70;
  doc.moveTo(350, totalsTop).lineTo(545, totalsTop).strokeColor("#dddddd").stroke();
  doc.fontSize(10).font("Helvetica").fillColor("#666666").text("Total", 350, totalsTop + 8, { width: 100 });
  doc.font("Helvetica-Bold").fillColor("#000000").text(formatMoney(invoice.amount, currency), 450, totalsTop + 8, { width: 95, align: "right" });

  if (invoice.paidAmount > 0) {
    doc.font("Helvetica").fillColor("#666666").text("Pagado", 350, totalsTop + 24, { width: 100 });
    doc.fillColor("#15803d").text(formatMoney(invoice.paidAmount, currency), 450, totalsTop + 24, { width: 95, align: "right" });
    doc.font("Helvetica-Bold").fillColor("#666666").text("Saldo pendiente", 350, totalsTop + 40, { width: 100 });
    doc.fillColor("#000000").text(formatMoney(invoice.balance, currency), 450, totalsTop + 40, { width: 95, align: "right" });
  }

  const statusColor = invoice.status === "paid" ? "#15803d" : invoice.status === "overdue" ? "#b91c1c" : "#a16207";
  const statusY = totalsTop + (invoice.paidAmount > 0 ? 64 : 24);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(statusColor)
    .text(
      invoice.status === "overdue" ? `${STATUS_LABELS[invoice.status]} (${invoice.daysOverdue} días)` : STATUS_LABELS[invoice.status],
      350,
      statusY,
      { width: 195, align: "right" }
    );

  // --- Historial de pagos (si hay) ---
  if (invoice.payments.length > 0) {
    let paymentsY = statusY + 40;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000").text("Historial de pagos", 50, paymentsY);
    paymentsY += 16;
    doc.moveTo(50, paymentsY).lineTo(545, paymentsY).strokeColor("#dddddd").stroke();
    paymentsY += 8;
    doc.fontSize(9).font("Helvetica").fillColor("#666666");
    for (const payment of invoice.payments) {
      doc.text(formatDate(payment.paid_at), 50, paymentsY);
      doc.text(payment.method || "—", 220, paymentsY);
      doc.text(formatMoney(payment.amount, currency), 450, paymentsY, { width: 95, align: "right" });
      paymentsY += 16;
    }
  }

  // --- Pie de página ---
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#999999")
    .text(`Gracias por confiar en ${siteName}.`, 50, 720, { width: 495, align: "center" });

  doc.end();
  return done;
}
