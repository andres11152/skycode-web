import { SignJWT, jwtVerify } from "jose";

// Sin dependencias de Node (pg, bcrypt) a propósito: este módulo lo importa
// middleware.ts, que corre en el Edge Runtime.

let cachedSecretKey: Uint8Array | null = null;

/**
 * Resuelve la clave de firma en el momento de usarla, no al importar el módulo.
 *
 * Es deliberado: `next build` importa cada Route Handler para recolectar sus
 * datos, y un `throw` a nivel de módulo tumbaba el build entero en el hosting
 * aunque en esa fase el secreto no haga falta. Al validarlo de forma perezosa,
 * el build pasa sin secreto pero cualquier intento real de firmar o verificar
 * un token sigue fallando fuerte — nunca hay un secreto por defecto.
 */
function getSecretKey(): Uint8Array {
  if (cachedSecretKey) return cachedSecretKey;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET no está configurada. Defínela en .env.local (desarrollo) o en las variables de entorno del hosting (producción)."
    );
  }

  cachedSecretKey = new TextEncoder().encode(secret);
  return cachedSecretKey;
}

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
    .sign(getSecretKey());
}

/**
 * Verifica y decodifica un Token JWT.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  // Fuera del try a propósito: un token inválido o expirado devuelve null (caso
  // normal), pero un secreto ausente es un error de configuración y debe
  // reventar visible en vez de disfrazarse de "sesión inválida".
  const secretKey = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secretKey);
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
