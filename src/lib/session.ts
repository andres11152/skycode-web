import { SignJWT, jwtVerify } from "jose";

// Sin dependencias de Node (pg, bcrypt) a propósito: este módulo lo importa
// middleware.ts, que corre en el Edge Runtime.

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET no está configurada. Defínela en .env.local (desarrollo) o en las variables de entorno del hosting (producción)."
  );
}

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

export interface UserSession {
  id: number | string;
  name: string;
  email: string;
  role: string;
}

/**
 * Genera un Token JWT firmado para la sesión del usuario.
 */
export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Válido por 7 días
    .sign(JWT_SECRET_KEY);
}

/**
 * Verifica y decodifica un Token JWT.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return {
      id: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
