#!/usr/bin/env node
// Uso:
//   node --env-file=.env.local scripts/enrich-sentry-crm-case.mjs            (simulacro, no escribe)
//   node --env-file=.env.local scripts/enrich-sentry-crm-case.mjs --apply    (escribe)
//
// Completa el caso `sentry-crm` (ya publicado) con reto, solución, resultados,
// capacidades y stack real, en es/en/fr. Todo el contenido sale de la
// documentación técnica del propio proyecto (arquitectura, aislamiento por
// inquilino, módulos de tiempo real y WhatsApp, seguridad). NO hay cifras de
// negocio (clientes, tiempos de respuesta, conversaciones): no se inventan —
// ver scripts/seed-data/portfolio/capitulos-por-completar.md. Los "resultados"
// son entregables de ingeniería verificables, no métricas comerciales.
//
// Idempotente: sobrescribe challenge/solution/results/capabilities por
// (proyecto, idioma) y reemplaza el stack del caso. No toca título, resumen,
// imágenes, estado ni orden.

import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");
const SLUG = "sentry-crm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

// Orden = orden de aparición en el caso. slug = también icon_ref (simple-icons).
const STACK = [
  { slug: "nextdotjs", name: "Next.js", category: "frontend" },
  { slug: "typescript", name: "TypeScript", category: "backend" },
  { slug: "nodedotjs", name: "Node.js", category: "backend" },
  { slug: "postgresql", name: "PostgreSQL", category: "database" },
  { slug: "prisma", name: "Prisma", category: "database" },
  { slug: "redis", name: "Redis", category: "database" },
  { slug: "socketdotio", name: "Socket.IO", category: "backend" },
  { slug: "whatsapp", name: "WhatsApp", category: "integration" },
];

const CONTENT = {
  es: {
    challenge:
      "Un negocio que vende por WhatsApp pierde contexto en cuanto la conversación vive en el teléfono de una persona: nadie ve el embudo completo, el historial se rompe cuando se reconecta una sesión y delegar respuestas a un asistente de IA sin perder el control humano es un riesgo. Además, la plataforma debía atender a varios negocios a la vez sin que los datos de uno pudieran tocar jamás los de otro.",
    solution:
      "Una plataforma multi-inquilino con capas estrictamente separadas: solo los repositorios hablan con la base de datos, los servicios concentran la lógica de negocio y los controladores se limitan a validar y responder. Cada consulta, evento en tiempo real y flujo de mensajes está acotado por empresa. Las conversaciones llegan a una bandeja única que se actualiza en vivo; la IA responde cuando se le delega y se silencia sola en cuanto una persona interviene. La sincronización del historial, el envío saliente y la creación de sesiones de WhatsApp son módulos independientes, así un fallo en uno no arrastra a los demás.",
    results:
      "Aislamiento por empresa garantizado en cada capa. Todo dato entrante, incluidos los eventos de WhatsApp, se valida con esquemas antes de tocar la lógica. El código se mantiene con reglas verificables: sin tipos `any`, ningún archivo de más de 500 líneas y errores registrados con su contexto (sesión y empresa). Protección CSRF respaldada en Redis con respaldo en memoria si Redis se cae, y claves temporales con caducidad para proteger la memoria de la cola de trabajos. Un sistema que otro equipo puede entender, mantener y escalar.",
    capabilities: [
      "SaaS Multi-tenant",
      "Modelos de IA",
      "Bandeja omnicanal en tiempo real",
      "Aislamiento de datos por empresa",
    ],
  },
  en: {
    challenge:
      "A business that sells over WhatsApp loses context as soon as the conversation lives on one person's phone: nobody sees the whole funnel, history breaks when a session reconnects, and handing replies to an AI assistant without losing human control is a risk. On top of that, the platform had to serve several businesses at once without one tenant's data ever being able to touch another's.",
    solution:
      "A multi-tenant platform with strictly separated layers: only repositories talk to the database, services hold the business logic, and controllers just validate and respond. Every query, real-time event and message flow is scoped by company. Conversations land in a single inbox that updates live; the AI replies when it is delegated and mutes itself the moment a person steps in. History sync, outbound sending and WhatsApp session creation are independent modules, so a failure in one does not drag the others down.",
    results:
      "Per-company isolation enforced at every layer. All inbound data, including WhatsApp events, is validated against schemas before it reaches the logic. The codebase is held to verifiable rules: no `any` types, no file over 500 lines, and errors logged with their context (session and company). CSRF protection backed by Redis with an in-memory fallback if Redis drops, and expiring keys to protect the job queue's memory. A system another team can understand, maintain and scale.",
    capabilities: [
      "Multi-tenant SaaS",
      "AI Agents",
      "Real-time omnichannel inbox",
      "Per-company data isolation",
    ],
  },
  fr: {
    challenge:
      "Une entreprise qui vend sur WhatsApp perd le contexte dès que la conversation vit sur le téléphone d'une seule personne : personne ne voit l'entonnoir complet, l'historique se brise quand une session se reconnecte, et confier les réponses à un assistant IA sans perdre le contrôle humain est un risque. De plus, la plateforme devait servir plusieurs entreprises à la fois sans que les données de l'une puissent jamais toucher celles d'une autre.",
    solution:
      "Une plateforme multi-locataire aux couches strictement séparées : seuls les dépôts parlent à la base de données, les services portent la logique métier et les contrôleurs se limitent à valider et répondre. Chaque requête, événement temps réel et flux de messages est borné par entreprise. Les conversations arrivent dans une boîte unique mise à jour en direct ; l'IA répond quand on lui délègue et se coupe d'elle-même dès qu'une personne intervient. La synchronisation de l'historique, l'envoi sortant et la création des sessions WhatsApp sont des modules indépendants : une panne de l'un n'entraîne pas les autres.",
    results:
      "Isolation par entreprise garantie à chaque couche. Toute donnée entrante, y compris les événements WhatsApp, est validée par des schémas avant d'atteindre la logique. Le code respecte des règles vérifiables : aucun type `any`, aucun fichier de plus de 500 lignes et des erreurs journalisées avec leur contexte (session et entreprise). Protection CSRF adossée à Redis avec repli en mémoire si Redis tombe, et clés temporaires à expiration pour protéger la mémoire de la file de tâches. Un système qu'une autre équipe peut comprendre, maintenir et faire évoluer.",
    capabilities: [
      "SaaS Multi-locataire",
      "Modèles d'IA",
      "Boîte omnicanale en temps réel",
      "Isolation des données par entreprise",
    ],
  },
};

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  const projectRes = await pool.query(`SELECT id, status FROM portfolio_projects WHERE slug = $1 AND deleted_at IS NULL;`, [SLUG]);
  if (projectRes.rows.length === 0) {
    console.error(`No existe el caso "${SLUG}". Nada que hacer.`);
    process.exit(1);
  }
  const projectId = projectRes.rows[0].id;
  console.log(`Caso "${SLUG}" (id ${projectId}, estado ${projectRes.rows[0].status}).`);

  if (!APPLY) {
    console.log("\nSIMULACRO — no se escribe nada. Con --apply haría:");
    for (const [locale, c] of Object.entries(CONTENT)) {
      console.log(`  [${locale}] reto ${c.challenge.length} car., solución ${c.solution.length}, resultados ${c.results.length}, ${c.capabilities.length} capacidades`);
    }
    console.log(`  Stack: ${STACK.map((t) => t.name).join(", ")}`);
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [locale, c] of Object.entries(CONTENT)) {
      const res = await client.query(
        `UPDATE portfolio_project_translations
         SET challenge = $3, solution = $4, results = $5, capabilities = $6
         WHERE project_id = $1 AND locale = $2;`,
        [projectId, locale, c.challenge, c.solution, c.results, c.capabilities]
      );
      if (res.rowCount !== 1) throw new Error(`El caso no tiene traducción "${locale}"; no se inventa una fila nueva.`);
    }

    const techIds = [];
    for (const tech of STACK) {
      const res = await client.query(
        `INSERT INTO portfolio_technologies (slug, name, category, icon_source, icon_ref)
         VALUES ($1, $2, $3, 'simple-icons', $1)
         ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
         RETURNING id;`,
        [tech.slug, tech.name, tech.category]
      );
      techIds.push(res.rows[0].id);
    }
    await client.query(`DELETE FROM portfolio_project_technologies WHERE project_id = $1;`, [projectId]);
    for (let i = 0; i < techIds.length; i++) {
      await client.query(
        `INSERT INTO portfolio_project_technologies (project_id, technology_id, sort_order) VALUES ($1, $2, $3);`,
        [projectId, techIds[i], i]
      );
    }

    await client.query(`UPDATE portfolio_projects SET updated_at = now() WHERE id = $1;`, [projectId]);
    await client.query("COMMIT");
    console.log("Listo: reto, solución, resultados, capacidades y stack actualizados (es/en/fr).");
    console.log("Recuerda revalidar: publicar/despublicar desde el dashboard, o esperar la revalidación de 1 h.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
