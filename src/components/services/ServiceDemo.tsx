"use client";

import {
  CodeConsoleWidget,
  MobileAppPreviewWidget,
  ApiInspectorWidget,
  PerformanceMeterWidget,
  EcommerceCheckoutWidget,
  SecurityComplianceWidget,
  ArchitectureDocWidget,
  LegacyMigrationWidget,
  AiAppliedWidget,
} from "@/components/services/BentoServiceWidgets";
import type { Locale } from "@/lib/i18n";

/**
 * Demo interactiva de un servicio, resuelta por slug en un solo lugar (antes
 * el mismo `switch` de 9 líneas estaba copiado en el índice y en el
 * detalle). Es la isla cliente de las páginas de servicios: el resto de la
 * vista es Server Component.
 */
export default function ServiceDemo({ slug, locale }: { slug: string; locale: Locale }) {
  switch (slug) {
    case "desarrollo-software-medida":
      return <CodeConsoleWidget locale={locale} />;
    case "desarrollo-aplicaciones-moviles":
      return <MobileAppPreviewWidget locale={locale} />;
    case "apis-integraciones":
      return <ApiInspectorWidget locale={locale} />;
    case "frontend-alto-rendimiento":
      return <PerformanceMeterWidget locale={locale} />;
    case "ecommerce-tienda-online":
      return <EcommerceCheckoutWidget />;
    case "seguridad-cumplimiento":
      return <SecurityComplianceWidget locale={locale} />;
    case "arquitectura-documentacion":
      return <ArchitectureDocWidget />;
    case "migracion-datos-legacy":
      return <LegacyMigrationWidget locale={locale} />;
    case "inteligencia-artificial-aplicada":
      return <AiAppliedWidget locale={locale} />;
    default:
      return null;
  }
}
