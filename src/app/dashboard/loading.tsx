import { SkeletonModuleView } from "@/components/dashboard/ui/Skeleton";

// Red de seguridad de TODO /dashboard: las rutas sin `loading.tsx` propio caen aquí.
export default function Loading() {
  return <SkeletonModuleView />;
}
