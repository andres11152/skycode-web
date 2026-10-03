import { describe, expect, it } from "vitest";
import { readJsonBody } from "./readJsonBody";

function req(body: BodyInit | null, headers: Record<string, string> = { "content-type": "application/json" }): Request {
  return new Request("http://localhost/x", { method: "POST", headers, body });
}

describe("readJsonBody", () => {
  it("parsea un JSON válido", async () => {
    expect(await readJsonBody(req(JSON.stringify({ a: 1 })))).toEqual({ ok: true, data: { a: 1 } });
  });

  it("415 si el Content-Type no es JSON", async () => {
    const r = await readJsonBody(req("a=1", { "content-type": "application/x-www-form-urlencoded" }));
    expect(r).toMatchObject({ ok: false, status: 415 });
  });

  it("400 (no lanza) con un JSON roto", async () => {
    expect(await readJsonBody(req("{no es json"))).toMatchObject({ ok: false, status: 400 });
  });

  it("400 con bytes UTF-8 inválidos", async () => {
    expect(await readJsonBody(req(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d])))).toMatchObject({ ok: false, status: 400 });
  });

  it("413 si el cuerpo supera el tope, aunque Content-Length no lo declare", async () => {
    const big = JSON.stringify({ x: "a".repeat(20_000) });
    expect(await readJsonBody(req(big))).toMatchObject({ ok: false, status: 413 });
  });

  it("413 por Content-Length declarado sin leer el cuerpo", async () => {
    const r = await readJsonBody(req("{}", { "content-type": "application/json", "content-length": "999999" }));
    expect(r).toMatchObject({ ok: false, status: 413 });
  });

  it("400 si no hay cuerpo", async () => {
    expect(await readJsonBody(req(null))).toMatchObject({ ok: false, status: 400 });
  });

  it("respeta un tope personalizado", async () => {
    expect(await readJsonBody(req('{"a":"bbbbbbbbbb"}'), 10)).toMatchObject({ ok: false, status: 413 });
  });
});
