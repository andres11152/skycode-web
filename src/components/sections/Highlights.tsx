import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { RevealText } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getHighlightsContent } from "@/content/highlights";
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
 */
export function Highlights({ locale = defaultLocale }: { locale?: Locale }) {
  const data = getHighlightsContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <section id="por-que" aria-label={data.sectionAria} className="scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <SectionEyebrow className="reveal-blur mb-4">{data.badge}</SectionEyebrow>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
            <RevealText text={data.title} />
          </h2>
          <p style={{ "--i": 3 } as CSSProperties} className="reveal-blur mt-5 text-lg leading-relaxed text-foreground/80">{data.description}</p>
        </div>

        <ol className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {data.items.map((item, index) => (
            <li key={item.title} style={{ "--i": index } as CSSProperties} className="scroll-reveal relative border-t border-foreground/20 pt-6">
              {/* Filete que se dibuja con el scroll sobre el filete tenue de base. */}
              <span aria-hidden="true" className="scroll-progress-x absolute -top-px left-0 h-px w-full bg-foreground motion-reduce:hidden" />
              <span className="font-mono text-sm text-foreground/70">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance text-foreground">{item.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-foreground/80">{item.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20 border-t border-foreground/10 pt-10">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">{data.techLabel}</p>
          <ul className="mt-6 flex flex-wrap gap-x-9 gap-y-5">
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
