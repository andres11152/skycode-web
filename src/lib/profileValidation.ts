import { z } from "zod";

// Validación de los campos de perfil de persona — compartida entre la
// autogestión (`/api/account/profile`) y la administración (`/api/team`),
// para que un mismo campo no acepte cosas distintas según quién lo edite.
// Módulo puro (sin `pg` ni nada de servidor): los formularios cliente
// importan de acá los mismos límites que valida el servidor.

export const PROFILE_LIMITS = {
  name: 255,
  phone: 40,
  jobTitle: 120,
  bio: 600,
} as const;

export const PROFILE_LOCALES = ["es", "en", "fr"] as const;

/**
 * Zonas horarias IANA reales del runtime (Node y navegadores modernos), no
 * una lista hardcodeada que se desactualiza cuando un país cambia de huso.
 */
export function getTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** Recorta y convierte "" en null — un campo opcional vaciado en el formulario significa "borrarlo", no guardar un string vacío. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

export const profileFields = {
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(PROFILE_LIMITS.name),
  // Permisivo a propósito: formatos internacionales varían demasiado
  // (+57 300 000 0000, (601) 555-1234, 0033 1 23 45 67 89). Solo se exige
  // que tenga pinta de teléfono y al menos 7 dígitos reales.
  phone: optionalText(PROFILE_LIMITS.phone).refine(
    (value) => value === null || (/^[+()\d\s.-]+$/.test(value) && value.replace(/\D/g, "").length >= 7),
    "Ingrese un teléfono válido (al menos 7 dígitos)."
  ),
  jobTitle: optionalText(PROFILE_LIMITS.jobTitle),
  bio: optionalText(PROFILE_LIMITS.bio),
  timezone: z
    .string()
    .refine((value) => getTimezones().includes(value), "Zona horaria no reconocida."),
  locale: z.enum(PROFILE_LOCALES),
  // Fecha pura (sin hora) — mismo criterio que `invoices.due_date`. Se
  // rechaza una fecha futura: nadie ingresa a la empresa mañana.
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use el formato AAAA-MM-DD.")
    .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value) <= new Date(), "Fecha inválida o futura.")
    .nullable(),
  email: z.email("Correo inválido.").trim().toLowerCase().max(254),
};

/** Lo que una persona puede cambiar de sí misma. `.strict()`: mandar `email`, `role` o un `id` es un 400, nunca un update parcial silencioso. */
export const OwnProfileSchema = z
  .object({
    name: profileFields.name.optional(),
    phone: profileFields.phone.optional(),
    bio: profileFields.bio.optional(),
    timezone: profileFields.timezone.optional(),
    locale: profileFields.locale.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Sin campos para actualizar.");

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingrese su contraseña actual."),
    // Mismos límites que `reset-password` y `team/accept`: una contraseña
    // no debería poder ser más débil según por cuál de los tres caminos se fijó.
    newPassword: z.string().min(12, "La contraseña nueva debe tener al menos 12 caracteres.").max(200),
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La contraseña nueva debe ser distinta de la actual.",
    path: ["newPassword"],
  });

// ---------------------------------------------------------------------------
// Perfiles públicos de /equipo (team_profiles)
// ---------------------------------------------------------------------------

/** El slug es el ancla pública `/equipo#slug` a la que enlaza el blog (ver lib/blogPaths.ts::authorUrl). */
export const TEAM_PROFILE_SLUG = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El identificador solo puede tener minúsculas, números y guiones (ej. ana-gomez).");

/** Solo https: un enlace público de la web de la agencia nunca debería mandar a una página sin cifrar. */
const httpsUrl = z
  .url("URL inválida.")
  .trim()
  .max(300)
  .refine((value) => value.startsWith("https://"), "La URL debe empezar con https://.");

export const UpdateTeamProfileSchema = z
  .object({
    slug: TEAM_PROFILE_SLUG.optional(),
    userId: z.number().int().positive().nullable().optional(),
    linkedinUrl: httpsUrl.nullable().optional(),
    githubUrl: httpsUrl.nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Sin campos para actualizar.");

export const TEAM_PROFILE_LIMITS = { name: 120, publicRole: 80, publicBio: 400 } as const;

export const TeamProfileTranslationSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre es obligatorio.").max(TEAM_PROFILE_LIMITS.name),
    publicRole: z.string().trim().max(TEAM_PROFILE_LIMITS.publicRole),
    publicBio: z.string().trim().max(TEAM_PROFILE_LIMITS.publicBio),
  })
  .strict();
