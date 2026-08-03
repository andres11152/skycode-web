import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/BlogIndexView";

export const metadata: Metadata = {
  title: "Blog Técnico",
  description:
    "Artículos especializados sobre arquitectura de software, seguridad informática bajo estándares OWASP y cumplimiento normativo de protección de datos (Ley 1581, RGPD y marcos equivalentes).",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  return <BlogIndexView />;
}
