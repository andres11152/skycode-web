import { SkeletonTableView } from "@/components/dashboard/ui/Skeleton";

export default function Loading() {
  return <SkeletonTableView rows={6} columns={5} />;
}
