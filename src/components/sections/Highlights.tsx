import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { RevealText } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getHighlightsContent } from "@/content/highlights";
import { getUiContent } from "@/content/ui";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { BrandPeriod } from "@/components/ui/BrandPeriod";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";
import {
  FlutterIcon,
  JavaScriptIcon,
  LaravelIcon,
  MongoDBIcon,
  NestJsIcon,
  NextJsIcon,
  PhpIcon,
  PostgreSQLIcon,
  ReactIcon,
  TailwindCSSIcon,
  TypeScriptIcon,
  WordPressIcon,
} from "@/components/icons/TechIcons";

const techStack = [
  { name: "TypeScript", Icon: TypeScriptIcon },
  { name: "JavaScript", Icon: JavaScriptIcon },
  { name: "Next.js", Icon: NextJsIcon },
  { name: "React", Icon: ReactIcon },
  // React Native usa oficialmente el mismo logo átomo de React (no existe un ícono "reactnative" aparte).
  { name: "React Native", Icon: ReactIcon },
  { name: "Flutter", Icon: FlutterIcon },
  { name: "Node.js / NestJS", Icon: NestJsIcon },
  { name: "Laravel", Icon: LaravelIcon },
  { name: "PHP", Icon: PhpIcon },
  { name: "WordPress", Icon: WordPressIcon },
  { name: "Tailwind CSS", Icon: TailwindCSSIcon },
  { name: "PostgreSQL", Icon: PostgreSQLIcon },
  { name: "MongoDB", Icon: MongoDBIcon },
];

/**
 * "Por qué SkyCode": tres argumentos en columnas numeradas (sin ícono dentro de
 * un cuadro encima de cada título — el patrón más reconocible de plantilla) y
 * una sola franja de tecnologías en monocromo, sin cajas ni tooltips. Server
 * Component: nada aquí necesita JS. Se quitó el video de muestra: enseñaba una
 * aplicación de tareas genérica que no es un producto nuestro, y pesaba 2,3 MB.
 *
 * Móvil: los tres argumentos son tarjetas deslizables (`SwipeRail`) con la cifra grande, y las
 * tecnologías un carril de dos filas: antes ocupaban ~4 pantallas de texto apilado.
 */
export function Highlights({ locale = defaultLocale }: { locale?: Locale }) {
  const data = getHighlightsContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  const rail = getUiContent(locale).rail;

  return (
    <section id="por-que" aria-label={data.sectionAria} className="cv-auto [--cv-h:1390px] lg:[--cv-h:1080px] scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <SectionEyebrow className="reveal-up mb-4">{data.badge}</SectionEyebrow>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
            <RevealText text={data.title} />
          </h2>
          <p style={{ "--i": 3 } as CSSProperties} className="reveal-up mt-5 text-lg leading-relaxed text-foreground/80">{data.description}</p>
        </div>

        <div className="mt-12 sm:mt-16">
          <SwipeRail
            as="ol"
            label={data.title}
            labels={rail}
            className="sm:grid sm:grid-cols-3 sm:gap-8"
            itemClassName="max-sm:flex"
            items={data.items.map((item, index) => (
              <div
                key={item.title}
                style={{ "--i": index } as CSSProperties}
                className="scroll-reveal relative w-full border-t border-foreground/20 pt-6 max-sm:rounded-xl max-sm:border max-sm:border-foreground/10 max-sm:bg-surface-raised/80 max-sm:p-6 max-sm:shadow-lg max-sm:shadow-black/5 max-sm:backdrop-blur"
              >
                {/* Filete que se dibuja con el scroll sobre el filete tenue de base (solo escritorio). */}
                <span aria-hidden="true" className="scroll-progress-x absolute -top-px left-0 h-px w-full bg-foreground motion-reduce:hidden max-sm:hidden" />
                <span className="font-mono text-sm text-foreground/70 max-sm:flex max-sm:items-end max-sm:text-5xl max-sm:leading-none max-sm:font-semibold max-sm:tracking-[-0.04em] max-sm:text-foreground">
                  {String(index + 1).padStart(2, "0")}
                  <BrandPeriod className="sm:hidden" />
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance text-foreground max-sm:mt-6">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground/80">{item.description}</p>
              </div>
            ))}
          />
        </div>

        <div className="mt-20 border-t border-foreground/10 pt-10">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">{data.techLabel}</p>
          {/* Móvil: carril horizontal de dos filas (antes 7 filas de logos apiladas). */}
          <ul className="mt-6 flex flex-wrap gap-x-9 gap-y-5 max-sm:-mx-6 max-sm:grid max-sm:auto-cols-max max-sm:grid-flow-col max-sm:grid-rows-2 max-sm:gap-x-7 max-sm:gap-y-4 max-sm:overflow-x-auto max-sm:px-6 max-sm:pb-1 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
            {techStack.map(({ name, Icon }, index) => (
              <li
                key={name}
                style={{ "--i": index % 6 } as CSSProperties}
                className="reveal-scale flex items-center gap-2.5 text-sm font-medium text-foreground/80 transition-[transform,color] duration-200 ease-[var(--ease-out)] hover:text-foreground motion-safe:hover:-translate-y-0.5"
              >
                <Icon className="h-5 w-5 text-foreground/70" aria-hidden="true" />
                {name}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <Button href={`${prefix}/equipo`} variant="secondary" size="md">
            {data.teamCta}
          </Button>
        </div>
      </div>
    </section>
  );
}
