import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUserCredentials } from "@/lib/authService";
import {
  guardAuthRequest,
  isPairBlocked,
  loginMinDurationMs,
  pairBlockedResponse,
  recordAuthFailure,
  recordAuthSuccess,
  verifyHumanChallenge,
  withMinimumDuration,
} from "@/lib/authShield";
import { setSessionCookie } from "@/lib/sessionCookie";
import { logError } from "@/lib/logger";

// Correo normalizado ANTES de usarlo como clave de los contadores de fallos:
// `Admin@X.com` y `admin@x.com` son la misma cuenta y no deben contar aparte.
// `z.email()` ya rechaza caracteres de control (incl. NUL, que Postgres no
// acepta en un parámetro de texto y convertiría en un 500).
const LoginSchema = z.object({
  email: z.string().max(254).trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

const INVALID_CREDENTIALS = { error: "Credenciales de acceso no válidas." };

export async function POST(request: Request) {
  try {
    const guard = await guardAuthRequest(request, "login");
    if (!guard.ok) return guard.response;
    const { ip, body } = guard;

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo electrónico y contraseña son requeridos." }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const gate = await verifyHumanChallenge({ surface: "login", ip, identifier: email, body });
    if (!gate.ok) {
      if (gate.kind === "pow") return gate.response;
      // Honeypot: respuesta indistinguible de una credencial inválida, con el
      // mismo retardo — el bot no aprende que cayó en la trampa.
      await withMinimumDuration(loginMinDurationMs(), async () => undefined);
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    // Bloqueo duro SOLO del par correo+IP (no de la cuenta): quien ataca una
    // cuenta desde muchas IPs solo sube el costo del proof-of-work, y la
    // persona legítima desde su propia IP nunca queda fuera por culpa ajena.
    if (await isPairBlocked(email, ip)) return pairBlockedResponse();

    const authResult = await withMinimumDuration(loginMinDurationMs(), () =>
      authenticateUserCredentials({ email, password, ip, userAgent: request.headers.get("user-agent") }),
    );

    if (authResult.status === "invalid") {
      await recordAuthFailure({ surface: "login", ip, identifier: email });
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    await recordAuthSuccess({ surface: "login", ip, identifier: email });

    // Contraseña correcta, pero falta el segundo factor — no se setea
    // ninguna cookie de sesión todavía. El frontend (LoginView.tsx) guarda
    // `pendingToken` en memoria y lo manda de vuelta a
    // POST /api/auth/login/verify-2fa junto con el código de 6 dígitos.
    if (authResult.status === "needs_2fa") {
      return NextResponse.json({ success: true, needsTwoFactor: true, pendingToken: authResult.pendingToken });
    }

    const response = NextResponse.json({ success: true, user: authResult.user });
    setSessionCookie(response, authResult.token);
    return response;
  } catch (error) {
    logError("❌ [API Login Error]", error);
    return NextResponse.json({ error: "Error de servidor al procesar la autenticación." }, { status: 500 });
  }
}
