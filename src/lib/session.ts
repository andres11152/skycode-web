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
  /** Solo tiene valor cuando role === "client"; enlaza a la fila real en `clients`. */
  clientId: number | string | null;
}

export interface SessionTokenPayload {
  sessionId: string;
}

/**
 * Genera un Token JWT firmado que solo apunta a una fila de `sessions` en
 * PostgreSQL — no lleva nombre, correo ni rol adentro.
 *
 * Es deliberado: cuando el rol viajaba dentro del JWT (versión anterior),
 * degradar o desactivar a alguien no tenía efecto hasta que su token
 * expirara, hasta 7 días después. Con el JWT reducido a un puntero, cada
 * request resuelve el rol *actual* contra la base vía
 * `lib/authSession.ts::resolveSession()`, y revocar la fila en `sessions`
 * (logout, o un admin forzando el cierre de una sesión ajena) tiene efecto
 * inmediato en el siguiente request.
 */
export async function createSessionToken(payload: SessionTokenPayload): Promise<string> {
  return new SignJWT({ sid: payload.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Cota de seguridad; la vida real la controla `sessions.expires_at`.
    .sign(getSecretKey());
}

/**
 * Verifica la firma y expiración del JWT y devuelve el id de sesión que
 * apunta a validar contra la base de datos. No es, por sí solo, prueba de
 * que la sesión siga activa — para eso ver `resolveSession()`.
 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  // Fuera del try a propósito: un token inválido o expirado devuelve null (caso
  // normal), pero un secreto ausente es un error de configuración y debe
  // reventar visible en vez de disfrazarse de "sesión inválida".
  const secretKey = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const sessionId = payload.sid;
    if (typeof sessionId !== "string") return null;
    return { sessionId };
  } catch {
    return null;
  }
}
