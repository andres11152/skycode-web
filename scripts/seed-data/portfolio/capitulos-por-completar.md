# Capítulos y métricas por completar (casos del portafolio)

El detalle `/portafolio/[slug]` ya tiene lugar para **Reto / Solución / Resultado** y para **métricas**,
pero los 5 casos migrados los tienen vacíos (el JSON original solo traía un `description` mezclado).
Mientras estén vacíos, esas secciones **no se muestran** (no hay títulos sin contenido).

Se cargan desde `/dashboard/portafolio` → caso → pestaña **Contenido** (un idioma a la vez) y
pestaña **Métricas**. Nada de esto está escrito en la base: son borradores para validar.

**Regla:** solo cifras y hechos verificables. Si no hay un número real, es mejor dejar la métrica
fuera que inventarla — un caso con 2 métricas reales vende más que uno con 6 dudosas.

Los textos de abajo están derivados **únicamente** del resumen y las etiquetas ya publicados.
Reto/Solución son una propuesta de redacción; los Resultados quedan en blanco a propósito.

---

## 1. sentry-crm — Sentry CRM · CRM Omnicanal & Asistente IA

- **Reto (borrador):** Centralizar en un solo lugar las conversaciones de WhatsApp Business de varios negocios, poder delegar las respuestas y ver qué parte de esas conversaciones se convierte en ventas.
- **Solución (borrador):** Plataforma multi-inquilino sobre la API de WhatsApp Cloud: bandeja única de conversaciones, asistentes con IA a los que se les delega la respuesta, y un embudo de ventas en tiempo real visible sin salir del chat.
- **Resultados — necesito de ti:** ¿cuántos negocios/cuentas usan la plataforma? ¿tiempo de primera respuesta antes vs. ahora? ¿% de conversaciones resueltas por la IA? ¿conversaciones al mes?

## 2. servifuturo — ServiFuturo · Control Operativo de Flota y Rutas

- **Reto (borrador):** Operar el despacho de transporte empresarial con control sobre la ubicación de los vehículos, la liquidación de planillas, los conductores y la trazabilidad que exigen las auditorías.
- **Solución (borrador):** Sistema de despacho y monitoreo con seguimiento en vivo, liquidación automática de planillas, control de conductores y registro trazable de cada operación.
- **Resultados — necesito de ti:** ¿horas de liquidación ahorradas por semana/mes? ¿vehículos o rutas gestionadas? ¿reducción de errores en planillas? ¿tiempo de preparación de una auditoría?

## 3. equilibrio-arquitectonico — Sitio Web y Catálogo Digital

- **Reto (borrador):** Presentar proyectos residenciales y comerciales en vidrio y aluminio con una imagen a la altura del trabajo, y convertir las visitas en solicitudes de cotización directas.
- **Solución (borrador):** Portal corporativo de alto rendimiento con catálogo digital, pensado para captar cotizaciones y optimizado para posicionar en Google.
- **Resultados — necesito de ti:** ¿posición/visibilidad en Google antes vs. ahora? ¿cotizaciones recibidas por mes? ¿puntaje Lighthouse? ¿tiempo de carga?

## 4. cda-revifull — Plataforma de Agendamiento en Línea

- **Reto (borrador):** Agendar la revisión técnico-mecánica de vehículos y motos en Bogotá sin llamadas ni coordinación manual, y cotizar de forma directa.
- **Solución (borrador):** Sitio en WordPress con agendamiento en línea sobre el plugin Amelia (asistente de reserva en tres pasos) justo después de la portada.
- **Resultados — necesito de ti:** ¿citas agendadas en línea por mes? ¿% que llega por el portal? ¿reducción de inasistencias gracias a los recordatorios?

## 5. racingbike — Racing Bike 1998 · Tienda Online de Ciclismo

- **Reto (borrador):** Vender bicicletas, componentes y accesorios en línea a todo el país desde una tienda de Bogotá, con un catálogo técnico fácil de recorrer, ayuda para elegir talla y pagos y financiación locales.
- **Solución (borrador):** Tienda WooCommerce con tema propio (Sage 11, Blade, Tailwind CSS v4), filtros por precio, marca y talla, guía «Encuentra tu talla», financiación con Addi y asesoría por WhatsApp.
- **Resultados — necesito de ti:** ¿pedidos o ventas desde el lanzamiento? ¿tasa de conversión móvil? ¿tiempo de carga? ¿uso de la guía de tallas? ¿qué pasarela procesa PSE y tarjetas?

---

## Cómo cargarlo

1. Entra a `/dashboard/portafolio` y abre el caso.
2. Pestaña **Contenido** → idioma **ES** → pega Reto/Solución/Resultados → Guardar. Repite en EN y FR si quieres
   (el portafolio público es solo español hoy, así que ES es lo que se ve).
3. Pestaña **Métricas** → agrega 2–4 pares valor/etiqueta (ej. `−60%` / `Tiempo de liquidación`).
4. La página pública se actualiza sola (revalidación al guardar) — no hace falta deploy.

Si prefieres que lo cargue yo desde un script (como `db:seed-portfolio`), pásame los textos finales y las
cifras verificadas y lo dejo idempotente.
