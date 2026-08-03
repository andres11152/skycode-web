import { HomeSections } from "@/components/HomeSections";
import { FaqJsonLd } from "@/components/FaqJsonLd";

export default function Home() {
  return (
    <>
      <FaqJsonLd locale="es" />
      <HomeSections locale="es" />
    </>
  );
}
