import dynamic from "next/dynamic";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import {
  HomeInteractiveClosing,
  HomeInteractiveContact,
  HomeInteractiveEstimator,
  HomeInteractiveTestimonials,
} from "@/components/HomeInteractiveSections";
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
      <HomeInteractiveEstimator locale={locale} />
      <Portfolio locale={locale} />
      <HomeInteractiveTestimonials locale={locale} />
      <BlogTeaser locale={locale} />
      <Faq locale={locale} />
      <HomeInteractiveClosing locale={locale} />
      <HomeInteractiveContact locale={locale} />
    </main>
  );
}
