import { NextResponse } from "next/server";

export const DEFAULT_MAX_JSON_BYTES = 8 * 1024;

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * Lee el cuerpo JSON de una petición con tres defensas que `request.json()`
 * no tiene: exige `Content-Type: application/json` (415), corta en
 * `maxBytes` leyendo en streaming (413 — un cuerpo de cientos de MB nunca se
 * carga entero en memoria; `Content-Length` es solo una optimización, se
 * puede mentir en él), y devuelve 400 con un JSON roto en vez de dejar que la
 * excepción de `JSON.parse` suba como un 500 genérico (que además ensucia
 * Sentry con ruido de escáneres).
 */
export async function readJsonBody(request: Request, maxBytes: number = DEFAULT_MAX_JSON_BYTES): Promise<JsonBodyResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415, error: "Content-Type no soportado." };
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: "Solicitud demasiado grande." };
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Cuerpo de solicitud inválido." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "Solicitud demasiado grande." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Cuerpo de solicitud inválido." };
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Cuerpo de solicitud inválido." };
  }
}

/** Respuesta HTTP para un `JsonBodyResult` fallido. */
export function jsonBodyErrorResponse(result: Extract<JsonBodyResult, { ok: false }>): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
