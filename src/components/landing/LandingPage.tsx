import Image from "next/image";
import { Plus } from "@phosphor-icons/react/ssr";
import { LandingForm, type LandingFormCopy } from "@/components/landing/LandingForm";
import { LandingWhatsappLink } from "@/components/landing/LandingWhatsappLink";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getContactContent } from "@/content/contact";
import { getLandingContent, type LandingContent, type LandingVariantId } from "@/content/landing";
import type { PortfolioProject } from "@/content/portfolioShared";
import type { PublicTeamMember } from "@/content/teamShared";
import { getTestimonialsContent } from "@/content/testimonials";
import { portfolioCasePath } from "@/lib/portfolioPaths";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import { getPublishedTeamProfiles } from "@/lib/queries/teamProfiles";
import { siteName, whatsappHref } from "@/lib/site";

const SECTION = "px-6 py-16 sm:py-20";
const INNER = "mx-auto w-full max-w-6xl";
const H2 = "mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl";

function buildFormCopy(content: LandingContent): LandingFormCopy {
  const contact = getContactContent("es");
  const { form } = content;
  return {
    title: form.title,
    intro: form.intro,
    name: form.name,
    namePlaceholder: form.namePlaceholder,
    email: form.email,
    emailPlaceholder: form.emailPlaceholder,
    phone: form.phone,
    phoneCountry: contact.placeholders.phoneCountry,
    phoneCountryEmpty: contact.placeholders.phoneCountryEmpty,
    typeLegend: form.typeLegend,
    typeOptions: form.typeOptions,
    message: form.message,
    messagePlaceholder: form.messagePlaceholder,
    submit: form.submit,
    sending: form.sending,
    hours: content.hours,
    consent: contact.habeasData.label,
    privacyLink: contact.habeasData.linkText,
    privacyUrl: contact.habeasData.linkUrl,
    nameError: contact.validation.nameError,
    emailError: contact.validation.emailError,
    consentHint: contact.validation.acceptPolicyHint,
    errorGeneral: contact.errorGeneral,
    errorConnection: contact.errorConnection,
  };
}

function CaseCard({ project, content }: { project: PortfolioProject; content: LandingContent }) {
  const { cases } = content;
  const stack = project.technologies.slice(0, 5).map((technology) => technology.name);

  return (
    <article className="flex flex-col">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-foreground/10 bg-surface-sunken">
        {project.coverImage && (
          <Image
            src={project.coverImage.variants.md}
            alt={project.coverImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            placeholder={project.coverImage.blurDataURL ? "blur" : "empty"}
            blurDataURL={project.coverImage.blurDataURL ?? undefined}
            className="object-cover object-top"
          />
        )}
      </div>
      <p className="mt-4 font-mono text-xs uppercase tracking-wide text-foreground/70">{project.clientLabel}</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-balance">{project.title}</h3>
      <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-foreground/80">{project.summary}</p>
      {stack.length > 0 && (
        <p className="mt-3 text-xs text-foreground/70">
          <span className="font-mono uppercase tracking-wide">{cases.stack}: </span>
          {stack.join(", ")}
        </p>
      )}
      <a
        href={portfolioCasePath("es", project.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 w-fit items-center text-sm font-semibold underline underline-offset-4 outline-none hover:text-accent-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {cases.link}
        <span className="sr-only"> ({cases.linkNewTab})</span>
      </a>
    </article>
  );
}

function TeamCard({ member }: { member: PublicTeamMember }) {
  return (
    <li>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-foreground/10 bg-surface-sunken">
        {member.photo ? (
          <Image src={member.photo} alt={member.name} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-full items-center justify-center font-mono text-2xl text-foreground/70">
            {member.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold">{member.name}</p>
      <p className="text-xs text-foreground/70">{member.role}</p>
    </li>
  );
}

/**
 * Landing de campaña de Google Ads. Server Component: la única isla cliente es el formulario (y el enlace a
 * WhatsApp, que cuenta el clic). Sin Navbar ni Footer ni enlaces de salida que compitan con el formulario;
 * los únicos enlaces que abren fuera (casos y cotizador) lo hacen en una pestaña nueva.
 * Cifras de precio y plazo: `PRICING`. Casos y equipo: Postgres, como el resto del sitio (sin base en el build
 * esas dos secciones quedan vacías y se omiten, no fallan).
 */
export async function LandingPage({ variant }: { variant: LandingVariantId }) {
  const content = getLandingContent(variant);
  const [allProjects, team] = await Promise.all([getPublishedPortfolioProjects("es"), getPublishedTeamProfiles("es")]);

  const projects = content.variant.caseSlugs
    .map((slug) => allProjects.find((project) => project.slug === slug))
    .filter((project): project is PortfolioProject => project !== undefined);

  const allTestimonials = getTestimonialsContent("es").testimonials;
  const testimonials = content.variant.testimonialCompanies
    .map((company) => allTestimonials.find((testimonial) => testimonial.company === company))
    .filter((testimonial) => testimonial !== undefined);

  const whatsappLink = `${whatsappHref}?text=${encodeURIComponent(content.variant.whatsappMessage)}`;

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4">
        <div className={`${INNER} flex items-center justify-between`}>
          <span aria-label={siteName} className="inline-flex items-center">
            <ThemedLogo variant="mark" alt={siteName} width={110} height={63} priority fetchPriority="high" className="h-7 w-auto" />
          </span>
          {/* Mismo selector claro / oscuro / sistema del sitio: la landing respeta la elección guardada. */}
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section aria-labelledby="landing-title" className="px-6 pb-16 pt-6 sm:pt-10 lg:pb-24">
          <div className={`${INNER} grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16`}>
            <div className="flex flex-col gap-6">
              <SectionEyebrow>{content.variant.eyebrow}</SectionEyebrow>
              <h1
                id="landing-title"
                className="text-3xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl"
              >
                {content.variant.title}
              </h1>
              <p className="max-w-xl text-lg text-foreground/80 sm:text-xl">{content.variant.intro}</p>

              <dl
                aria-label={content.facts.ariaLabel}
                className="grid max-w-xl grid-cols-3 divide-x divide-foreground/10 border-y border-foreground/10"
              >
                {content.facts.items.map((fact) => (
                  <div key={fact.label} className="px-3 py-4 first:pl-0 sm:px-5">
                    <dt className="text-xs text-foreground/70">{fact.label}</dt>
                    <dd className="mt-1 font-mono text-sm font-medium sm:text-base">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <Button href="#formulario" variant="accent" size="lg" className="lg:hidden">
                  {content.form.submit}
                </Button>
                <LandingWhatsappLink href={whatsappLink}>{content.header.whatsappCta}</LandingWhatsappLink>
              </div>
            </div>

            <div id="formulario" className="scroll-mt-6 rounded-xl border border-foreground/10 bg-surface-raised">
              <LandingForm copy={buildFormCopy(content)} defaultService={content.variant.defaultService} />
            </div>
          </div>
        </section>

        <section aria-labelledby="landing-pricing" className={`${SECTION} border-t border-foreground/10 bg-foreground/[0.03]`}>
          <div className={INNER}>
            <SectionEyebrow>{content.pricing.eyebrow}</SectionEyebrow>
            <h2 id="landing-pricing" className={H2}>
              {content.pricing.title}
            </h2>
            <p className="mt-4 max-w-2xl text-foreground/80">{content.pricing.intro}</p>

            <table className="mt-10 w-full max-w-3xl text-left text-sm">
              <caption className="sr-only">{content.pricing.caption}</caption>
              <thead>
                <tr className="border-b border-foreground/10 font-mono text-xs uppercase tracking-wide text-foreground/70">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    {content.pricing.columns.project}
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    {content.pricing.columns.from}
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    {content.pricing.columns.weeks}
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.pricingRows.map((row) => (
                  <tr key={row.id} className="border-b border-foreground/10">
                    <th scope="row" className="py-4 pr-4 font-medium">
                      {row.label}
                    </th>
                    <td className="whitespace-nowrap py-4 pr-4 text-right font-mono tabular-nums">{row.price}</td>
                    <td className="py-4 text-right font-mono tabular-nums">{row.weeks}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-6 text-sm text-foreground/80">
              {content.pricing.estimatorNote}{" "}
              <a
                href="/cotizador"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4 outline-none hover:text-accent-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {content.pricing.estimatorCta}
                <span className="sr-only"> ({content.cases.linkNewTab})</span>
              </a>
            </p>
          </div>
        </section>

        <section aria-labelledby="landing-process" className={SECTION}>
          <div className={INNER}>
            <SectionEyebrow>{content.process.eyebrow}</SectionEyebrow>
            <h2 id="landing-process" className={H2}>
              {content.process.title}
            </h2>

            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {content.process.steps.map((step, index) => (
                <li key={step.title} className="border-t border-foreground/20 pt-5">
                  <span className="font-mono text-xs text-foreground/70">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-balance">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-14 max-w-3xl rounded-xl border border-foreground/10 p-6 sm:p-8">
              <h3 className="text-lg font-semibold tracking-tight">{content.process.code.title}</h3>
              <p className="mt-2 leading-relaxed text-foreground/80">{content.process.code.body}</p>
            </div>
          </div>
        </section>

        {projects.length > 0 && (
          <section aria-labelledby="landing-cases" className={`${SECTION} border-t border-foreground/10`}>
            <div className={INNER}>
              <SectionEyebrow>{content.cases.eyebrow}</SectionEyebrow>
              <h2 id="landing-cases" className={H2}>
                {content.cases.title}
              </h2>
              <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
                {projects.map((project) => (
                  <CaseCard key={project.slug} project={project} content={content} />
                ))}
              </div>
            </div>
          </section>
        )}

        {testimonials.length > 0 && (
          <section aria-labelledby="landing-testimonials" className={`${SECTION} border-t border-foreground/10 bg-foreground/[0.03]`}>
            <div className={INNER}>
              <SectionEyebrow>{content.testimonials.eyebrow}</SectionEyebrow>
              <h2 id="landing-testimonials" className={H2}>
                {content.testimonials.title}
              </h2>
              <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
                {testimonials.map((testimonial) => (
                  <figure key={testimonial.company} className="border-l border-foreground/20 pl-6">
                    <blockquote className="leading-relaxed text-foreground/90">{testimonial.quote}</blockquote>
                    <figcaption className="mt-5 text-sm">
                      <span className="font-semibold">{testimonial.name}</span>
                      <span className="text-foreground/70">
                        {" "}
                        · {testimonial.role}, {testimonial.company}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {team.length > 0 && (
          <section aria-labelledby="landing-team" className={SECTION}>
            <div className={`${INNER} grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-16`}>
              <div>
                <SectionEyebrow>{content.team.eyebrow}</SectionEyebrow>
                <h2 id="landing-team" className={H2}>
                  {content.team.title}
                </h2>
                <p className="mt-4 max-w-lg leading-relaxed text-foreground/80">{content.team.body}</p>
              </div>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {team.map((member) => (
                  <TeamCard key={member.slug} member={member} />
                ))}
              </ul>
            </div>
          </section>
        )}

        <section aria-labelledby="landing-faq" className={`${SECTION} border-t border-foreground/10`}>
          <div className={`${INNER} grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16`}>
            <div>
              <SectionEyebrow>{content.faq.eyebrow}</SectionEyebrow>
              <h2 id="landing-faq" className={H2}>
                {content.faq.title}
              </h2>
            </div>
            <div className="border-t border-foreground/10">
              {content.faq.items.map((item) => (
                <details key={item.question} className="group border-b border-foreground/10">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <Plus
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-foreground/70 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="animate-faq-in pb-6 pr-8 leading-relaxed text-foreground/80">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="landing-closing" className={`${SECTION} border-t border-foreground/10 bg-foreground/[0.03]`}>
          <div className={`${INNER} flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between`}>
            <div className="max-w-xl">
              <h2 id="landing-closing" className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
                {content.closing.title}
              </h2>
              <p className="mt-3 text-foreground/80">{content.closing.body}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button href="#formulario" variant="accent" size="lg">
                {content.closing.cta}
              </Button>
              <LandingWhatsappLink href={whatsappLink}>{content.header.whatsappCta}</LandingWhatsappLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 px-6 py-8 text-xs leading-relaxed text-foreground/70">
        <div className={`${INNER} flex flex-col gap-2`}>
          <p className="max-w-2xl">{content.footer.responsible}</p>
          <p>
            © {new Date().getFullYear()} {siteName}.{" "}
            <a
              href="/politica-privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:text-accent-text"
            >
              {content.footer.privacy}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
