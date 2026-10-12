// Validador estructural de JSON-LD, sin dependencias: extrae los bloques de un HTML, aplana los
// `@graph` y comprueba lo que Google exige a cada tipo + que toda referencia `{ "@id": … }` apunte a
// una entidad definida en la misma página. No sustituye al Rich Results Test de Google (no valida
// elegibilidad), pero atrapa lo que rompe en la práctica: campos obligatorios ausentes, `@id` sin
// definir, posiciones de migas desordenadas, textos vacíos. Lo usan los tests y se puede apuntar a
// cualquier HTML (`extractJsonLd(html)`).

export type JsonLdNode = Record<string, unknown>;

export function extractJsonLd(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const parsed: unknown = JSON.parse(match[1].replace(/\\u003c/g, "<"));
    nodes.push(...flattenJsonLd(parsed));
  }
  return nodes;
}

export function flattenJsonLd(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const node = value as JsonLdNode;
  const graph = node["@graph"];
  if (Array.isArray(graph)) return graph.flatMap(flattenJsonLd);
  return [node];
}

const typesOf = (node: JsonLdNode): string[] => {
  const type = node["@type"];
  return Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
};

export const hasType = (node: JsonLdNode, type: string): boolean => typesOf(node).includes(type);

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
const asNode = (v: unknown): JsonLdNode | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as JsonLdNode) : null);

function requireFields(node: JsonLdNode, label: string, fields: string[], problems: string[]) {
  for (const field of fields) {
    const value = node[field];
    const ok = Array.isArray(value) ? value.length > 0 : isNonEmptyString(value) || (value !== null && typeof value === "object");
    if (!ok) problems.push(`${label}: falta "${field}"`);
  }
}

/** Recorre el nodo y devuelve cada `@id` referenciado (objetos con SOLO `@id`, o `@id` + `@type`/`name` de cortesía). */
function collectReferences(value: unknown, out: string[], isRoot = true): void {
  if (Array.isArray(value)) return value.forEach((v) => collectReferences(v, out, false));
  const node = asNode(value);
  if (!node) return;
  const id = node["@id"];
  const keys = Object.keys(node).filter((k) => k !== "@id" && k !== "@type" && k !== "name" && k !== "url");
  // Una referencia no aporta propiedades propias: solo @id (más tipo/nombre/url de cortesía).
  if (!isRoot && isNonEmptyString(id) && keys.length === 0) out.push(id);
  for (const [key, child] of Object.entries(node)) {
    if (key === "@id" || key === "@type") continue;
    collectReferences(child, out, false);
  }
}

export interface JsonLdValidationOptions {
  /** Entidades definidas fuera de esta página (p. ej. el `@graph` del layout) contra las que también se resuelven referencias. */
  externalIds?: ReadonlySet<string>;
}

/** Devuelve la lista de problemas (vacía = válido). */
export function validateJsonLd(nodes: JsonLdNode[], options: JsonLdValidationOptions = {}): string[] {
  const problems: string[] = [];
  const defined = new Set<string>(options.externalIds ?? []);
  for (const node of nodes) {
    const id = node["@id"];
    if (isNonEmptyString(id) && Object.keys(node).length > 1) defined.add(id);
  }

  for (const node of nodes) {
    const types = typesOf(node);
    const label = `${types.join("+") || "sin @type"}${isNonEmptyString(node["@id"]) ? ` (${String(node["@id"])})` : ""}`;
    if (types.length === 0) {
      problems.push(`${label}: nodo sin @type`);
      continue;
    }

    if (hasType(node, "Organization")) requireFields(node, label, ["@id", "name", "url", "logo"], problems);
    if (hasType(node, "WebSite")) requireFields(node, label, ["@id", "name", "url"], problems);
    if (hasType(node, "Person")) requireFields(node, label, ["@id", "name"], problems);
    if (hasType(node, "WebPage")) requireFields(node, label, ["@id", "name"], problems);
    if (hasType(node, "Service")) requireFields(node, label, ["@id", "name", "description", "provider"], problems);

    if (hasType(node, "BlogPosting") || hasType(node, "Article")) {
      requireFields(node, label, ["headline", "datePublished", "dateModified", "author", "publisher", "image", "mainEntityOfPage"], problems);
      const author = asNode(node.author);
      if (author && !isNonEmptyString(author.name)) problems.push(`${label}: author sin name`);
      const publisher = asNode(node.publisher);
      if (publisher && !isNonEmptyString(publisher.name)) problems.push(`${label}: publisher sin name`);
      if (isNonEmptyString(node.datePublished) && Number.isNaN(Date.parse(node.datePublished))) problems.push(`${label}: datePublished no es una fecha`);
    }

    if (hasType(node, "BreadcrumbList")) {
      const items = asArray(node.itemListElement).map(asNode);
      if (items.length === 0) problems.push(`${label}: itemListElement vacío`);
      items.forEach((item, index) => {
        if (!item) return problems.push(`${label}: elemento ${index + 1} inválido`);
        if (item.position !== index + 1) problems.push(`${label}: posición ${String(item.position)} en el lugar ${index + 1}`);
        if (!isNonEmptyString(item.name)) problems.push(`${label}: elemento ${index + 1} sin name`);
        if (!isNonEmptyString(item.item)) problems.push(`${label}: elemento ${index + 1} sin item (URL)`);
      });
    }

    if (hasType(node, "FAQPage")) {
      const questions = asArray(node.mainEntity).map(asNode);
      if (questions.length === 0) problems.push(`${label}: mainEntity vacío`);
      for (const q of questions) {
        const answer = asNode(q?.acceptedAnswer);
        if (!q || !hasType(q, "Question") || !isNonEmptyString(q.name) || !answer || !isNonEmptyString(answer.text)) {
          problems.push(`${label}: pregunta sin name o sin acceptedAnswer.text`);
        }
      }
    }

    const references: string[] = [];
    collectReferences(node, references);
    for (const ref of references) {
      if (!defined.has(ref)) problems.push(`${label}: referencia a "${ref}" que no está definida`);
    }
  }

  return problems;
}

/** `@id` de las entidades definidas en un conjunto de nodos (para usarlas como `externalIds` de otra página). */
export function definedIds(nodes: JsonLdNode[]): Set<string> {
  return new Set(nodes.map((n) => n["@id"]).filter(isNonEmptyString));
}
