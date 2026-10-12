// Keyword map: la FUENTE DE VERDAD del SEO de las páginas que compiten por una búsqueda.
//
// Una keyword primaria = una sola URL por idioma. El mapa guarda, por clúster y locale, la keyword
// primaria, las secundarias, la intención de búsqueda, la URL objetivo y el copy de buscador
// (`title`, `h1`, `description`) que se deriva de ellas. Las páginas NO escriben su propio título:
// lo piden con `getPageSeo(cluster, locale)`, y `keywordMap.test.ts` hace que la duplicación sea
// imposible por construcción (keyword primaria única, presente en title y H1, sin invadir la de otra
// página, largos dentro de los límites, rutas iguales a las que construye el sitio).
//
// SIN IMPORTS a propósito (como lib/seoHealth.ts): lo leen componentes de servidor, el script
// `npm run seo:check` y el cron del panel; Node lo ejecuta quitando tipos.
//
// Límites: el layout agrega " | SkyCode" (10) a cada `title`, así que `title` ≤ 50. La excepción es el
// clúster `brand` (la home), que va con título ABSOLUTO (sin sufijo, la marca ya va primero) ≤ 60.
// `description` entre 140 y 155 caracteres.

export type SeoLocale = "es" | "en" | "fr";
export type SearchIntent = "commercial" | "informational" | "brand";

export interface KeywordEntry {
  /** Una sola URL por idioma puede tener esta keyword como primaria. */
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  intent: SearchIntent;
  /** Ruta canónica (sin dominio) de la página dueña de la keyword. */
  targetPath: string;
  /** `<title>` propio; el sufijo de marca lo agrega el layout (salvo `brand`, ver arriba). */
  title: string;
  h1: string;
  description: string;
}

export const TITLE_OWN_MAX = 50;
export const TITLE_ABSOLUTE_MAX = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 155;

/** Clústeres cuyo título se publica ABSOLUTO (sin " | SkyCode"). */
export const ABSOLUTE_TITLE_CLUSTERS = ["brand"] as const;

export const KEYWORD_MAP = {
  brand: {
    es: {
      primaryKeyword: "skycode",
      secondaryKeywords: ["sky code", "skycode agency", "skycode colombia"],
      intent: "brand",
      targetPath: "/",
      title: "SkyCode: software a la medida para empresas en Colombia",
      h1: "SkyCode crea el software de tu empresa. El código es 100% tuyo",
      description: "SkyCode es una agencia de software a la medida en Colombia: plataformas web, apps móviles e integraciones. Código 100% tuyo y 90 días de garantía.",
    },
    en: {
      primaryKeyword: "skycode",
      secondaryKeywords: ["sky code", "skycode agency", "skycode colombia"],
      intent: "brand",
      targetPath: "/en",
      title: "SkyCode: Custom Software Agency in Colombia",
      h1: "SkyCode builds your company's software. You own 100% of the code",
      description: "SkyCode is a custom software agency in Colombia: web platforms, mobile apps and integrations. You own 100% of the code, with a 90-day warranty.",
    },
    fr: {
      primaryKeyword: "skycode",
      secondaryKeywords: ["sky code", "skycode agency", "skycode colombie"],
      intent: "brand",
      targetPath: "/fr",
      title: "SkyCode : logiciels sur mesure pour entreprises",
      h1: "SkyCode conçoit les logiciels de votre entreprise. Le code est 100 % à vous",
      description: "SkyCode est une agence de logiciels sur mesure en Colombie : plateformes web, apps mobiles et intégrations. Code 100 % à vous, 90 jours de garantie.",
    },
  },
  "services-index": {
    es: {
      primaryKeyword: "servicios de desarrollo de software",
      secondaryKeywords: ["servicios de software para empresas", "desarrollo de software para empresas"],
      intent: "commercial",
      targetPath: "/servicios",
      title: "Servicios de desarrollo de software para empresas",
      h1: "Servicios de desarrollo de software para empresas",
      description: "Desarrollo de software a la medida, apps móviles, APIs, ecommerce, seguridad e IA para empresas. Código 100% tuyo y 90 días de garantía. Cotiza sin costo.",
    },
    en: {
      primaryKeyword: "software development services",
      secondaryKeywords: ["software development services for businesses", "software development agency"],
      intent: "commercial",
      targetPath: "/en/services",
      title: "Software Development Services for Businesses",
      h1: "Software development services for businesses",
      description: "Custom software, mobile apps, APIs, ecommerce, security and AI for businesses. Source code 100% yours and a 90-day warranty. Get a free quote.",
    },
    fr: {
      primaryKeyword: "services de développement logiciel",
      secondaryKeywords: ["développement logiciel pour entreprises", "agence de développement logiciel"],
      intent: "commercial",
      targetPath: "/fr/services",
      title: "Services de développement logiciel sur mesure",
      h1: "Services de développement logiciel sur mesure pour entreprises",
      description: "Logiciels sur mesure, apps mobiles, API, e-commerce, sécurité et IA pour entreprises. Code 100 % à vous et 90 jours de garantie. Devis gratuit.",
    },
  },
  "desarrollo-software-medida": {
    es: {
      primaryKeyword: "desarrollo de software a la medida",
      secondaryKeywords: ["software a la medida", "empresa de desarrollo de software a la medida", "fábrica de software"],
      intent: "commercial",
      targetPath: "/servicios/desarrollo-software-medida",
      title: "Desarrollo de software a la medida para empresas",
      h1: "Desarrollo de software a la medida para empresas",
      description: "Plataformas, CRM y sistemas de gestión a la medida para empresas. Código 100% tuyo, avances semanales y 90 días de garantía. Cotiza sin costo.",
    },
    en: {
      primaryKeyword: "custom software development",
      secondaryKeywords: ["custom software development company", "bespoke software development", "custom software for businesses"],
      intent: "commercial",
      targetPath: "/en/services/custom-software-development",
      title: "Custom Software Development for Businesses",
      h1: "Custom software development for businesses",
      description: "Custom platforms, CRMs and management systems built for your workflow. 100% yours: source code, weekly demos and a 90-day warranty. Get a free quote.",
    },
    fr: {
      primaryKeyword: "développement de logiciels sur mesure",
      secondaryKeywords: ["développement logiciel sur mesure", "agence de développement logiciel sur mesure"],
      intent: "commercial",
      targetPath: "/fr/services/developpement-logiciel-sur-mesure",
      title: "Développement de logiciels sur mesure",
      h1: "Développement de logiciels sur mesure pour entreprises",
      description: "Plateformes, CRM et systèmes de gestion conçus pour vos processus. Code 100 % à vous, démonstrations hebdomadaires et 90 jours de garantie. Devis gratuit.",
    },
  },
  "desarrollo-aplicaciones-moviles": {
    es: {
      primaryKeyword: "desarrollo de aplicaciones móviles",
      secondaryKeywords: ["desarrollo de apps móviles", "apps para ios y android"],
      intent: "commercial",
      targetPath: "/servicios/desarrollo-aplicaciones-moviles",
      title: "Desarrollo de aplicaciones móviles iOS y Android",
      h1: "Desarrollo de aplicaciones móviles para iOS y Android",
      description: "Desarrollamos apps móviles para iOS y Android que siguen funcionando sin conexión. Código 100% tuyo, entregas semanales y 90 días de garantía.",
    },
    en: {
      primaryKeyword: "mobile app development",
      secondaryKeywords: ["ios and android app development", "custom mobile app development"],
      intent: "commercial",
      targetPath: "/en/services/mobile-app-development",
      title: "iOS & Android Mobile App Development",
      h1: "iOS and Android mobile app development",
      description: "We build iOS and Android mobile apps that keep working offline. You own 100% of the code, with weekly deliveries and a 90-day warranty. Get a free quote.",
    },
    fr: {
      primaryKeyword: "développement d'applications mobiles",
      secondaryKeywords: ["applications mobiles ios et android", "développement d'apps mobiles"],
      intent: "commercial",
      targetPath: "/fr/services/developpement-applications-mobiles",
      title: "Développement d'applications mobiles iOS, Android",
      h1: "Développement d'applications mobiles iOS et Android",
      description: "Nous développons des applications iOS et Android qui fonctionnent aussi hors connexion. Code 100 % à vous, livraisons hebdomadaires, 90 jours de garantie.",
    },
  },
  "apis-integraciones": {
    es: {
      primaryKeyword: "integración de sistemas y desarrollo de apis",
      secondaryKeywords: ["desarrollo de apis", "integración de apis", "integración con erp y pasarelas de pago"],
      intent: "commercial",
      targetPath: "/servicios/apis-integraciones",
      title: "Integración de Sistemas y Desarrollo de APIs",
      h1: "Integración de sistemas y desarrollo de APIs",
      description: "Conectamos tu software con pasarelas de pago, ERPs, sistemas contables y WhatsApp mediante APIs seguras y documentadas. Respuesta en menos de 4 h hábiles.",
    },
    en: {
      primaryKeyword: "system integration and api development",
      secondaryKeywords: ["api development services", "erp and payment gateway integration"],
      intent: "commercial",
      targetPath: "/en/services/api-development-system-integration",
      title: "System Integration & API Development",
      h1: "System integration and API development",
      description: "We connect your software to payment gateways, ERPs, accounting systems and WhatsApp through secure, documented APIs. Reply within 4 business hours.",
    },
    fr: {
      primaryKeyword: "intégration de systèmes et développement d'api",
      secondaryKeywords: ["développement d'api", "intégration erp et passerelles de paiement"],
      intent: "commercial",
      targetPath: "/fr/services/integration-systemes-developpement-api",
      title: "Intégration de systèmes et développement d'API",
      h1: "Intégration de systèmes et développement d'API",
      description: "Nous connectons votre logiciel aux passerelles de paiement, ERP, outils comptables et WhatsApp via des API sécurisées. Réponse sous 4 h ouvrées.",
    },
  },
  "frontend-alto-rendimiento": {
    es: {
      primaryKeyword: "desarrollo web a la medida",
      secondaryKeywords: ["desarrollo web con next.js", "desarrollo frontend con react", "sitios web rápidos"],
      intent: "commercial",
      targetPath: "/servicios/frontend-alto-rendimiento",
      title: "Desarrollo Web a la Medida con Next.js y React",
      h1: "Desarrollo web a la medida con Next.js y React",
      description: "Sitios y aplicaciones web rápidas, accesibles y pensadas para posicionar en Google, con Next.js y React. Código 100% tuyo y 90 días de garantía.",
    },
    en: {
      primaryKeyword: "custom web development",
      secondaryKeywords: ["next.js development", "react web application development"],
      intent: "commercial",
      targetPath: "/en/services/nextjs-react-web-development",
      title: "Custom Web Development with Next.js & React",
      h1: "Custom web development with Next.js and React",
      description: "Fast, accessible web sites and applications built with Next.js and React and designed to rank on Google. You own 100% of the code, with a 90-day warranty.",
    },
    fr: {
      primaryKeyword: "développement web sur mesure",
      secondaryKeywords: ["développement next.js", "développement react"],
      intent: "commercial",
      targetPath: "/fr/services/developpement-web-nextjs-react",
      title: "Développement web sur mesure avec Next.js",
      h1: "Développement web sur mesure avec Next.js et React",
      description: "Sites et applications web rapides, accessibles et pensés pour le référencement Google, avec Next.js et React. Code 100 % à vous, 90 jours de garantie.",
    },
  },
  "ecommerce-tienda-online": {
    es: {
      primaryKeyword: "desarrollo de tiendas online",
      secondaryKeywords: ["tienda online a la medida", "desarrollo de ecommerce"],
      intent: "commercial",
      targetPath: "/servicios/ecommerce-tienda-online",
      title: "Desarrollo de tiendas online y ecommerce",
      h1: "Desarrollo de tiendas online y ecommerce a la medida",
      description: "Tiendas online a la medida con catálogo amplio, checkout ágil e integración con inventario, pagos y envíos. Tu código, sin ataduras a una plataforma.",
    },
    en: {
      primaryKeyword: "online store development",
      secondaryKeywords: ["custom ecommerce development", "ecommerce development company"],
      intent: "commercial",
      targetPath: "/en/services/ecommerce-development",
      title: "Custom Ecommerce & Online Store Development",
      h1: "Custom ecommerce and online store development",
      description: "Custom online stores with large catalogs, fast checkout and live sync with inventory, payments and shipping. Your code, no platform lock-in.",
    },
    fr: {
      primaryKeyword: "boutiques en ligne sur mesure",
      secondaryKeywords: ["développement e-commerce", "création de boutique en ligne"],
      intent: "commercial",
      targetPath: "/fr/services/developpement-boutique-en-ligne",
      title: "Développement de boutiques en ligne sur mesure",
      h1: "Développement de boutiques en ligne sur mesure",
      description: "Boutiques en ligne sur mesure : grand catalogue, paiement fluide, synchronisation stock, paiements et livraison. Votre code, sans plateforme captive.",
    },
  },
  "seguridad-cumplimiento": {
    es: {
      primaryKeyword: "seguridad de software",
      secondaryKeywords: ["cumplimiento ley 1581", "seguridad owasp", "protección de datos en software"],
      intent: "commercial",
      targetPath: "/servicios/seguridad-cumplimiento",
      title: "Seguridad de Software y Cumplimiento Ley 1581",
      h1: "Seguridad de software y cumplimiento de la Ley 1581",
      description: "Seguridad desde la arquitectura: accesos por rol, cifrado de datos y cumplimiento de Habeas Data (Ley 1581) y RGPD, con buenas prácticas OWASP.",
    },
    en: {
      primaryKeyword: "software security",
      secondaryKeywords: ["data protection compliance", "owasp secure development"],
      intent: "commercial",
      targetPath: "/en/services/software-security-compliance",
      title: "Software Security & Data Protection Compliance",
      h1: "Software security and data protection compliance",
      description: "Security built into the architecture: role-based access, data encryption and GDPR and local data protection law compliance, following OWASP.",
    },
    fr: {
      primaryKeyword: "sécurité logicielle",
      secondaryKeywords: ["conformité rgpd", "développement sécurisé owasp"],
      intent: "commercial",
      targetPath: "/fr/services/securite-logicielle-conformite",
      title: "Sécurité logicielle et conformité RGPD",
      h1: "Sécurité logicielle et conformité à la protection des données",
      description: "Sécurité dès l'architecture : accès par rôle, chiffrement des données, conformité RGPD et lois locales de protection des données, bonnes pratiques OWASP.",
    },
  },
  "arquitectura-documentacion": {
    es: {
      primaryKeyword: "documentación técnica de software",
      secondaryKeywords: ["arquitectura de software", "transferencia de código"],
      intent: "commercial",
      targetPath: "/servicios/arquitectura-documentacion",
      title: "Arquitectura y documentación técnica de software",
      h1: "Arquitectura y documentación técnica de software que tu equipo puede mantener",
      description: "Entregamos repositorios, variables de entorno y diagramas de arquitectura para que tu equipo u otro proveedor continúe el código sin depender de nosotros.",
    },
    en: {
      primaryKeyword: "software architecture and technical documentation",
      secondaryKeywords: ["software documentation services", "code handover"],
      intent: "commercial",
      targetPath: "/en/services/software-architecture-documentation",
      title: "Software Architecture & Technical Documentation",
      h1: "Software architecture and technical documentation",
      description: "We hand over repositories, environment variables and architecture diagrams so your team or any other vendor can continue the code without depending on us.",
    },
    fr: {
      primaryKeyword: "documentation technique",
      secondaryKeywords: ["architecture logicielle", "transfert de code source"],
      intent: "commercial",
      targetPath: "/fr/services/architecture-documentation-technique",
      title: "Architecture et documentation technique",
      h1: "Architecture logicielle et documentation technique",
      description: "Nous remettons dépôts, variables d'environnement et schémas d'architecture pour que votre équipe ou un autre prestataire reprenne le code sans nous.",
    },
  },
  "migracion-datos-legacy": {
    es: {
      primaryKeyword: "servicios de migración de sistemas legacy",
      secondaryKeywords: ["migración de sistemas heredados", "modernización de sistemas heredados", "modernizar sistemas legacy"],
      intent: "commercial",
      targetPath: "/servicios/migracion-datos-legacy",
      title: "Servicios de migración de sistemas legacy",
      h1: "Servicios de migración de sistemas legacy: modernización sin downtime",
      description: "Servicios de migración de sistemas legacy y heredados por fases: sin downtime, sin perder datos y con integridad validada. Cotiza sin costo.",
    },
    en: {
      primaryKeyword: "legacy software migration services",
      secondaryKeywords: ["legacy software migration company", "legacy software migration agency", "legacy system modernization"],
      intent: "commercial",
      targetPath: "/en/services/legacy-software-migration",
      title: "Legacy Software Migration Services",
      h1: "Legacy Software Migration Services",
      description: "We are a legacy software migration company and agency: phased delivery, zero downtime, no data loss and validated integrity. Get a free quote.",
    },
    fr: {
      primaryKeyword: "migration système legacy",
      secondaryKeywords: ["migration de code legacy", "migration de systèmes legacy", "modernisation de systèmes legacy"],
      intent: "commercial",
      targetPath: "/fr/services/migration-systemes-legacy",
      title: "Migration système legacy sans interruption",
      h1: "Migration système legacy : modernisation sans interruption de service",
      description: "Migration système legacy par étapes : sans coupure, sans perte de données et intégrité validée. Migration de code legacy et modernisation. Devis gratuit.",
    },
  },
  "inteligencia-artificial-aplicada": {
    es: {
      primaryKeyword: "ia para empresas",
      secondaryKeywords: ["asistentes de ia para empresas", "automatización con inteligencia artificial"],
      intent: "commercial",
      targetPath: "/servicios/inteligencia-artificial-aplicada",
      title: "IA para empresas: asistentes y automatización",
      h1: "IA para empresas: inteligencia artificial aplicada a tu negocio",
      description: "Asistentes de IA y automatización de documentos conectados a la información de tu empresa para ahorrar horas operativas. Implementación a la medida.",
    },
    en: {
      primaryKeyword: "ai for business",
      secondaryKeywords: ["ai assistants for business", "business process automation with ai"],
      intent: "commercial",
      targetPath: "/en/services/applied-ai-automation",
      title: "AI for Business: Assistants & Automation",
      h1: "AI for business: applied artificial intelligence",
      description: "AI assistants and document automation connected to your company's own knowledge base to save operating hours. Implemented to fit your processes.",
    },
    fr: {
      primaryKeyword: "ia pour entreprises",
      secondaryKeywords: ["assistants ia pour entreprises", "automatisation par l'intelligence artificielle"],
      intent: "commercial",
      targetPath: "/fr/services/ia-appliquee-automatisation",
      title: "IA pour entreprises : assistants et automatisation",
      h1: "IA pour entreprises : intelligence artificielle appliquée",
      description: "Assistants IA et automatisation de documents connectés aux connaissances de votre entreprise pour gagner des heures d'exploitation. Sur mesure.",
    },
  },
  "migracion-legacy-guia": {
    es: {
      primaryKeyword: "migrar sistemas legados sin downtime",
      secondaryKeywords: ["migración de sistemas legados", "cómo modernizar un sistema legado", "patrón strangler fig"],
      intent: "informational",
      targetPath: "/blog/migracion-sistemas-legados-sin-interrupcion",
      title: "Guía: cómo migrar sistemas legados sin downtime",
      h1: "Guía: cómo migrar sistemas legados sin downtime",
      description: "Guía paso a paso para migrar sistemas legados sin downtime ni pérdida de datos: Strangler Fig, errores comunes, decommission y preguntas frecuentes.",
    },
    en: {
      primaryKeyword: "migrate legacy systems without downtime",
      secondaryKeywords: ["legacy system migration without downtime", "how to modernize a legacy system", "strangler fig pattern"],
      intent: "informational",
      targetPath: "/en/blog/legacy-system-migration-without-downtime",
      title: "Guide: Migrate Legacy Systems Without Downtime",
      h1: "Guide: how to migrate legacy systems without downtime",
      description: "Step-by-step guide to migrate legacy systems without downtime or data loss: Strangler Fig, common mistakes, decommissioning and a short FAQ.",
    },
    fr: {
      primaryKeyword: "migrer un système legacy sans interruption",
      secondaryKeywords: ["migration d'un système legacy sans interruption", "moderniser un système legacy", "pattern strangler fig"],
      intent: "informational",
      targetPath: "/fr/blog/migration-systeme-legacy-sans-interruption",
      title: "Guide : migrer un système legacy sans interruption",
      h1: "Guide : comment migrer un système legacy sans interruption",
      description: "Guide pas à pas pour migrer un système legacy sans interruption ni perte de données : Strangler Fig, erreurs fréquentes, décommissionnement et FAQ.",
    },
  },
} as const satisfies Record<string, Record<SeoLocale, KeywordEntry>>;

export type ClusterId = keyof typeof KEYWORD_MAP;

export const SEO_LOCALES: readonly SeoLocale[] = ["es", "en", "fr"];

/** Clústeres que son una página de servicio (su id es el slug interno del servicio, en español). */
export const SERVICE_CLUSTER_IDS = [
  "desarrollo-software-medida",
  "desarrollo-aplicaciones-moviles",
  "apis-integraciones",
  "frontend-alto-rendimiento",
  "ecommerce-tienda-online",
  "seguridad-cumplimiento",
  "arquitectura-documentacion",
  "migracion-datos-legacy",
  "inteligencia-artificial-aplicada",
] as const satisfies readonly ClusterId[];

export interface PageSeo {
  cluster: ClusterId;
  locale: SeoLocale;
  title: string;
  h1: string;
  description: string;
  path: string;
  primaryKeyword: string;
  intent: SearchIntent;
  /** `true` → publicar con `title: { absolute }` (sin el sufijo del layout). */
  absoluteTitle: boolean;
}

export function getKeywordEntry(cluster: ClusterId, locale: SeoLocale): KeywordEntry {
  return KEYWORD_MAP[cluster][locale];
}

/**
 * Title/H1/description de una página, derivados del mapa. Es la ÚNICA vía por la que las páginas
 * obtienen este copy: si dos páginas comparten texto es porque el mapa lo dice, y el test lo impide.
 */
export function getPageSeo(cluster: ClusterId, locale: SeoLocale): PageSeo {
  const entry = getKeywordEntry(cluster, locale);
  return {
    cluster,
    locale,
    title: entry.title,
    h1: entry.h1,
    description: entry.description,
    path: entry.targetPath,
    primaryKeyword: entry.primaryKeyword,
    intent: entry.intent,
    absoluteTitle: (ABSOLUTE_TITLE_CLUSTERS as readonly string[]).includes(cluster),
  };
}

export interface FlatKeywordEntry extends KeywordEntry {
  cluster: ClusterId;
  locale: SeoLocale;
}

/** Todas las entradas del mapa, aplanadas (cluster × locale). */
export function listKeywordEntries(): FlatKeywordEntry[] {
  return (Object.keys(KEYWORD_MAP) as ClusterId[]).flatMap((cluster) =>
    SEO_LOCALES.map((locale) => ({ cluster, locale, ...KEYWORD_MAP[cluster][locale] }))
  );
}

/** Entrada dueña de una ruta (`/servicios/x`, `/en`…), o `undefined` si la página no está en el mapa. */
export function findEntryByPath(path: string): FlatKeywordEntry | undefined {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return listKeywordEntries().find((entry) => entry.targetPath === clean);
}

/**
 * Normaliza para comparar texto con una keyword: minúsculas, sin tildes, "&" como "and", apóstrofes
 * tipográficos como rectos y la puntuación como espacio. "Intégration de systèmes" ≈ "integration de systemes".
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[^a-z0-9'\s.+#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿`text` contiene la keyword (comparando sin tildes ni puntuación y respetando límites de palabra)? */
export function containsKeyword(text: string, keyword: string): boolean {
  const haystack = ` ${normalizeForMatch(text)} `;
  const needle = normalizeForMatch(keyword);
  return needle.length > 0 && haystack.includes(` ${needle} `);
}

export interface KeywordExpectation {
  path: string;
  cluster: string;
  locale: SeoLocale;
  primaryKeyword: string;
}

/** Lo que `seoHealth` exige a cada URL del mapa: su keyword primaria en title y H1. */
export function getKeywordExpectations(): KeywordExpectation[] {
  return listKeywordEntries().map(({ cluster, locale, targetPath, primaryKeyword }) => ({
    path: targetPath,
    cluster,
    locale,
    primaryKeyword,
  }));
}
