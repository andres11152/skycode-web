import { BogotaJsonLd } from "@/components/bogota/BogotaJsonLd";
import { BogotaView } from "@/components/bogota/BogotaView";

/** Server Component de `/desarrollo-software-bogota` (solo español). */
export function BogotaPage() {
  return (
    <>
      <BogotaJsonLd />
      <BogotaView />
    </>
  );
}
