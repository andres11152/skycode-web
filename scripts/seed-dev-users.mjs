#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seed-dev-users.mjs
//
// Crea una cuenta de prueba por cada rol del sistema (admin, sales_manager,
// traffiker, client) directo en la base de datos, saltándose el flujo real
// de invitación por correo — mismo patrón que
// lib/testHelpers/db.ts::createTestUser(), que ya usan los tests de
// integración. Sirve para poder loguearse y probar los cuatro roles sin
// depender de que Resend esté configurado ni de mandarse invitaciones a
// mano una por una.
//
// Idempotente: si un correo ya existe, no lo toca ni falla — solo lo
// reporta como "ya existía". Pensado para desarrollo local, no para
// producción (las contraseñas quedan impresas en la terminal).

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

const PASSWORD = "Skycode#Test2026"; // mismas 16 chars para las 4 cuentas, para no tener que anotar 4 distintas

const TEAM_USERS = [
  { name: "Admin de Prueba", email: "admin@skycode.local", role: "admin" },
  { name: "Comercial de Prueba", email: "ventas@skycode.local", role: "sales_manager" },
  { name: "Traffiker de Prueba", email: "trafficker@skycode.local", role: "traffiker" },
];
const CLIENT_EMAIL = "cliente@skycode.local";

try {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const created = [];
  const skipped = [];

  for (const user of TEAM_USERS) {
    const res = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (email) DO NOTHING
       RETURNING email, role;`,
      [user.name, user.email, passwordHash, user.role]
    );
    if (res.rowCount > 0) created.push(res.rows[0]);
    else skipped.push(user.email);
  }

  // Cliente de prueba: fila en `clients` (la entidad de negocio) + usuario
  // role='client' enlazado por client_id — nunca por email, ver
  // db/migrations/0003_clients.sql — más un proyecto con sprints para que
  // el portal no se vea vacío al probarlo.
  const existingClientUser = await pool.query("SELECT id FROM users WHERE email = $1;", [CLIENT_EMAIL]);

  if (existingClientUser.rowCount === 0) {
    const clientRes = await pool.query(
      `INSERT INTO clients (name, email, company)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      ["Cliente de Prueba", CLIENT_EMAIL, "Empresa Demo S.A.S."]
    );
    const clientId = clientRes.rows[0].id;

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, client_id)
       VALUES ($1, $2, $3, 'client', 'active', $4);`,
      ["Cliente de Prueba", CLIENT_EMAIL, passwordHash, clientId]
    );
    created.push({ email: CLIENT_EMAIL, role: "client" });

    const projectRes = await pool.query(
      `INSERT INTO projects (client_id, title, description, progress, status)
       VALUES ($1, $2, $3, 40, 'En Desarrollo')
       RETURNING id;`,
      [clientId, "Plataforma de Reservas — Demo", "Proyecto de prueba para el portal de cliente."]
    );
    const projectId = projectRes.rows[0].id;

    await pool.query(
      `INSERT INTO sprints (project_id, title, status, progress) VALUES
         ($1, 'Descubrimiento y arquitectura', 'Completado', 100),
         ($1, 'Desarrollo del MVP', 'En Progreso', 40),
         ($1, 'QA y despliegue', 'Pendiente', 0);`,
      [projectId]
    );
  } else {
    skipped.push(CLIENT_EMAIL);
  }

  console.log("\n✅ Seed de usuarios de prueba completo.\n");
  console.log(`Contraseña para las 4 cuentas: ${PASSWORD}\n`);
  console.table([
    ...TEAM_USERS.map((u) => ({ email: u.email, rol: u.role })),
    { email: CLIENT_EMAIL, rol: "client" },
  ]);
  if (created.length) console.log(`Creadas ahora: ${created.map((c) => c.email).join(", ")}`);
  if (skipped.length) console.log(`Ya existían (sin tocar): ${skipped.join(", ")}`);
} finally {
  await pool.end();
}
