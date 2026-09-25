import dynamic from "next/dynamic";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import {
  HomeInteractiveClosing,
  HomeInteractiveContact,
  HomeInteractiveEstimator,
  HomeInteractiveTestimonials,
} from "@/components/HomeInteractiveSections";
import { getBlogPosts } from "@/content/blog";
import type { Locale } from "@/lib/i18n";

const Highlights = dynamic(() =>
  import("@/components/sections/Highlights").then((m) => m.Highlights)
);
const Services = dynamic(() =>
  import("@/components/sections/Services").then((m) => m.Services)
);
const Process = dynamic(() =>
  import("@/components/sections/Process").then((m) => m.Process)
);
const Portfolio = dynamic(() =>
  import("@/components/sections/Portfolio").then((m) => m.Portfolio)
);
const BlogTeaser = dynamic(() =>
  import("@/components/sections/BlogTeaser").then((m) => m.BlogTeaser)
);
const Faq = dynamic(() =>
  import("@/components/sections/Faq").then((m) => m.Faq)
);

export async function HomeSections({ locale }: { locale: Locale }) {
  // Server Component — se resuelve al renderizar, `BlogTeaser` (cliente)
  // recibe los posts ya listos por prop en vez de leerlos él mismo, porque
  // desde la Fase 3 del plan de SEO `getBlogPosts` lee de Postgres y ya no
  // es síncrono (ver content/blog.ts).
  const recentPosts = (await getBlogPosts(locale)).slice(0, 3);

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <div className="flex flex-col lg:min-h-svh">
        <Hero locale={locale} />
        <TrustStrip locale={locale} />
      </div>
      <Highlights locale={locale} />
      <Services locale={locale} />
      <Portfolio locale={locale} />
      <Process locale={locale} />
      <HomeInteractiveEstimator locale={locale} />
      <HomeInteractiveTestimonials locale={locale} />
      <BlogTeaser locale={locale} posts={recentPosts} />
      <Faq locale={locale} />
      <HomeInteractiveClosing locale={locale} />
      <HomeInteractiveContact locale={locale} />
    </main>
  );
}
