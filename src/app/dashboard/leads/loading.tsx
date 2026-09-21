import { SkeletonTableView } from "@/components/dashboard/ui/Skeleton";

export default function Loading() {
  return <SkeletonTableView rows={8} columns={5} />;
}
