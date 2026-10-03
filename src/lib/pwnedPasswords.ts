import { createHash } from "node:crypto";

/**
 * Rechazo de contraseñas que ya aparecieron en filtraciones de datos (NIST
 * SP 800-63B §5.1.1.2), con la API de rango de Have I Been Pwned.
 *
 * k-anonimato: solo se envían los PRIMEROS 5 caracteres hex del SHA-1 de la
 * contraseña; HIBP devuelve todos los sufijos que comparten ese prefijo
 * (cientos) y la comparación del sufijo completo se hace acá. Ni la
 * contraseña ni su hash completo salen del servidor. `Add-Padding` mezcla
 * entradas falsas para que el tamaño de la respuesta tampoco delate nada.
 *
 * FALLA ABIERTO a propósito: si HIBP no responde (caída, timeout, red), la
 * contraseña se acepta. Bloquear el cambio de contraseña porque un servicio
 * externo está caído sería un DoS contra nuestros propios usuarios, y el
 * resto de defensas (longitud mínima, PoW, límites) siguen activas.
 */

const RANGE_URL = "https://api.pwnedpasswords.com/range";
const TIMEOUT_MS = 2_500;

export async function isPasswordPwned(password: string): Promise<boolean> {
  // Los e2e/integración no deben depender de la red externa; en producción la
  // variable no existe.
  if (process.env.DISABLE_PWNED_CHECK === "true") return false;

  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await fetch(`${RANGE_URL}/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "skycode-agency-password-check" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return false;

    const body = await response.text();
    for (const line of body.split("\n")) {
      const [candidate, count] = line.trim().split(":");
      // Las entradas de relleno (`Add-Padding`) traen conteo 0: no son reales.
      if (candidate === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const PWNED_PASSWORD_MESSAGE =
  "Esta contraseña apareció en filtraciones de datos conocidas y no es segura. Elige otra distinta.";
