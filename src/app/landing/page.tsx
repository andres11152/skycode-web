import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingMetadata } from "@/content/landing";

// Landing dedicada a tráfico de Google Ads (búsqueda, Colombia). Separada de la home a propósito: sin
// Navbar/Footer ni enlaces de salida que compitan con el formulario (ver ConditionalLayout.tsx,
// isCampaignLanding). Esta es la variante general; `/landing/precio` y `/landing/integraciones` comparten
// el mismo esqueleto con otra promesa, para que el titular de cada grupo de anuncios coincida con lo que
// la persona buscó. El envío va a /api/contact y termina en /gracias (conversión de Google Ads).
export const metadata = getLandingMetadata("general");

// Casos y equipo salen de Postgres: se regenera cada hora y al publicar un caso o editar un perfil.
export const revalidate = 3600;

export default function LandingRoute() {
  return <LandingPage variant="general" />;
}
