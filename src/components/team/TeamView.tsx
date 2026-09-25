"use client";

import Image from "next/image";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getTeamContent } from "@/content/team";
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

export function TeamView({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const teamData = getTeamContent(locale);
  const servicePageData = getServicePageContent(locale);
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <div className="mx-auto max-w-6xl">

        {/* Encabezado + Breadcrumb */}
        <div className="flex max-w-2xl flex-col items-start gap-4 text-left">
          <nav aria-label={servicePageData.breadcrumbAria}>
            <ol className="flex items-center gap-2 text-sm text-foreground/60">
              <li>
                <Link
                  href={homePath}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {navData.inicio}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground">{teamData.title}</li>
            </ol>
          </nav>

          <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
            {teamData.title}
          </h1>
          <p className="max-w-2xl text-lg text-foreground/80">
            {teamData.description}
          </p>
        </div>

        {/* Grid de perfiles del equipo */}
        <motion.div
          variants={staggerContainer(reduced, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {teamData.members.map((member, index) => (
            <motion.div
              key={member.slug}
              id={member.slug}
              variants={fadeUp(reduced)}
              className="h-full scroll-mt-24"
            >
              {/* El id ancla es el destino del JSON-LD `Person.url` del
                  autor de cada post del blog (ver lib/blogMetadata.ts::authorUrl). */}
              <SpotlightCard className="h-full">
                <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-foreground/10 bg-background transition-all duration-500 hover:border-accent/25 hover:shadow-[0_20px_60px_rgba(0,137,205,0.1)]">

                  {/* Foto del miembro — gran formato */}
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
                    {member.photo ? (
                      <>
                        <Image
                          src={member.photo}
                          alt={member.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                          priority={index === 0}
                        />
                        {/* Gradiente sobre la foto — del fondo opaco hacia transparente */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/5 to-transparent"
                        />
                        {/* Glow de acento en hover */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-accent/8 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        />
                      </>
                    ) : (
                      /* Placeholder para miembro sin foto */
                      <div className="flex h-full w-full items-end bg-gradient-to-br from-foreground/5 via-accent/[0.06] to-accent/[0.12]">
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 flex items-center justify-center font-heading text-[6rem] font-bold tracking-tighter text-accent/10 select-none"
                        >
                          {initials(member.name)}
                        </span>
                        {/* Gradiente inferior igual que con foto */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/5 to-transparent"
                        />
                      </div>
                    )}

                    {/* Badge de rol — esquina superior derecha */}
                    <span className="absolute right-3 top-3 rounded-full border border-foreground/10 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground/60 backdrop-blur-sm transition-all duration-300 group-hover:border-accent/30 group-hover:text-accent/90">
                      {member.role}
                    </span>
                  </div>

                  {/* Info del miembro — debajo de la foto */}
                  <div className="flex flex-col gap-2 px-5 pb-6 pt-4">
                    {/* Nombre */}
                    <h2 className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent">
                      {member.name}
                    </h2>

                    {/* Separador animado */}
                    <div
                      aria-hidden="true"
                      className="h-px w-8 rounded-full bg-foreground/10 transition-all duration-500 group-hover:w-12 group-hover:bg-accent/40"
                    />

                    {/* Descripción */}
                    <p className="text-sm leading-relaxed text-foreground/65">
                      {member.description}
                    </p>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16"
        >
          <Button href={`${prefix}/#contacto`} variant="accent" size="lg">
            {teamData.ctaLabel}
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
