import dynamic from "next/dynamic";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import type { Locale } from "@/lib/i18n";

const Highlights = dynamic(() =>
  import("@/components/sections/Highlights").then((mod) => mod.Highlights)
);
const Services = dynamic(() =>
  import("@/components/sections/Services").then((mod) => mod.Services)
);
const Process = dynamic(() =>
  import("@/components/sections/Process").then((mod) => mod.Process)
);
const Portfolio = dynamic(() =>
  import("@/components/sections/Portfolio").then((mod) => mod.Portfolio)
);
const Testimonials = dynamic(() =>
  import("@/components/sections/Testimonials").then((mod) => mod.Testimonials)
);
const BlogTeaser = dynamic(() =>
  import("@/components/sections/BlogTeaser").then((mod) => mod.BlogTeaser)
);
const Faq = dynamic(() =>
  import("@/components/sections/Faq").then((mod) => mod.Faq)
);
const ClosingStatement = dynamic(() =>
  import("@/components/sections/ClosingStatement").then((mod) => mod.ClosingStatement)
);
const ProjectEstimator = dynamic(() =>
  import("@/components/sections/ProjectEstimator").then((mod) => mod.ProjectEstimator)
);
const Contact = dynamic(() =>
  import("@/components/sections/Contact").then((mod) => mod.Contact)
);

export function HomeSections({ locale }: { locale: Locale }) {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <div className="flex flex-col lg:min-h-svh">
        <Hero locale={locale} />
        <TrustStrip locale={locale} />
      </div>
      <Highlights locale={locale} />
      <Services locale={locale} />
      <Process locale={locale} />
      <ProjectEstimator locale={locale} />
      <Portfolio locale={locale} />
      <Testimonials locale={locale} />
      <BlogTeaser locale={locale} />
      <Faq locale={locale} />
      <ClosingStatement locale={locale} />
      <Contact locale={locale} />
    </main>
  );
}
