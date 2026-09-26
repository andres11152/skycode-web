import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/auth/ResetPasswordView";
// globals.css excluye `components/auth`/`app/resetear-password` de su
// escaneo de Tailwind (ver el comentario ahí) — este import trae de vuelta
// esas utilidades solo para esta página.
import "../../dashboard.css";

export const metadata: Metadata = {
  title: "Nueva Contraseña | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params;
  return <ResetPasswordView token={token} />;
}
