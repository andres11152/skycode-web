import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getArticlesPage } from "@/lib/queries/articles";
import { ContentBoard } from "@/components/dashboard/ContentBoard";

export const metadata: Metadata = {
  title: "Contenido | SKYCODE Agency",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ status?: string; locale?: string; q?: string; page?: string }>;
}

export default async function DashboardContentPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "content:read")) redirect("/dashboard");

  const sp = await searchParams;
  const status = (sp.status || "ALL") as "draft" | "review" | "published" | "ALL";
  const locale = (sp.locale || "ALL") as "es" | "en" | "fr" | "ALL";
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const { articles, total } = await getArticlesPage({ status, locale, q, page, pageSize: PAGE_SIZE });
  const canWrite = hasPermission(session.role, "content:write");

  return (
    <ContentBoard
      articles={articles}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      status={status}
      locale={locale}
      q={q}
      canWrite={canWrite}
    />
  );
}
