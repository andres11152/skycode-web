"use client";

import Image from "next/image";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  Brain,
  Cloud,
  GithubLogo,
  LinkedinLogo,
  PenNib,
  Plugs,
  ShieldCheck,
  TestTube,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { GridPattern } from "@/components/ui/GridPattern";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getTeamSectionContent } from "@/content/team";
import type { PublicTeamMember } from "@/content/teamShared";
import { getServicePageContent } from "@/content/servicePage";
import { getNavContent } from "@/content/nav";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";

/** Devuelve las iniciales de un nombre completo (máximo 2 caracteres). */
function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Mapa seguro y tipado de iconos Phosphor para la red de especialistas. */
const specialistIconMap: Record<string, PhosphorIcon> = {
  Cloud,
  TestTube,
  ShieldCheck,
  Brain,
  PenNib,
  Plugs,
};

/**
 * Las personas llegan por prop desde la page (Server Component), que las
 * lee de Postgres — este componente es cliente (animaciones) y no puede
 * consultar la base él mismo. Mismo patrón que `Portfolio`/`BlogTeaser`.
 */
export function TeamView({
  locale = defaultLocale,
  members,
}: {
  locale?: Locale;
  members: PublicTeamMember[];
}) {
  const reduced = Boolean(useReducedMotion());
  const teamData = getTeamSectionContent(locale);
  const servicePageData = getServicePageContent(locale);
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <main id="main-content" className="relative overflow-hidden px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      {/* Ambient background glow & grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden [mask-image:radial-gradient(ellipse_70%_50%_at_50%_25%,#000_65%,transparent_100%)]"
      >
        <GridPattern width={48} height={48} className="stroke-foreground/[0.05]" />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Encabezado Hero Cinematográfico */}
        <section aria-labelledby="team-hero-heading" className="flex flex-col items-start text-left">
          {/* Breadcrumb */}
          <nav aria-label={servicePageData.breadcrumbAria}>
            <ol className="flex items-center gap-2 text-sm text-foreground/60">
              <li>
                <Link
                  href={homePath}
                  className="rounded outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {navData.inicio}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground">{teamData.title}</li>
            </ol>
          </nav>

          {/* Section Eyebrow */}
          <div className="mt-6">
            <SectionEyebrow>
              {teamData.heroEyebrow || teamData.sectionAria}
            </SectionEyebrow>
          </div>

          {/* H1 Dinámico en 3 líneas cortas */}
          <h1
            id="team-hero-heading"
            className="mt-4 font-heading text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
          >
            {teamData.heroTitleLines && teamData.heroTitleLines.length > 0 ? (
              teamData.heroTitleLines.map((line, idx) => (
                <span
                  key={idx}
                  className="block animate-hero-fade-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {line}
                </span>
              ))
            ) : (
              <span className="block animate-hero-fade-up">{teamData.title}</span>
            )}
          </h1>

          {/* Descripción */}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80 sm:text-xl">
            {teamData.description}
          </p>

          {/* Mini-barra de estadísticas de escala e impacto */}
          {teamData.stats && teamData.stats.length > 0 && (
            <motion.div
              variants={fadeUp(reduced)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-12 w-full border-t border-foreground/10 pt-8"
            >
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
                {teamData.stats.map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                      {stat.value}
                    </span>
                    <span className="mt-1 text-xs font-medium text-foreground/70 sm:text-sm">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </section>

        {/* Grid cinematográfico de perfiles del equipo (3 columnas para 3 directores/líderes) */}
        <motion.div
          variants={staggerContainer(reduced, 0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {members.map((member, index) => (
            <motion.div
              key={member.slug}
              id={member.slug}
              variants={fadeUp(reduced)}
              className="h-auto sm:h-full scroll-mt-24"
            >
              {/* El id ancla es el destino del JSON-LD `Person.url` del
                  autor de cada post del blog (ver lib/blogMetadata.ts::authorUrl). */}
              <SpotlightCard className="h-auto sm:h-full">
                <div className="group relative flex h-auto sm:h-full sm:min-h-[500px] sm:aspect-[3/4] flex-col overflow-hidden rounded-xl border border-foreground/10 bg-background transition duration-500 hover:border-accent/35 hover:shadow-[0_24px_64px_rgba(0,137,205,0.12)]">

                  {/* Foto del miembro: compacta en mobile adaptándose al contenido, full-bleed en desktop */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden sm:absolute sm:inset-0 sm:h-full sm:w-full sm:aspect-auto">
                    {member.photo ? (
                      <>
                        <Image
                          src={member.photo}
                          alt={member.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover object-top filter grayscale-[25%] contrast-[1.04] transition duration-700 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                          priority={index === 0}
                        />
                        {/* Gradiente sutil superior para contraste del badge */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/15 to-transparent"
                        />
                        {/* Gradiente inferior suave en mobile para fundir con la información */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/70 to-transparent sm:hidden"
                        />
                        {/* Gradiente cinematográfico en desktop para legibilidad del texto sobre imagen */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none hidden sm:block absolute inset-0 bg-gradient-to-t from-background via-background/70 via-50% to-transparent"
                        />
                        {/* Glow de acento en hover */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-accent/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        />
                      </>
                    ) : (
                      /* Placeholder para miembro sin foto */
                      <div className="relative flex h-full w-full items-end bg-gradient-to-br from-foreground/5 via-accent/[0.06] to-accent/[0.12]">
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 flex items-center justify-center font-heading text-[5rem] sm:text-[7rem] font-bold tracking-tighter text-accent/15 select-none"
                        >
                          {initials(member.name)}
                        </span>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none hidden sm:block absolute inset-0 bg-gradient-to-t from-background via-background/70 via-50% to-transparent"
                        />
                      </div>
                    )}

                    {/* Badge de rol — esquina superior derecha */}
                    <span className="absolute top-3.5 right-3.5 z-10 rounded-full border border-foreground/15 bg-background/85 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground/80 backdrop-blur-md transition duration-300 group-hover:border-accent/40 group-hover:text-accent">
                      {member.role}
                    </span>
                  </div>

                  {/* Información del miembro: flujo natural adaptativo en mobile, overlay en desktop */}
                  <div className="relative z-10 flex flex-1 flex-col justify-between p-5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-6 sm:pt-10 sm:justify-end">
                    <div>
                      {/* Nombre */}
                      <h2 className="font-heading text-xl font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent sm:text-2xl">
                        {member.name}
                      </h2>

                      {/* Separador animado */}
                      <div
                        aria-hidden="true"
                        className="mt-2.5 h-0.5 w-8 origin-left rounded-full bg-accent/40 transition-[transform,background-color] duration-500 group-hover:scale-x-[1.75] group-hover:bg-accent motion-reduce:transition-none"
                      />

                      {/* Descripción / Bio */}
                      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                        {member.description}
                      </p>
                    </div>

                    {/* Links sociales */}
                    {(member.linkedinUrl || member.githubUrl) && (
                      <div className="mt-4 flex items-center gap-2 pt-1">
                        {member.linkedinUrl && (
                          <a
                            href={member.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`LinkedIn de ${member.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-foreground/75 backdrop-blur-sm transition-[border-color,color,transform,background-color] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-accent/35 hover:bg-background hover:text-accent motion-reduce:hover:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <LinkedinLogo size={18} />
                          </a>
                        )}
                        {member.githubUrl && (
                          <a
                            href={member.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`GitHub de ${member.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-foreground/75 backdrop-blur-sm transition-[border-color,color,transform,background-color] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-accent/35 hover:bg-background hover:text-accent motion-reduce:hover:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <GithubLogo size={18} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Sección: Red de Especialistas (Grid 3x2 con Iconos Phosphor e identidad de infraestructura) */}
        {teamData.networkTitle && (
          <motion.section
            aria-labelledby="specialist-network-title"
            variants={fadeUp(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-24 rounded-xl border border-foreground/10 bg-foreground/[0.015] p-8 sm:p-12 lg:p-14"
          >
            <div className="flex flex-col gap-3">
              <SectionEyebrow>{teamData.networkTitle}</SectionEyebrow>
              <h2
                id="specialist-network-title"
                className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                Capacidad técnica sin fricción operativa
              </h2>
              {teamData.networkDescription && (
                <p className="max-w-3xl text-sm leading-relaxed text-foreground/75 sm:text-base">
                  {teamData.networkDescription}
                </p>
              )}
            </div>

            {teamData.networkItems && teamData.networkItems.length > 0 && (
              <motion.div
                variants={staggerContainer(reduced, 0.08)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {teamData.networkItems.map((item, idx) => {
                  const IconComp = specialistIconMap[item.iconName] || ShieldCheck;
                  return (
                    <motion.div
                      key={idx}
                      variants={fadeUp(reduced)}
                      className="group flex flex-col rounded-xl border border-foreground/10 bg-background p-5 transition duration-300 hover:border-accent/35 hover:bg-accent/[0.02] hover:shadow-sm"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2">
                        <IconComp size={22} weight="duotone" />
                      </div>
                      <h3 className="mt-4 font-heading text-base font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent">
                        {item.label}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-foreground/70 sm:text-sm">
                        {item.description}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Sección: Bloque de Cierre y Llamado a la Acción Contextualizado */}
        <motion.section
          aria-labelledby="team-closing-title"
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-24 sm:mt-32 rounded-xl border border-foreground/10 bg-gradient-to-b from-foreground/[0.02] via-accent/[0.02] to-accent/[0.05] p-8 sm:p-14 text-center"
        >
          <div className="mx-auto max-w-2xl">
            <h2
              id="team-closing-title"
              className="font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl"
            >
              {teamData.closingTitle || teamData.ctaLabel}
            </h2>
            {teamData.closingDescription && (
              <p className="mt-4 text-base leading-relaxed text-foreground/75 sm:text-lg">
                {teamData.closingDescription}
              </p>
            )}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href={`${prefix}/#contacto`} variant="accent" size="lg">
                {teamData.ctaLabel}
              </Button>
              {teamData.ctaSecondary && (
                <Button
                  href={
                    teamData.ctaSecondary.href.startsWith("/") && prefix
                      ? `${prefix}${teamData.ctaSecondary.href}`
                      : teamData.ctaSecondary.href
                  }
                  variant="secondary"
                  size="lg"
                >
                  {teamData.ctaSecondary.label}
                </Button>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
