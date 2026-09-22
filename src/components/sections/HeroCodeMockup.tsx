"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n";

function CodeMockupSkeleton() {
  return (
    <div className="w-full max-w-md select-none" aria-hidden="true">
      <div className="w-full overflow-hidden rounded-xl bg-foreground border border-background/10 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-background/10 px-3 py-2 sm:px-4 sm:py-2.5 bg-background/20">
          <div className="flex gap-1 sm:gap-1.5">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
          </div>
          <span className="font-mono text-[10px] sm:text-xs text-background/40">
            api/orders/route.ts
          </span>
        </div>
        <div className="p-3 sm:p-4 space-y-2">
          {[60, 45, 70, 30, 55, 40, 65, 35].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded bg-background/10"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const CodeMockup = dynamic(
  () => import("./CodeMockupClient").then((m) => ({ default: m.CodeMockup })),
  {
    ssr: false,
    loading: () => <CodeMockupSkeleton />,
  }
);

export function HeroCodeMockup({ locale }: { locale: Locale }) {
  return <CodeMockup locale={locale} />;
}
