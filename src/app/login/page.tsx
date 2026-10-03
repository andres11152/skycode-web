import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";
// globals.css excluye `components/auth`/`app/login` de su escaneo de
// Tailwind (ver el comentario ahí) — este import trae de vuelta esas
// utilidades solo para esta página.
import "../dashboard.css";

export const metadata: Metadata = {
  title: "Iniciar Sesión | SKYCODE Agency",
  description: "Acceso seguro a la plataforma de administración de SKYCODE Agency.",
  robots: {
    index: false,
    follow: false,
  },
};

// Dinámica a propósito: el nonce de la CSP estricta (ver src/lib/csp.ts) solo
// se puede aplicar al renderizar POR REQUEST; una página generada en el build
// no tendría nonce y sus scripts quedarían bloqueados.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginView />;
}
