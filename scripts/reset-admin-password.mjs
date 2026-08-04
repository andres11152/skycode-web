#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/reset-admin-password.mjs <email> <nueva_password>
// Rota la contraseña de un usuario existente en la tabla `users`. No crea usuarios nuevos.

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Uso: node --env-file=.env.local scripts/reset-admin-password.mjs <email> <nueva_password>");
  process.exit(1);
}

if (newPassword.length < 12) {
  console.error("La nueva contraseña debe tener al menos 12 caracteres.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre este script con --env-file=.env.local.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const res = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email;",
    [passwordHash, email.trim().toLowerCase()]
  );

  if (res.rowCount === 0) {
    console.error(`No se encontró ningún usuario con el correo ${email}.`);
    process.exit(1);
  }

  console.log(`✅ Password actualizada para ${res.rows[0].email} (id ${res.rows[0].id}).`);
} finally {
  await pool.end();
}
