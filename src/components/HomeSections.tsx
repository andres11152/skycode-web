import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { Highlights } from "@/components/sections/Highlights";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { Portfolio } from "@/components/sections/Portfolio";
import { BlogTeaser } from "@/components/sections/BlogTeaser";
import { Faq } from "@/components/sections/Faq";
import {
  HomeInteractiveClosing,
  HomeInteractiveContact,
  HomeInteractiveEstimator,
  HomeInteractiveTestimonials,
} from "@/components/HomeInteractiveSections";
import type { Locale } from "@/lib/i18n";

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
