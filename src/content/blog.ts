export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  tags: string[];
  content: BlogBlock[];
}

function wordCount(blocks: BlogBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === "paragraph" || block.type === "heading") {
      return total + block.text.split(/\s+/).length;
    }
    if (block.type === "list") {
      return total + block.items.join(" ").split(/\s+/).length;
    }
    return total;
  }, 0);
}

export function readingTime(post: BlogPost): number {
  return Math.max(1, Math.round(wordCount(post.content) / 200));
}

export const blogPosts: BlogPost[] = [
  {
    slug: "ley-1581-guia-tecnica-software",
    title: "Ley 1581 en la práctica: qué debe hacer tu software para cumplir Habeas Data",
    description:
      "Guía técnica de lo que un sistema debe implementar para cumplir la Ley 1581 de Protección de Datos en Colombia: cifrado, control de acceso, derechos ARCO y registro ante la SIC.",
    publishedAt: "2026-03-10",
    author: "Andres Betancourt",
    tags: ["Seguridad", "Cumplimiento", "Ley 1581"],
    content: [
      {
        type: "paragraph",
        text: "La Ley 1581 de 2012 no es letra muerta: la Superintendencia de Industria y Comercio (SIC) ha impuesto sanciones por más de $6.000 millones de pesos entre 2022 y 2024 a empresas de e-commerce, salud y telecomunicaciones por fallas en el manejo de datos personales, y las multas pueden llegar hasta 2.000 salarios mínimos mensuales legales vigentes. Para un negocio digital, esto no es un tema legal abstracto — es un requisito técnico que debe estar en el código desde el día uno.",
      },
      {
        type: "heading",
        level: 2,
        text: "Qué exige la ley, en términos de sistema",
      },
      {
        type: "paragraph",
        text: "Habeas Data le da a cada persona el derecho a Acceder, Rectificar, Cancelar y Oponerse (los derechos ARCO) al tratamiento de sus datos. Eso se traduce en requisitos concretos para cualquier plataforma que almacene datos de usuarios colombianos:",
      },
      {
        type: "list",
        items: [
          "Consentimiento explícito y registrado antes de capturar datos personales (no checkboxes premarcados).",
          "Registro Nacional de Bases de Datos (RNBD) ante la SIC si tu empresa maneja bases de datos personales de forma sistemática.",
          "Mecanismo real para que un usuario pueda pedir acceso, corrección o eliminación de sus datos — no solo un correo de contacto que nadie procesa.",
          "Política de retención: los datos no se guardan indefinidamente 'por si acaso', tienen una fecha de expiración definida.",
          "Cifrado en tránsito (TLS) y en reposo para cualquier dato sensible (identificación, salud, datos financieros).",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "La parte que casi nadie implementa: control de acceso y auditoría",
      },
      {
        type: "paragraph",
        text: "La mayoría de incidentes que terminan en sanción de la SIC no son ataques externos sofisticados — son accesos internos sin control, bases de datos expuestas por configuraciones por defecto, o simplemente nadie sabe quién tocó qué dato y cuándo. Un sistema que cumple de verdad implementa control de acceso basado en roles (RBAC) y deja un log de auditoría inmutable de quién accedió a qué información personal, algo que en una arquitectura bien diseñada no es un feature extra sino una decisión desde el modelo de datos.",
      },
      {
        type: "heading",
        level: 2,
        text: "Checklist técnico mínimo",
      },
      {
        type: "list",
        items: [
          "Formulario de consentimiento explícito, versionado y con timestamp.",
          "Endpoint o proceso real para ejercer derechos ARCO, con SLA de respuesta.",
          "Cifrado TLS 1.2+ en todo el tráfico, cifrado at-rest en la base de datos para campos sensibles.",
          "RBAC en el backend — nadie accede a datos personales por defecto.",
          "Logs de auditoría de acceso a datos personales, con retención propia.",
          "Política de retención y borrado automático de datos vencidos.",
        ],
      },
      {
        type: "paragraph",
        text: "Nada de esto se agrega 'después' sin dolor. Es arquitectura, no un checkbox de última hora — y es exactamente el tipo de decisión que un freelancer entregando por WhatsApp casi nunca documenta ni implementa.",
      },
    ],
  },
  {
    slug: "deuda-tecnica-como-detectarla",
    title: "Deuda técnica: cómo detectarla antes de que te cueste una migración completa",
    description:
      "Señales concretas de que tu software colombiano acumuló deuda técnica, de dónde viene realmente (No-Code, freelancers, presión de negocio) y cómo evitar que termine en una reescritura completa.",
    publishedAt: "2026-04-02",
    author: "Cesar Leon",
    tags: ["Arquitectura", "Deuda técnica", "Buenas prácticas"],
    content: [
      {
        type: "paragraph",
        text: "Deuda técnica no es un término de moda — es literal: cada atajo que tomas hoy para entregar más rápido se paga después, con intereses, en forma de horas de desarrollo que no deberían existir. El problema es que casi nadie la detecta hasta que ya es cara: cuando agregar una feature simple toma semanas, o cuando el único desarrollador que entendía el sistema ya no responde el teléfono.",
      },
      {
        type: "heading",
        level: 2,
        text: "De dónde viene, en el mercado colombiano específicamente",
      },
      {
        type: "list",
        items: [
          "Builders No-Code usados para lo que no fueron diseñados: lógica de negocio compleja empujada dentro de un editor visual que no versiona código ni corre tests.",
          "Freelancers que entregan y desaparecen — sin documentación, sin handoff, sin que nadie más entienda las decisiones que tomaron.",
          "Presión de negocio: 'lánzalo ya, lo arreglamos después' — y el 'después' nunca llega porque el sistema sigue vendiendo, aunque mal.",
          "Falta de pruebas automatizadas, así que cada cambio nuevo tiene el riesgo real de romper algo que ya funcionaba.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Señales de que ya tienes deuda técnica",
      },
      {
        type: "list",
        items: [
          "Una función que antes tomaba días ahora toma semanas, sin que el alcance haya crecido.",
          "Nadie en el equipo actual puede explicar por qué el sistema hace algo de una forma específica.",
          "Cada despliegue nuevo genera ansiedad, no confianza.",
          "El único documento técnico que existe es un chat de WhatsApp con el freelancer anterior.",
          "Agregar un campo nuevo a un formulario requiere tocar código en cinco lugares distintos.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Cómo se evita, no cómo se cura",
      },
      {
        type: "paragraph",
        text: "La deuda técnica no se 'arregla' con una sola sesión de refactor — se previene con decisiones de arquitectura desde el inicio: código propio (no atado a un builder que controla otra empresa), documentación técnica real entregada junto con el software (no como favor), y una separación clara entre lógica de negocio y capa de presentación para que un cambio en una no obligue a tocar la otra.",
      },
      {
        type: "paragraph",
        text: "Si ya estás en el punto de 'nadie entiende esto', la migración completa suele ser más barata a largo plazo que seguir parchando — pero se puede hacer de forma incremental, módulo por módulo, si la arquitectura nueva se diseña para convivir con la vieja mientras se reemplaza.",
      },
    ],
  },
  {
    slug: "buenas-practicas-apis-rest",
    title: "Arquitectura de APIs REST: 7 prácticas para que tu backend no se caiga en producción",
    description:
      "Prácticas concretas de arquitectura de APIs REST — versionado, validación, manejo de errores, rate limiting y observabilidad — para backends que aguantan tráfico real, no solo el demo.",
    publishedAt: "2026-05-18",
    author: "Andres Betancourt",
    tags: ["APIs", "Backend", "Arquitectura"],
    content: [
      {
        type: "paragraph",
        text: "La mayoría de APIs fallan en producción no por falta de features, sino por decisiones de arquitectura que nadie tomó a propósito. Estas son las siete prácticas que separan una API que aguanta tu primer pico real de tráfico de una que se cae con el Black Friday.",
      },
      {
        type: "heading",
        level: 2,
        text: "1. Versiona la API desde el primer endpoint",
      },
      {
        type: "paragraph",
        text: "Un prefijo como /api/v1/ cuesta nada agregar hoy y evita romper a todos tus clientes (web, móvil, integraciones) el día que necesites cambiar un contrato.",
      },
      {
        type: "heading",
        level: 2,
        text: "2. Valida en el borde, no en el medio",
      },
      {
        type: "paragraph",
        text: "Toda entrada externa se valida antes de tocar lógica de negocio — con una librería de esquemas (Zod, Yup), no con ifs sueltos repartidos por el código.",
      },
      {
        type: "code",
        language: "ts",
        code: `const OrderSchema = z.object({
  items: z.array(ItemSchema).min(1),
  customerId: z.string().uuid(),
});

const body = OrderSchema.parse(await req.json());`,
      },
      {
        type: "heading",
        level: 2,
        text: "3. Códigos de estado HTTP consistentes",
      },
      {
        type: "paragraph",
        text: "201 al crear, 204 al borrar sin contenido, 409 en conflictos, 422 en validación fallida. Un cliente que consume tu API debería poder tomar decisiones solo con el status code, sin parsear el mensaje de error.",
      },
      {
        type: "heading",
        level: 2,
        text: "4. Autenticación y autorización separadas",
      },
      {
        type: "paragraph",
        text: "Autenticación responde '¿quién eres?'. Autorización responde '¿puedes hacer esto?'. Mezclarlas en un mismo middleware es la forma más común de terminar con un endpoint que filtra datos que no debería.",
      },
      {
        type: "heading",
        level: 2,
        text: "5. Rate limiting antes de que lo necesites",
      },
      {
        type: "paragraph",
        text: "Un endpoint sin límite de tasa no solo es vulnerable a abuso — un solo cliente mal configurado (un cron mal hecho, un frontend con un loop) puede tumbar tu backend sin que nadie ataque nada.",
      },
      {
        type: "heading",
        level: 2,
        text: "6. Idempotencia en operaciones críticas",
      },
      {
        type: "paragraph",
        text: "Si un pago se reintenta por un timeout de red, la segunda llamada no debería cobrar dos veces. Una clave de idempotencia (Idempotency-Key) en el header resuelve esto sin lógica compleja en cada endpoint.",
      },
      {
        type: "heading",
        level: 2,
        text: "7. Logging y observabilidad desde el día uno",
      },
      {
        type: "paragraph",
        text: "Cuando algo falla en producción a las 2am, la pregunta no es 'qué pasó' sino '¿tengo cómo saberlo?'. Logs estructurados con un ID de correlación por request son la diferencia entre un diagnóstico de cinco minutos y una noche entera adivinando.",
      },
      {
        type: "paragraph",
        text: "Ninguna de estas prácticas es exótica — son decisiones de arquitectura documentadas que cuestan lo mismo implementar bien desde el inicio que mal, y son exactamente lo que revisamos cuando entregamos una API a un cliente.",
      },
    ],
  },
  {
    slug: "outsourcing-software-latam-propiedad-codigo",
    title: "Outsourcing de software en Latinoamérica: cómo elegir proveedor sin perder el control de su código",
    description:
      "Claves de ingeniería y gestión para contratar outsourcing de desarrollo de software nearshore en Colombia y LATAM asegurando la transferencia de propiedad intelectual y evitando el vendor lock-in.",
    publishedAt: "2026-06-02",
    author: "Andres Betancourt",
    tags: ["Outsourcing", "Propiedad Intelectual", "Gestión de Software"],
    content: [
      {
        type: "paragraph",
        text: "Contratar outsourcing de desarrollo de software en Latinoamérica es una estrategia común para acelerar el time-to-market. Sin embargo, muchas organizaciones enfrentan disputas de propiedad intelectual o terminan atadas a proveedores que retienen el acceso al código. Elegir un aliado tecnológico en Colombia o la región exige evaluar no solo tarifas por hora, sino también prácticas de transferencia de conocimiento y control de repositorios.",
      },
      {
        type: "heading",
        level: 2,
        text: "Riesgos del Vendor Lock-in en el desarrollo nearshore",
      },
      {
        type: "paragraph",
        text: "El bloqueo del proveedor (vendor lock-in) ocurre cuando un cliente no puede migrar su software a otro equipo porque depende de librerías propietarias o porque no cuenta con la documentación necesaria. Para evitar esto, es fundamental establecer desde el día uno del contrato que el código fuente es de propiedad intelectual exclusiva de su empresa, y configurar repositorios Git propios (GitHub, GitLab) donde el equipo de desarrollo realice integraciones continuas diariamente.",
      },
      {
        type: "heading",
        level: 2,
        text: "Checklist de aseguramiento de código en el outsourcing",
      },
      {
        type: "list",
        items: [
          "Acceso total e inmediato a repositorios de código desde la primera línea desarrollada.",
          "Entrega de documentación técnica clara: diagramas de arquitectura de base de datos e instrucciones de despliegue local.",
          "Decisiones de arquitectura justificadas por escrito, evitando que el conocimiento quede concentrado en una sola persona.",
          "Garantía de transferencia del conocimiento de forma estructurada a su equipo interno mediante sesiones de handoff.",
        ],
      },
      {
        type: "paragraph",
        text: "Al elegir desarrollo de software nearshore en LATAM, la transparencia en la gestión del código y la propiedad intelectual es lo que garantiza el éxito a largo plazo de su producto digital.",
      },
    ],
  },
  {
    slug: "migracion-sistemas-legados-sin-interrupcion",
    title: "Migración de sistemas legados: cómo modernizar el software de su empresa sin interrumpir la operación",
    description:
      "Estrategia de arquitectura para modernizar software y bases de datos obsoletas mediante el patrón Strangler Fig, reduciendo riesgos operativos en integraciones y ERPs locales.",
    publishedAt: "2026-06-25",
    author: "Cesar Leon",
    tags: ["Modernización", "Sistemas Legados", "Arquitectura"],
    content: [
      {
        type: "paragraph",
        text: "Modernizar un sistema legado que procesa la facturación o la logística de su empresa es una tarea de alta complejidad. La presión de la operación y el temor a que una migración falle y paralice el negocio a menudo retrasan decisiones técnicas necesarias, incrementando la deuda técnica y los costos de infraestructura.",
      },
      {
        type: "heading",
        level: 2,
        text: "El Patrón Strangler Fig (Higo Estrangulador)",
      },
      {
        type: "paragraph",
        text: "En lugar de realizar una migración masiva de tipo 'Big Bang' (reescribir todo el sistema y apagar el anterior), la mejor práctica de ingeniería consiste en reemplazar el sistema de forma incremental. El Patrón Strangler Fig permite que la nueva arquitectura conviva con la anterior mediante una capa de enrutamiento (como un API Gateway), migrando módulo por módulo hasta que el sistema obsoleto quede completamente reemplazado.",
      },
      {
        type: "heading",
        level: 2,
        text: "Estrategia para una migración segura",
      },
      {
        type: "list",
        items: [
          "Identificar y aislar el módulo más sencillo pero valioso (ej. registro de usuarios o generación de reportes).",
          "Crear una capa de interoperabilidad para sincronizar bases de datos en tiempo real entre la nueva y vieja estructura.",
          "Implementar pruebas automatizadas de regresión para asegurar que la nueva API responde exactamente igual que el endpoint legado.",
          "Migrar progresivamente el tráfico de red utilizando despliegues controlados (Canary Releases).",
        ],
      },
      {
        type: "paragraph",
        text: "Esta modernización por etapas reduce la ansiedad de la organización y asegura que las integraciones clave con ERPs contables en Colombia (como Siigo o SAP) sigan operativas durante todo el proceso de transición.",
      },
    ],
  },
  {
    slug: "optimizacion-costos-nube-serverless-colombia",
    title: "Optimización de costos en la nube: arquitectura serverless para empresas en crecimiento en Colombia",
    description:
      "Cómo estructurar arquitecturas en la nube basadas en Serverless (AWS Lambda, Azure Functions) para escalar recursos automáticamente y mitigar el impacto de la fluctuación del dólar en infraestructura.",
    publishedAt: "2026-07-15",
    author: "Andres Betancourt",
    tags: ["Nube", "Serverless", "Optimización de Costos"],
    content: [
      {
        type: "paragraph",
        text: "La infraestructura en la nube (AWS, Azure, Google Cloud) se cotiza globalmente en dólares (USD). Para empresas en crecimiento y startups en Colombia y Latinoamérica, la devaluación y la fluctuación de la moneda local representan un reto financiero importante para sostener costos fijos de servidores y bases de datos encendidas 24/7.",
      },
      {
        type: "heading",
        level: 2,
        text: "Por qué Serverless es ideal para el presupuesto regional",
      },
      {
        type: "paragraph",
        text: "La arquitectura Serverless cambia el paradigma de 'pagar por servidor reservado' a 'pagar por uso real'. Si su sistema no procesa peticiones en la madrugada o tiene picos esporádicos durante el día, las funciones Lambda o Cloud Functions reducen la facturación a cero cuando no hay demanda, escalando de manera instantánea y automática cuando se presentan eventos de tráfico masivo (como el Día sin IVA o campañas promocionales).",
      },
      {
        type: "heading",
        level: 2,
        text: "Pasos claves para reducir costos de infraestructura",
      },
      {
        type: "list",
        items: [
          "Migrar tareas asíncronas y procesamiento de imágenes a funciones Serverless de pago por ejecución.",
          "Implementar bases de datos con capacidad bajo demanda (on-demand scaling) para evitar sobredimensionamiento.",
          "Configurar políticas estrictas de ciclo de vida en buckets de almacenamiento (S3) para mover archivos históricos a clases de almacenamiento de menor costo (Glacier).",
          "Monitorear los picos de consumo mediante herramientas de FinOps para detectar loops o consultas ineficientes a base de datos.",
        ],
      },
      {
        type: "paragraph",
        text: "Adoptar una estrategia serverless estructurada permite a las organizaciones optimizar su presupuesto operativo regional y escalar su infraestructura de software sin comprometer la estabilidad ante picos inesperados de tráfico.",
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
