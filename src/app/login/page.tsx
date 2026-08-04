import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";

export const metadata: Metadata = {
  title: "Iniciar Sesión | SKYCODE Agency",
  description: "Acceso seguro a la plataforma de administración de SKYCODE Agency.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginView />;
}
