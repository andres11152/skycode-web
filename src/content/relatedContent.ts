// Fuente ÚNICA del enlazado interno blog ↔ servicios del plan de SEO.
//
// Una sola tabla (post → servicios) de la que se deriva la inversa
// (servicio → posts): así "Servicios relacionados" en un artículo y
// "Artículos relacionados" en un servicio nunca se contradicen. Solo se
// listan relaciones reales por tema; un servicio sin artículo que lo
// respalde queda sin bloque en vez de forzar un enlace (mismo criterio que
// SERVICE_PROJECT_SLUGS en content/services.ts). Puro (sin DB ni React):
// lo pueden importar componentes de servidor y cliente.

/** Servicios relacionados de cada post, del más al menos relevante (máx. 3). */
export const POST_RELATED_SERVICES: Record<string, string[]> = {
  "ley-1581-guia-tecnica-software": ["seguridad-cumplimiento", "desarrollo-software-medida", "arquitectura-documentacion"],
  "deuda-tecnica-como-detectarla": ["migracion-datos-legacy", "arquitectura-documentacion", "desarrollo-software-medida"],
  "buenas-practicas-apis-rest": ["apis-integraciones", "desarrollo-software-medida", "seguridad-cumplimiento"],
  "outsourcing-software-latam-propiedad-codigo": ["desarrollo-software-medida", "arquitectura-documentacion"],
  "migracion-sistemas-legados-sin-interrupcion": ["migracion-datos-legacy", "apis-integraciones", "arquitectura-documentacion"],
  "optimizacion-costos-nube-serverless-colombia": ["desarrollo-software-medida", "apis-integraciones", "frontend-alto-rendimiento"],
};

export function getRelatedServiceSlugsForPost(postSlug: string): string[] {
  return POST_RELATED_SERVICES[postSlug] ?? [];
}

/** Posts relacionados de un servicio (inverso de la tabla), en el orden en que aparecen arriba. Máx. 3. */
export function getRelatedPostSlugsForService(serviceSlug: string): string[] {
  return Object.entries(POST_RELATED_SERVICES)
    .filter(([, services]) => services.includes(serviceSlug))
    .map(([postSlug]) => postSlug)
    .slice(0, 3);
}
