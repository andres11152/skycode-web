import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getArticleById } from "@/lib/queries/articles";
import { ArticleEditor } from "@/components/dashboard/ArticleEditor";

export const metadata: Metadata = {
  title: "Editar artículo | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseArticleId(id: string): number | null {
  const articleId = Number(id);
  return Number.isInteger(articleId) && articleId > 0 ? articleId : null;
}

export default async function DashboardContentEditPage({ params }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "content:read")) redirect("/dashboard");

  const articleId = parseArticleId((await params).id);
  if (articleId === null) notFound();

  const article = await getArticleById(articleId);
  if (!article) notFound();

  const canWrite = hasPermission(session.role, "content:write");

  return <ArticleEditor article={article} canWrite={canWrite} />;
}
