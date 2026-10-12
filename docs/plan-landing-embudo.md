# Plan del embudo de la landing de campaña (`/landing`)

Este plan junta dos cosas:

- una auditoría del código del embudo completo: anuncio → `/landing` → formulario o WhatsApp → `/gracias` → CRM → respuesta;
- una investigación de mercado hecha el 12 oct. 2026, con fuentes al final.

Lo que no se pudo verificar está marcado. Ninguna cifra de este documento sale de la imaginación: si un dato hace falta y no existe, se pide al negocio, no se escribe.

## 1. Diagnóstico del embudo actual

### Medición (lo más urgente: hoy no se sabe qué anuncio trae clientes)

| Problema | Dónde | Efecto |
|---|---|---|
| `/landing` no monta `AttributionCapture` ni `CookieBanner` | `ConditionalLayout.tsx`, rama `isCampaignLanding` | Ningún lead pagado llega al CRM con `gclid`, UTM ni `landing_page`. El tablero de campañas y Reportes no pueden atribuir nada a Google Ads. |
| La etiqueta de conversión de `/gracias` exige el consentimiento de "medición" | `ThankYouView.tsx` | A quien llega desde la landing nunca se le preguntó, así que Google Ads solo cuenta las conversiones de quien acepta el banner en `/gracias`. El algoritmo de puja aprende con una muestra mínima y sesgada. |
| Los clics a WhatsApp no se miden | `ui/WhatsAppButton.tsx` | En Colombia WhatsApp es el canal que inicia el cliente (91 % de uso; 86 % de las conversaciones las abre el cliente, B2Chat 2022). Esas conversiones son invisibles para Ads y para el CRM. |
| Solo se mide "envió el formulario" | — | Google optimiza hacia quien llena formularios, no hacia quien compra. No hay importación de conversiones offline (lead calificado, propuesta, ganado). |

### Respuesta al lead

- Un lead nuevo solo genera un correo al equipo (`/api/contact`), sin campanita ni push. La velocidad de respuesta depende de que alguien vea su bandeja.
- Responder en la primera hora hace casi 7 veces más probable calificar el lead que hacerlo una hora después, y más de 60 veces más que a las 24 h (HBR, 1,25 M de leads).
- El sitio promete menos de 24 h hábiles.

### Página

| Problema | Detalle |
|---|---|
| Copy dentro del JSX | Vive en `app/landing/page.tsx`, fuera de `content/locales`, así que `aiTells.test.ts` no lo revisa. |
| Copy con rastros de IA o de plantilla | El `<title>` va en Title Case ("Desarrollo de Software, Apps y Páginas Web a la Medida"). Hay frases hechas: "sin letra pequeña ni costos ocultos", "Cotiza sin costo", "100% tuyo". |
| Titular genérico | Categoría + "a la medida": es el mismo titular que usan todos los competidores revisados (sección 2.4). |
| Interfaz con patrones que la home ya eliminó | Íconos en caja con fondo de acento, resplandor difuso (`blur-[100px]`), tarjetas iguales en fila de tres. |
| No muestra la evidencia que ya existe | 5 casos con capturas en Postgres, 4 testimonios con nombre y cargo, precios públicos en `PRICING` y el proceso 50/50 con avances semanales. |
| Formulario largo para tráfico frío | Nombre, correo, servicio en desplegable, mensaje obligatorio de 10 caracteres o más y casilla de datos. HubSpot (40.000 landings) encontró que lo que más baja la conversión son los campos de texto largo y los desplegables. |
| Una sola landing para todas las búsquedas | Quien busca "cuánto cuesta una app" y quien busca "integrar Siigo con WooCommerce" llegan al mismo titular. |

### `/gracias`

- **Copy:** "¡Mensaje recibido!" con signos de exclamación, y "nada de respuestas genéricas de bots", que se lee justamente como texto generado.
- **Interfaz:** brillo verde (`shadow-[0_0_40px_rgba(16,185,129,0.25)]`), punto que late y colores `emerald-*` fuera de los tokens.
- **Siguiente paso:** el botón principal manda a la home y saca al lead del flujo, en vez de decirle qué pasa ahora.

## 2. Análisis de mercado (resumen)

### 2.1 Quién compra

- **Tamaño del sector:** el software en Colombia vendió 44,2 billones de COP en 2024, con 6.805 empresas.
  - El software a la medida es el 45 % de esas ventas.
  - Bogotá concentra el 70 % de los ingresos.
  - Fuente: Fedesoft/Cenisoft, vía Portafolio.
- **Cómo deciden las empresas de Bogotá:** solo el 23 % tiene órganos formales de decisión, y el 55 % se financia con recursos propios.
  - Fuente: Gran Encuesta de Productividad 2024-2025.
  - **Lectura (inferencia, no dato de la encuesta):** en el segmento de SkyCode decide el dueño o el gerente general, con su propia caja. Le escribimos a una persona que firma el cheque, no a un comité de TI.
- **Tamaño del grupo que decide:** según Clutch (451 compradores B2B), en más del 60 % de los casos deciden de 1 a 3 personas, y en el 30 % una sola.
- **Qué está generando demanda:**
  - facturación y nómina electrónica DIAN (más de 1,16 M de facturadores);
  - Ley 1581, con multas de hasta 2.000 SMLMV;
  - IA: el 61 % de las empresas la considera prioridad, pero solo el 37,7 % la integró de forma significativa. La barrera número uno es la privacidad (Colombia AI Pulse 2026, fuente secundaria).

### 2.2 Qué temen

- Sobrecostos por cambios de alcance.
- Proyectos largos que se descontrolan: en el estudio de McKinsey y Oxford, cada año extra de duración suma unos 15 puntos de sobrecosto.
- Que el proveedor se quede con el código. El miedo tiene base legal en Colombia: la cesión presunta de una obra por encargo exige contrato escrito y tiene límites (Ley 1450 de 2011, art. 28).
- Que el proveedor desaparezca después de entregar. No hay encuesta colombiana que lo mida (**no verificado**), pero toda la competencia vende "rescatamos proyectos", y eso confirma que es el miedo dominante.

### 2.3 Cómo eligen

- **Lo que más valoran del sitio de un proveedor (Clutch):** costos transparentes (25 %), casos y testimonios (23 %) y acceso inmediato a información (17 %).
- **Qué pesa en una reseña:** la validez de quien la escribe (50 %) pesa más que la puntuación (22 %). Un testimonio sin nombre y cargo no suma.
- **Precio:** según NN/g, el precio es lo más buscado, y quien no lo encuentra se va a la competencia.
- **Tiempos:** el 52 % decide en una semana o menos (Clutch).
- **Cómo investigan hoy:**
  - el 61 % prefiere comprar sin vendedor (Gartner 2025);
  - entre el 29 % y el 51 % empieza en un chatbot de IA (G2; mide compra de SaaS).
  - En la práctica: la lista corta se arma antes del primer contacto, con lo que la página deja leer.

### 2.4 Qué hace la competencia (8 landings revisadas en Bogotá y Medellín)

Patrones repetidos:

- titular "Empresa de Desarrollo de Software en Bogotá" sin promesa concreta;
- clichés ("tecnología de vanguardia", "tu éxito comienza aquí");
- contadores inflados o rotos ("+733 clientes", contadores en 0);
- garantías vagas ("garantía de excelencia", "sin sorpresas");
- precios ocultos o enterrados en la FAQ, y en USD;
- testimonios sin persona identificable;
- 4 o 5 CTAs compitiendo entre sí.

**El hueco:** ninguno publica junto un precio en COP por tipo de proyecto, una garantía con plazo concreto y la cesión del código por contrato. SkyCode ya tiene las tres cosas. La landing tiene que decirlas en el primer pantallazo.

### 2.5 Lo que se busca en Google

Sacado del autocompletado de Google en Colombia. **Los volúmenes y el CPC no están verificados: hay que sacarlos de Keyword Planner.**

| Intención | Ejemplos | Landing que debería recibirla |
|---|---|---|
| Precio | "cuánto cuesta un software para una empresa en colombia", "cuánto cuesta una app para mi negocio", "cuánto cuesta una tienda virtual en colombia" | Variante **precio** |
| A la medida / proveedor | "desarrollo de software a la medida bogotá", "empresa de desarrollo de software en bogotá" | Variante **general** |
| Integraciones | "integración api siigo", "integrar alegra con shopify", "facturación electrónica api dian", "integración api whatsapp" | Variante **integraciones** |
| IA y automatización | "chatbot whatsapp para empresas", "automatizar procesos con ia" | Variante **IA/WhatsApp** (solo con caso real: Sentry CRM) |

**Palabras negativas desde el día 1:** "agencia de desarrollo rural", "migrar sistema operativo", "disco", "ssd", "sena", "curso", "gratis", "en inglés", "empleo", "vacante".

## 3. Posicionamiento de la landing

**A quién le habla:** al gerente o dueño de una empresa pequeña o mediana en Colombia que necesita un sistema, una app o una integración. Paga con caja propia. Ya tuvo o conoce una mala experiencia con un proveedor y decide en días.

**Qué tiene que entender en 5 segundos:**

1. Cuánto cuesta, aproximadamente.
2. Que verá avances y pagará por etapas.
3. Que el código queda a su nombre por contrato.
4. Que hay gente real detrás que ya hizo esto para empresas como la suya.

**Promesa central:** precio publicado, entregas por etapas y el código a nombre del cliente. No es "calidad" ni "innovación": es reducir el riesgo de contratar.

## 4. Reglas de "cero rastro de IA" para esta landing

El copy se escribe con datos del negocio, no con adjetivos. Ningún texto de la página puede quedar sin que lo lea en voz alta alguien del equipo.

### Copy

- **Verificable:** cada frase afirma algo comprobable (un precio, un plazo, un nombre, una cláusula). Si una frase se puede pegar en la página de cualquier competidor, se borra.
- **Lenguaje llano:** nivel escolar de 7.º grado, como se le explicaría a un cliente por teléfono. En servicios profesionales, el texto fácil de leer convierte 12,9 % y el de nivel 8.º-9.º grado, 6,6 % (Unbounce).
- **Extensión:** unas 500 palabras en total.
- **Sin estructura de plantilla:** nada de tríadas ("rápido, seguro y escalable"), frases en paralelo ("No es X, es Y"), preguntas retóricas para abrir secciones ni cierres motivacionales.
- **Sin tics:** sin rayas largas, emoji, Title Case ni exclamaciones.
- **Vocabulario prohibido**, que se suma a `aiTells.test.ts`:
  - "sin letra pequeña", "costos ocultos", "cotiza sin costo", "100 % tuyo";
  - "transforma", "impulsa", "potencia", "ecosistema", "escalable" (como adjetivo suelto), "robusto", "soluciones", "experiencia" (como sustantivo de marketing);
  - "a la medida de tus necesidades";
  - "respuestas genéricas de bots", "en un mundo", "hoy más que nunca".
- **Voz:** primera persona del plural del equipo real ("respondemos Andrés, César o Ximena"), tuteo coherente con el resto del sitio.
- **Los testimonios no se tocan:** se usan las citas tal cual las dio el cliente, con nombre, cargo y empresa. Si una cita suena demasiado pulida, se le pide al cliente la versión original o un audio.

### Interfaz

- **Prohibido:** resplandores difusos de fondo, íconos dentro de cajas, filas de tres tarjetas iguales con ícono + título + texto, puntos que laten, brillos de color y contadores animados.
- **Imagen:** capturas reales de los casos (`CaseVisual`/`BrowserFrame`) y fotos reales del equipo (`team_profiles`). Nada de ilustraciones ni íconos que representen ideas.
- **Tipografía:** una sola familia (Geist) y Geist Mono para precios, plazos y numeración. Titular alineado a la izquierda.
- **Acento:** el azul solo en el botón principal. WhatsApp va como enlace secundario con borde, sin verde de marca.
- **Jerarquía por contenido:** se ordena con tamaño, peso y espacio, no con color. Filetes finos (`border-foreground/10`) en vez de sombras.
- **Movimiento:** casi ninguno. Nada sobre el titular ni el párrafo de entrada, que son el LCP. Como máximo, el `scroll-reveal` del sistema en las secciones de abajo.

## 5. Arquitectura del embudo propuesto

```
Anuncio (grupo por intención)
  → /landing/{variante}            una promesa por intención, mismo esqueleto
      → Formulario corto (acción principal)  → /gracias  → respuesta del equipo
      → WhatsApp con referencia (alterna)    → conversación → lead creado en el CRM
  → CRM: lead con gclid + variante + término
      → calificado → propuesta → ganado    → conversiones offline a Google Ads
```

### Estructura de la página (móvil primero, de arriba abajo)

1. **Barra mínima:** logo, sin enlaces de salida. Igual que hoy.
2. **Primer pantallazo:**
   - Etiqueta mono con la intención ("Desarrollo de software · Bogotá").
   - Titular de dos líneas máximo, con la promesa de la variante.
   - Una línea con 3 datos en mono: precio desde, plazo desde y garantía.
   - Botón principal "Pedir propuesta" (acento) y enlace "Escribir por WhatsApp".
   - En escritorio, el formulario a la derecha; en móvil, el botón baja al formulario.
3. **Precios por escenario:** tabla sobria de 4 a 6 filas (tipo de proyecto, desde COP, semanas desde) leída de `PRICING`, nunca escrita a mano. Debajo, una línea: qué incluye y qué mueve el precio. Enlace al cotizador solo como texto, sin competir con el CTA.
4. **Cómo trabajamos:** 4 pasos numerados sobre una línea:
   1. propuesta con alcance cerrado;
   2. 50 % para empezar;
   3. avances cada semana en el portal;
   4. 50 % al entregar, con 90 días de garantía.

   Cada paso dice qué recibe el cliente. Aquí va la cesión del código por contrato.
5. **Casos:** 2 o 3 casos reales con captura, el problema en una línea, qué se construyó y el stack. Se elige según la variante (integraciones → Sentry CRM/ServiFuturo; web → CDA Revifull/Equilibrio; tienda → Racing Bike).
6. **Testimonios:** 2 citas reales con nombre, cargo y empresa, sin estrellas ni fotos de banco.
7. **Quién responde:** fotos y nombres de Andrés, César y Ximena, con el plazo real de respuesta. Es la señal más fuerte contra "esto lo hizo una IA": gente identificable.
8. **Preguntas frecuentes:** 5 o 6, reutilizadas del catálogo `faq-page.json` por `id`:
   - qué incluye el precio;
   - qué pasa si cambia el alcance;
   - de quién es el código;
   - qué pasa después de la entrega;
   - facturación electrónica y Ley 1581;
   - cómo pago.
9. **Cierre:** el formulario otra vez, o un ancla a él, con una sola línea encima.
10. **Pie:** razón social o responsable, política de privacidad y NIT/RUT si aplica (da confianza en B2B colombiano).

### Formulario

- **Campos:**
  - nombre;
  - correo **o** WhatsApp (uno de los dos obligatorio, con el país preseleccionado en Colombia);
  - tipo de proyecto en botones (`radiogroup`, ya existe el patrón en `EstimatorPreview`);
  - "¿Algo más que debamos saber?" opcional;
  - casilla de datos.
- **API:** requiere un esquema propio en `/api/contact` (hoy el mensaje es obligatorio con 10 caracteres o más y el correo siempre es obligatorio), con `formContext: "Landing"` nuevo en `LEAD_FORM_CONTEXTS`.
- **Atribución:** el envío adjunta `gclid`/UTM/variante leídos de la URL en ese momento (la landing es una sola página: no hace falta guardarlos en el navegador, así que no entra al inventario de cookies). Hay que declararlo en la política de privacidad y en el texto de la casilla. **Requiere revisión legal.**

### WhatsApp

- **Mensaje precargado** con referencia corta, por ejemplo: "Hola, vengo de la página de software a la medida (ref. L7K2)".
- **Clic:** registra un evento propio (`POST /api/landing-events`, sin datos personales). Con la referencia, el equipo enlaza la conversación al lead en el CRM.
- **Google Ads:** se cuenta como conversión secundaria, separada del formulario.

### `/gracias`

- **Copy:** se reescribe sin exclamaciones, con 3 pasos de qué pasa ahora (quién revisa, cuándo responde, qué va a recibir) y el nombre de la persona.
- **Interfaz:** sin brillo ni punto que late; tokens del sistema.
- **Acción principal:** en vez de "volver al inicio", "Mientras tanto, mira un caso parecido al tuyo", con enlace al caso de la variante. WhatsApp queda como secundario.

## 6. Fases

### Fase 0: medir antes de cambiar (1 a 2 días)

Sin esto, cualquier mejora posterior es una opinión.

1. **Atribución y consentimiento en `/landing`:** adjuntar `gclid`/UTM/variante al envío leyendo la URL, y montar el `CookieBanner` en la rama de la landing (con su peso medido).
2. **Consent Mode v2 en `/gracias`:** la etiqueta carga en modo denegado y envía señales sin cookies cuando no hay consentimiento. **Validar con un abogado** que sea compatible con la Ley 1581 y con la política actual.
3. **Conversión de WhatsApp** como evento propio + conversión secundaria en Ads.
4. **Aviso inmediato al equipo:** push + campanita a admin y sales_manager por lead nuevo de la landing, con el canal que ya existe (`createNotification` → `sendPushToUser`).
5. **Línea base de 2 a 4 semanas:** sesiones, envíos, clics a WhatsApp, leads calificados y tiempo de primera respuesta, por grupo de anuncios.

### Fase 1: contenido real (lo que tiene que dar el negocio)

Ver la sección 7. El copy final no se escribe hasta tener esto.

### Fase 2: página nueva (2 a 3 días)

1. **Contenido:**
   - `content/locales/es/landing.json` + wrapper `content/landing.ts`, que dejan el copy bajo `aiTells.test.ts`;
   - ampliar `BANNED_PHRASES` con el vocabulario de la sección 4.
2. **Rutas:**
   - `/landing` (general) + `/landing/[variante]` con `generateStaticParams` sobre una lista cerrada;
   - empezar con **general**, **precio** e **integraciones**; IA/WhatsApp después, si el caso de Sentry CRM se puede contar con detalle.
3. **Componentes:**
   - Server Components; la única isla cliente es el formulario.
   - Precios por token desde `PRICING`.
   - Casos desde Postgres (mismo patrón que `BogotaPage`).
   - Fotos desde `team_profiles`.
4. **Formulario corto y esquema nuevo en la API**, con tests unitarios (validación "correo o WhatsApp") y e2e (envío con `gclid`).
5. **`/gracias` reescrita.**
6. **Metadata:** `noindex` como hoy. Título en tipo oración y de 50 caracteres o menos.

### Fase 3: anuncios alineados (con quien maneje Google Ads)

- Un grupo de anuncios por variante, con el titular del anuncio igual a la promesa de la página.
- Palabras negativas de la sección 2.5.
- Sacar de Keyword Planner volúmenes y CPC reales en Colombia antes de repartir presupuesto.

### Fase 4: cerrar el ciclo con ventas

1. **Conversiones offline:** exportar o importar a Google Ads "lead calificado" y "ganado" con el `gclid` guardado, para que la puja optimice hacia clientes y no hacia formularios. La primera versión puede ser un CSV desde `/dashboard/leads`; la API viene después.
2. **Reporte por variante y término en Reportes:** costo por lead, costo por lead calificado y costo por cliente ganado.

### Fase 5: iterar

- **Una variable a la vez:** titular, orden de secciones o precio arriba vs. después de los casos.
- **Sobre el volumen:** con poco tráfico una prueba A/B no llega a significancia en semanas razonables. Se hacen cambios secuenciales comparando contra la línea base y se leen las conversaciones de WhatsApp para aprender cómo habla el cliente.
- **El vocabulario del cliente entra al copy:** las palabras que usan los clientes reales en WhatsApp y en llamadas son la mejor fuente de copy "escrito por humano".

## 7. Lo que se necesita del negocio (no se inventa)

| Dato | Para qué |
|---|---|
| Tiempo de primera respuesta que el equipo **sí** puede cumplir (¿1 h hábil? ¿4 h?) | Promesa del primer pantallazo y de `/gracias` |
| Confirmación de que el contrato incluye cesión de derechos patrimoniales del código, y su redacción | Afirmación central contra el miedo número 2 (validar con un abogado) |
| Qué cubre exactamente la garantía de 90 días | Una línea concreta en vez de "ante cualquier falla" |
| Permiso de los clientes para nombrarlos y usar capturas en anuncios pagados | Casos y testimonios |
| Una o dos frases del cliente sobre **por qué** los eligió (audio o WhatsApp) | Testimonios en su voz original |
| Fotos actuales del equipo que responde | Sección "Quién responde" |
| Presupuesto mensual de Ads y CPA objetivo | Saber cuántas variantes sostiene el tráfico |
| Acceso o exportación de términos de búsqueda de Google Ads | Ver qué escribe la gente de verdad |
| Razón social o responsable y NIT/RUT a mostrar | Pie de página |

## 8. Indicadores

| Indicador | Referencia | Fuente |
|---|---|---|
| Conversión de la landing (formulario + WhatsApp) | Mediana en búsqueda pagada para servicios profesionales: 7,8 %; cuartil superior: desde 14,1 % | Unbounce 2024 |
| Conversión en móvil vs. escritorio | El móvil suele convertir un 40 % menos; hay que cerrar esa brecha | Unbounce 2024 |
| Tiempo de primera respuesta | Meta: dentro de la primera hora hábil | HBR 2011 |
| Lead → calificado → propuesta → ganado | Línea base propia (Fase 0) | CRM |
| Costo por cliente ganado por variante | Línea base propia | CRM + Ads |
| LCP móvil de `/landing` | 2,5 s o menos | Lighthouse sobre `next start` |

## 9. Fuentes

- Fedesoft/Cenisoft vía Portafolio: https://www.portafolio.co/tecnologia/industria-del-software-colombiano-alcanza-ventas-por-44-2-billones-641497
- Gran Encuesta de Productividad 2024-2025: https://www.valoraanalitik.com/empresas-bogota-organos-decision-encuesta/
- Clutch, proceso de compra B2B: https://clutch.co/consulting/resources/b2b-buying-process
- NN/g, mostrar precios: https://www.nngroup.com/articles/show-prices-for-common-scenarios/
- McKinsey y Oxford, proyectos de TI: https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/delivering-large-scale-it-projects-on-time-on-budget-and-on-value
- Ley 1450 de 2011, art. 28 (obra por encargo): https://revistas.uexternado.edu.co/index.php/propin/article/download/3267/2916/11110
- Unbounce, Conversion Benchmark Report: https://unbounce.com/conversion-benchmark-report/professional-services-conversion-rate/
- HubSpot, campos de formulario: https://blog.hubspot.com/blog/tabid/6307/bid/6746/which-types-of-form-fields-lower-landing-page-conversions.aspx
- HBR, vida de los leads: https://hbr.org/2011/03/the-short-life-of-online-sales-leads
- Deloitte/Google, velocidad: https://web.dev/case-studies/milliseconds-make-millions
- Gartner 2025, compra sin vendedor: https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience
- G2, comportamiento del comprador 2025: https://company.g2.com/news/buyer-behavior-in-2025
- B2Chat vía La República, WhatsApp en empresas: https://www.larepublica.co/alta-gerencia/la-mayoria-de-empresas-colombianas-se-comunican-por-whatsapp-con-sus-clientes-3466649
- SIC y multas, Ley 1581: https://www.hklaw.com/es/news/intheheadlines/2025/09/venta-de-datos-personales-sin-autorizacion-podria-generar-multas

**No verificado:** volúmenes y CPC en Colombia, qué cargo decide la compra de TI en pymes colombianas, encuestas locales sobre dolores con proveedores, cifras de Standish CHAOS recientes, datos B2B de WhatsApp de 2025, y estudios independientes sobre agenda en línea y CTA único.
