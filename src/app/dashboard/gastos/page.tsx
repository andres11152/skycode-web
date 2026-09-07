import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getExpensesPage } from "@/lib/queries/expenses";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { ExpensesBoard } from "@/components/dashboard/ExpensesBoard";

export const metadata: Metadata = {
  title: "Gastos | SKYCODE Agency",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

export default async function DashboardExpensesPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "expenses:read")) redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const category = sp.category || "ALL";
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ expenses, total, totalThisMonthCop }, projects] = await Promise.all([
    getExpensesPage({ q, category, page, pageSize: PAGE_SIZE }),
    getAllActiveProjects(),
  ]);
  const canWrite = hasPermission(session.role, "expenses:write");

  return (
    <ExpensesBoard
      expenses={expenses}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      q={q}
      category={category}
      totalThisMonthCop={totalThisMonthCop}
      projects={projects.map((p) => ({ id: p.id, title: p.title, client: p.client }))}
      canWrite={canWrite}
    />
  );
}
