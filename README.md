# SkyCode Agency

Sitio de marketing trilingüe (español/inglés/francés) + panel interno de CRM/proyectos con autenticación real, construido en Next.js 16 (App Router) y PostgreSQL.

El sitio público (home, servicios, blog, portafolio) es contenido estático servido con runtime de Node — no es un export estático (`output: "export"` se removió deliberadamente, ver [CLAUDE.md](CLAUDE.md)). El panel interno (`/dashboard`, `/portal`) es una aplicación server-rendered con sesiones persistentes, RBAC y Postgres.

## Requisitos

- Node.js 20+
- PostgreSQL (local, o una instancia gestionada como Render)
- Docker, solo si vas a correr los tests de integración/E2E

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa DATABASE_URL, JWT_SECRET, etc. — ver el archivo para el detalle de cada variable
npm run db:migrate           # aplica las migraciones de db/migrations/ contra DATABASE_URL
npm run dev
```

En el primer arranque, si la tabla `users` está vacía y definiste `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` en `.env.local`, se siembra automáticamente el primer usuario admin la primera vez que algo golpea la base de datos. Cualquier cuenta después de esa se crea por invitación desde `/dashboard/equipo` (solo admin) — no hay otra forma de crear cuentas internas. Para desarrollo, `npm run db:seed-dev-users` crea una cuenta de cada rol (admin, sales_manager, traffiker, client) con una contraseña compartida impresa en terminal — no usar en producción.

Abre [http://localhost:3000](http://localhost:3000) para el sitio público, o `/login` para el panel interno.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción (`npm run build` primero) |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (vitest, sin Postgres) |
| `npm run test:integration` | Tests de queries/lib contra Postgres real desechable — requiere `test:db:up` primero |
| `npm run test:e2e` | Tests end-to-end contra un servidor Next real — requiere `test:db:up && test:db:migrate` primero |
| `npm run test:all` | Encadena las tres capas de test de arriba, levantando y migrando la base de test |
| `npm run db:migrate` | Aplica migraciones pendientes de `db/migrations/` contra `DATABASE_URL` |
| `npm run db:seed-dev-users` | Crea una cuenta de cada rol para desarrollo local |
| `node scripts/reset-admin-password.mjs <email> <password>` | Rota la contraseña de un usuario existente por línea de comandos — respaldo si el flujo de "olvidé mi contraseña" (`/olvide-password`) no es viable (ej. Resend caído) |

## Estructura del proyecto

```
src/
  app/                    # Rutas (App Router) — sitio público, /dashboard, /portal, /api/**
  components/
    sections/             # Secciones de la home (Hero, Services, Contact, ...)
    dashboard/, portal/   # UI del panel interno
    ui/                   # Componentes base reutilizables (Button, Modal, Card, ...)
  content/                # Copy tipado; content/locales/{es,en,fr}/*.json son la fuente real
  lib/                    # Auth, RBAC, rate limiting, acceso a datos (lib/queries/), utilidades
db/migrations/            # Migraciones SQL, aplicadas por scripts/migrate.mjs
e2e/                      # Tests end-to-end
scripts/                  # CLIs de mantenimiento (migrar, sembrar usuarios, resetear contraseña)
```

Para el detalle real de arquitectura — sistema de diseño, i18n, RBAC/autenticación, modelo de datos, flujos de negocio y el flujo de verificación obligatorio antes de cualquier cambio — ver [CLAUDE.md](CLAUDE.md). Ese archivo es la referencia viva del proyecto, no este README.

## Variables de entorno

Ver [.env.example](.env.example) para la lista completa con explicación de cada una (base de datos, JWT, Resend, sitio, Sentry). El monitoreo de errores (Sentry) es opcional — sin `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, el SDK queda inactivo automáticamente.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) corre en cada push/PR a `main`: tipos, lint, tests unitarios y build primero (rápido, sin Postgres); si eso pasa, un segundo job levanta un Postgres de servicio y corre integración + E2E — los mismos scripts de arriba, sin lógica especial de CI.

## Testing

Tres capas independientes, cada una probando algo distinto — ver la sección "Sistema interno" de [CLAUDE.md](CLAUDE.md) para el detalle de qué corre contra qué:

```bash
npm test                    # unitarios, instantáneo, sin dependencias externas
npm run test:db:up          # levanta Postgres desechable en :5433 (docker-compose.test.yml)
npm run test:integration    # queries/lib contra esa base
npm run test:db:migrate     # aplica el esquema a la base de test
npm run test:e2e            # servidor Next real + HTTP real
npm run test:db:down        # apaga y destruye la base de test
```

## Deploy

Requiere un host con runtime de Node para Next.js (Vercel, o cualquier otro que no sea hosting de archivos estáticos puro) — el sitio sirve rutas de API reales (`/api/contact`, `/api/leads`, todo el CRM). Define las variables de `.env.example` en el panel del hosting y corre `npm run db:migrate` contra la base de datos de producción antes del primer deploy.

El módulo de Documentos (`/dashboard/proyectos/[id]`) necesita almacenamiento persistente: `DOCUMENTS_STORAGE_PATH` debe apuntar a un disco montado que sobreviva a los deploys (ej. un Render Persistent Disk), nunca al filesystem efímero del contenedor — sin esa variable, cualquier archivo subido desaparece en el siguiente deploy.

Las notificaciones por correo (propuesta vista, factura vencida, SLA por vencer) requieren un **Render Cron Job** aparte que pegue periódicamente (ej. cada hora) a `POST /api/cron/check-notifications` con el header `x-cron-secret` igual a la variable `CRON_SECRET`, ej.:

```bash
curl -f -X POST -H "x-cron-secret: $CRON_SECRET" https://su-dominio.com/api/cron/check-notifications
```

Sin `CRON_SECRET` configurada, esa ruta responde 503 y no hace nada — las notificaciones simplemente no se activan hasta que se configure el Cron Job.
