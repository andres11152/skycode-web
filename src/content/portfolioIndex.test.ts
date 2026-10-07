import { describe, expect, it } from "vitest";
import {
  INDEX_PREVIEW_LIMIT,
  toIndexItem,
  topTechnologies,
  type PortfolioImage,
  type PortfolioProject,
  type PortfolioTechnology,
} from "./portfolioShared";

function image(id: number): PortfolioImage {
  return {
    id,
    variants: { sm: `sm-${id}`, md: `md-${id}`, lg: `lg-${id}` },
    width: 1600,
    height: 1000,
    alt: `alt ${id}`,
    blurDataURL: null,
    color: null,
  };
}

function tech(id: number): PortfolioTechnology {
  return { id, slug: `t${id}`, name: `T${id}`, category: "frontend", iconSource: "simple-icons", iconRef: `t${id}`, websiteUrl: null, icon: null };
}

function project(overrides: Partial<PortfolioProject>): PortfolioProject {
  return {
    slug: "caso",
    status: "published",
    isFeatured: false,
    liveUrl: null,
    industryIcon: "Graph",
    title: "Caso",
    clientLabel: "Cliente",
    summary: "Resumen",
    challenge: "reto largo",
    solution: "solución larga",
    results: "",
    clientContext: "",
    architecture: "arquitectura larga",
    process: "",
    testimonialQuote: "",
    testimonialAuthor: "",
    testimonialRole: "",
    capabilities: ["a"],
    technologies: [],
    images: [],
    coverImage: null,
    metrics: [],
    publishedAt: null,
    translated: true,
    ...overrides,
  };
}

describe("toIndexItem", () => {
  it("pone la portada primero y limita las capturas del índice", () => {
    const images = Array.from({ length: 19 }, (_, i) => image(i + 1));
    const item = toIndexItem(project({ images, coverImage: images[4] }));
    expect(item.previewImages).toHaveLength(INDEX_PREVIEW_LIMIT);
    expect(item.previewImages[0].id).toBe(5);
    expect(item.previewImages.filter((img) => img.id === 5)).toHaveLength(1);
    expect(item.imageCount).toBe(19);
  });

  it("sin portada explícita usa el orden de la galería", () => {
    const images = [image(1), image(2)];
    expect(toIndexItem(project({ images })).previewImages.map((img) => img.id)).toEqual([1, 2]);
  });

  it("no arrastra los capítulos de texto ni las tecnologías al cliente", () => {
    const item = toIndexItem(project({ technologies: [tech(1)] })) as unknown as Record<string, unknown>;
    for (const key of ["challenge", "solution", "architecture", "technologies", "images", "metrics"]) {
      expect(key in item).toBe(false);
    }
  });
});

describe("topTechnologies", () => {
  it("ordena por uso y respeta el límite", () => {
    const projects = [
      project({ technologies: [tech(1), tech(2)] }),
      project({ technologies: [tech(2), tech(3)] }),
      project({ technologies: [tech(2), tech(1)] }),
    ];
    expect(topTechnologies(projects, 2).map((t) => t.id)).toEqual([2, 1]);
  });
});
