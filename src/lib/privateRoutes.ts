/**
 * Rutas de la aplicación (no del sitio público): panel, portal, acceso y enlaces con token. Función pura,
 * apta para cliente y servidor.
 *
 * Las usan:
 *  - `ConditionalLayout`: no llevan el Navbar/Footer públicos.
 *  - `lib/analytics.ts`: la etiqueta de Google no se carga ni mide nada en ellas. En varias de estas URLs el
 *    propio enlace es la credencial (`/propuesta/{uuid}`, `/invitar/{token}`, `/resetear-password/{token}`):
 *    enviarlas a Google en `page_location` filtraría el token. El panel y el portal muestran datos de clientes.
 */
const PRIVATE_FIRST_SEGMENTS = new Set([
  "login",
  "olvide-password",
  "resetear-password",
  "dashboard",
  "portal",
  "invitar",
  "propuesta",
]);

export function isPrivateAppPath(pathname: string): boolean {
  const firstSegment = pathname.split("/")[1] ?? "";
  return PRIVATE_FIRST_SEGMENTS.has(firstSegment);
}
