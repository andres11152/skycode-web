import dynamic from "next/dynamic";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { Faq } from "@/components/sections/Faq";
import { Highlights } from "@/components/sections/Highlights";
import { Process } from "@/components/sections/Process";
import { ProjectEstimatorTeaser } from "@/components/sections/ProjectEstimatorTeaser";
import { Services } from "@/components/sections/Services";
import { SectionRail } from "@/components/ui/SectionRail";
import { Testimonials } from "@/components/sections/Testimonials";
import { HomeInteractiveClosing, HomeInteractiveContact } from "@/components/HomeInteractiveSections";
import { getBlogPosts } from "@/content/blog";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import type { Locale } from "@/lib/i18n";

const Portfolio = dynamic(() =>
  import("@/components/sections/Portfolio").then((m) => m.Portfolio)
);
const BlogTeaser = dynamic(() =>
  import("@/components/sections/BlogTeaser").then((m) => m.BlogTeaser)
);

export async function HomeSections({ locale }: { locale: Locale }) {
  // Server Component — se resuelve al renderizar, `BlogTeaser` (cliente)
  // recibe los posts ya listos por prop en vez de leerlos él mismo, porque
  // desde la Fase 3 del plan de SEO `getBlogPosts` lee de Postgres y ya no
  // es síncrono (ver content/blog.ts).
  const [recentPosts, portfolioProjects] = await Promise.all([
    getBlogPosts(locale).then((posts) => posts.slice(0, 3)),
    getPublishedPortfolioProjects(locale),
  ]);

  // `overflow-x-clip` (no `hidden`) en el <main>: los revelados laterales (`reveal-left/right`) parten
  // desplazados fuera del viewport y, sin recorte, ensanchaban la página en móvil. `clip` no crea un
  // contenedor de scroll, así que el `sticky` del cierre sigue funcionando.
  return (
    <main id="main-content" className="flex flex-1 flex-col overflow-x-clip">
      <div className="flex flex-col lg:min-h-svh">
        <Hero locale={locale} />
        <TrustStrip locale={locale} />
      </div>
      <Highlights locale={locale} />
      <Services locale={locale} />
      <Portfolio locale={locale} projects={portfolioProjects} />
      <Process locale={locale} />
      <ProjectEstimatorTeaser locale={locale} />
      <Testimonials locale={locale} />
      <BlogTeaser locale={locale} posts={recentPosts} />
      <Faq locale={locale} />
      <HomeInteractiveClosing locale={locale} />
      <HomeInteractiveContact locale={locale} />
      <SectionRail locale={locale} />
    </main>
  );
}
