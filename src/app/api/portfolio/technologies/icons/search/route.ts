import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { searchSimpleIcons } from "@/lib/simpleIcons";

/**
 * GET /api/portfolio/technologies/icons/search?q=next - Buscador de
 * íconos de `simple-icons` para el selector del catálogo de tecnologías
 * (`/dashboard/portafolio/tecnologias`, fase siguiente) — devuelve solo
 * título/slug (liviano, sin el SVG resuelto todavía). Requiere
 * `portfolio:write`: es una herramienta de administración, no algo que
 * el sitio público consuma.
 */
export async function GET(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ success: true, results: [] });
  }

  const results = searchSimpleIcons(q, 20);
  return NextResponse.json({ success: true, results });
}
