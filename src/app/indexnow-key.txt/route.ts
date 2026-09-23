// Verificación de propiedad para IndexNow (Bing/Yandex/Naver) — ver
// lib/indexNow.ts. Devuelve el valor de INDEXNOW_KEY en texto plano; sin
// la variable configurada, responde 404 en vez de un cuerpo vacío
// confuso.
export async function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new Response("INDEXNOW_KEY no configurada.", { status: 404 });
  }
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
