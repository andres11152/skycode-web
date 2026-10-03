import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/auth/ForgotPasswordView";
// globals.css excluye `components/auth`/`app/olvide-password` de su escaneo
// de Tailwind (ver el comentario ahí) — este import trae de vuelta esas
// utilidades solo para esta página.
import "../dashboard.css";

export const metadata: Metadata = {
  title: "Restablecer Contraseña | SKYCODE Agency",
  robots: { index: false, follow: false },
};

// Dinámica a propósito: el nonce de la CSP estricta (ver src/lib/csp.ts) solo
// se puede aplicar al renderizar POR REQUEST; una página generada en el build
// no tendría nonce y sus scripts quedarían bloqueados.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
