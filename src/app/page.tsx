import { HomeSections } from "@/components/HomeSections";
import { FaqJsonLd } from "@/components/FaqJsonLd";

// La home lee blog y portafolio de Postgres: sin esto quedaba estática
// hasta el siguiente deploy.
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <FaqJsonLd locale="es" />
      <HomeSections locale="es" />
    </>
  );
}
