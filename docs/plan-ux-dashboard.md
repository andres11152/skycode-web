# Plan de mejora UI/UX — dashboard, portal y módulos internos

Basado en una auditoría del código (28 módulos del dashboard, portal de clientes y
primitivas compartidas). Las medidas se derivaron de las clases de Tailwind; cada
fase se verifica en Chrome a 375 / 768 / 1440 px antes de darse por cerrada.

## Diagnóstico

| Problema | Alcance |
|---|---|
| Tablas sin versión móvil | 14 tableros y 6 reportes son `<table>` con scroll horizontal. En el portal, "Pagar ahora" queda en la última de 6 columnas. |
| Patrones copiados por archivo | 5 paginaciones, 5 buscadores con debounce, 16 mapas de estado→color, 33 formateos de fecha a mano con 3 criterios de zona horaria. |
| Dos modales | `ModalShell` (8 tableros) sin scroll lock, sin `inert`, sin hoja inferior en móvil; `ui/Modal` sí lo tiene. |
| Borrados inconsistentes | 11 `window.confirm`/`prompt`; documentos, sesiones, tareas y horas se borran sin confirmar. |
| Fallos silenciosos | Sin toasts; varios tableros ignoran `!res.ok`. |
| Zoom en iOS | Todos los inputs < 16px. |
| Objetivos táctiles | Muchos controles de 28–36px. |
| Formularios | `FieldError` sin uso; labels sin `htmlFor` en PortfolioEditor/ArticleEditor/TechnologyCatalog; cambiar de pestaña en PortfolioEditor pierde lo no guardado. |
| Inicio | Solo para admin y sin "qué necesita mi atención hoy". |
| Contraste | Ítem activo del nav (`text-accent` sobre `accent/15`) ≈3:1; texto de 9–10px en `/40`. |
| Carga/error | `loading.tsx` en 6 de 28 rutas, ninguno en el portal; páginas de error con `min-h-screen` dentro del layout. |
| Fechas | Campos `DATE` mostrados un día antes en Colombia. |

## Principios

1. Móvil como caso real (aprobar, cobrar, responder un ticket, mover un lead), no como versión reducida.
2. Un componente por patrón — ningún tablero vuelve a escribir su tabla, paginación o confirmación.
3. Toda mutación da respuesta: cargando / hecho / falló con mensaje.
4. Densidad legible: datos ≥12px, etiquetas en mayúscula ≥11px, inputs 16px en móvil.
5. Color con significado (tokens de estado, solo en dashboard/portal):
   `info` = en curso · `warning` = espera revisión/decisión o en riesgo ·
   `danger` = vencido/fallido · `success` = terminado · `neutral` = inactivo/borrador.
   Una categoría (ej. tipo de gasto) no es un estado → `neutral`.

## Fases

### Fase 0 — Fundaciones
- Tokens `--success/--warning/--danger/--info` en `theme.css` (tono 800/700, >5:1 incluso sobre su tinte al 10%); reemplazo de toda la paleta suelta (`green-*`, `red-*`, `amber-*`, `sky-*`, `emerald-*`).
- Contraste del nav activo y de la píldora del header (`text-accent-strong`).
- Inputs a 16px en móvil (regla global en `dashboard.css`) y prop `error` en `Field` (`FieldError` + `aria-invalid`).
- `formatCalendarDate` / `formatShortDate` / `formatDateTime` / `formatNumber` en `lib/utils.ts`; reemplazo de los formateos a mano.
- `statusMeta.ts`: registro único etiqueta + tono por entidad.

### Fase 1 — Primitivas
`DataTable` (tabla ≥md, tarjetas <md, primera columna fija en reportes financieros), `Pagination`, `SearchFilterBar`, `ConfirmDialog` sobre `ui/Modal`, toasts propios, migración `ModalShell → ui/Modal`, `PageHeader` (migas, acciones), `Tabs` accesibles con estado en URL, `StatCard`.

### Fase 2 — Navegación y carcasa
Drawer con Esc/foco atrapado/`inert`/animación, paleta ⌘K, barra inferior móvil por rol, logo que no saca del panel, `loading.tsx` en todas las rutas, páginas de error corregidas.

### Fase 3 — Tableros (peor primero)
LeadsTable (+ kanban táctil con "Mover a…"), SupportTicketsBoard, TeamTable (feedback de guardado al salir del campo), luego Retainers, Horas, Tareas, Facturación, Propuestas, Gastos, Campañas, Auditoría, Contenido, Portafolio.

### Fase 4 — Fichas y editores
Estado "sin guardar" entre pestañas + barra de guardado fija + aviso al salir; alt text guardado al salir del campo; subida de archivos unificada (arrastrar, vista previa, tamaño, progreso); ClientDetailView, sprints, sesiones, onboarding.

### Fase 5 — Inicio por rol
"Requiere tu atención" (facturas vencidas, SLA, seguimientos, propuestas sin respuesta, tareas de hoy) + acciones rápidas + KPIs con tendencia. Para todos los roles.

### Fase 6 — Reportes y gráficas
Valores visibles, tabla oculta para lectores de pantalla, barras horizontales en móvil, 5 tonos distinguibles, RolesMatrix usable en móvil.

### Fase 7 — Portal de clientes
Resumen de bienvenida, facturas como tarjetas con "Pagar $X" principal, pestañas accesibles en URL, estado de cuenta no vinculada, errores de pago anunciados.

## Orden
0 + 1 → 7 → 2 → 3 → 4 → 5 → 6.

## Verificación por fase
`tsc`, `eslint`, `next build`, `npm test`; Chrome a 375/768/1440 navegando solo con Tab; Lighthouse a11y en `/dashboard/leads`, `/dashboard/facturacion`, `/portal` (meta 100); tamaño de JS de una ruta del dashboard antes/después de las fases 1–2.
