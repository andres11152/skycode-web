import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { initAuthDatabase, verifySessionToken } from "@/lib/auth";

/**
 * GET /api/leads - Obtiene todas las cotizaciones y prospectos de PostgreSQL.
 * Requiere sesión autenticada.
 */
export async function GET() {
  try {
    await initAuthDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
    }

    const res = await query(
      "SELECT id, name, email, phone, service, budget, currency, estimated_weeks, message, notes, source, status, created_at FROM leads ORDER BY created_at DESC;"
    );

    return NextResponse.json({ success: true, leads: res.rows });
  } catch (error) {
    console.error("❌ [API GET Leads Error]", error);
    return NextResponse.json({ error: "Error de servidor al obtener prospectos." }, { status: 500 });
  }
}

/**
 * POST /api/leads - Inserta un nuevo lead en PostgreSQL cuando un cliente cotiza o contacta.
 * Público (llamado desde la web).
 */
export async function POST(request: Request) {
  try {
    await initAuthDatabase();

    const body = await request.json();
    const { name, email, phone, service, budget, currency, estimatedWeeks, message, source } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y correo son obligatorios." }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO leads (name, email, phone, service, budget, currency, estimated_weeks, message, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Nuevo')
       RETURNING id, name, email, created_at;`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone || "",
        service || "Desarrollo General",
        budget || "A convenir",
        currency || "COP",
        estimatedWeeks || 4,
        message || "",
        source || "Sitio Web Directo",
      ]
    );

    console.log("📥 [Nuevo Lead Registrado en PostgreSQL]", res.rows[0]);

    return NextResponse.json({ success: true, lead: res.rows[0] });
  } catch (error) {
    console.error("❌ [API POST Lead Error]", error);
    return NextResponse.json({ error: "Error al guardar el prospecto." }, { status: 500 });
  }
}

/**
 * PATCH /api/leads - Actualiza el estado o notas internas de un lead.
 * Requiere sesión autenticada.
 */
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const { id, status, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID del prospecto es requerido." }, { status: 400 });
    }

    if (status !== undefined && notes !== undefined) {
      const res = await query(
        "UPDATE leads SET status = $1, notes = $2 WHERE id = $3 RETURNING id, status, notes;",
        [status, notes, id]
      );
      return NextResponse.json({ success: true, lead: res.rows[0] });
    } else if (status !== undefined) {
      const res = await query(
        "UPDATE leads SET status = $1 WHERE id = $2 RETURNING id, status, notes;",
        [status, id]
      );
      return NextResponse.json({ success: true, lead: res.rows[0] });
    } else if (notes !== undefined) {
      const res = await query(
        "UPDATE leads SET notes = $1 WHERE id = $2 RETURNING id, status, notes;",
        [notes, id]
      );
      return NextResponse.json({ success: true, lead: res.rows[0] });
    }

    return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
  } catch (error) {
    console.error("❌ [API PATCH Lead Error]", error);
    return NextResponse.json({ error: "Error al actualizar prospecto." }, { status: 500 });
  }
}
