import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifySessionToken } from "@/lib/session";
import { getActiveUserSessions } from "@/lib/queries/sessions";
import { getTotpStatus } from "@/lib/queries/totp";
import { getUserProfile } from "@/lib/queries/userProfile";
import { getTimezones } from "@/lib/profileValidation";
import { ProfileCard } from "./ProfileCard";
import { ChangePasswordCard } from "./ChangePasswordCard";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { PushNotificationSetup } from "./PushNotificationSetup";
import { SessionsView } from "./SessionsView";

/**
 * Pantalla de cuenta compartida por `/dashboard/cuenta` (equipo interno) y
 * `/portal/cuenta` (clientes). Server Component: carga todo en paralelo y
 * le pasa a cada tarjeta solo lo suyo.
 *
 * Antes de esto un cliente de portal no tenía ninguna pantalla de cuenta —
 * ni podía activar 2FA ni ver/revocar sus sesiones. Ninguna de estas
 * tarjetas depende de RBAC (todas actúan sobre la sesión propia), así que
 * se reutilizan tal cual en los dos árboles.
 *
 * `audience` ajusta el copy del perfil y decide si va la tarjeta de push:
 * las notificaciones push del navegador siguen siendo solo
 * para el equipo interno (mismo alcance deliberado que tenían), porque los
 * avisos que las disparan — SLA, facturas vencidas, seguimientos — son de
 * operación interna; un cliente no tiene eventos equivalentes todavía.
 */
export async function AccountView({ userId, audience }: { userId: number | string; audience: "team" | "client" }) {
  const includePush = audience === "team";
  // La sesión "actual" (para marcarla en la lista y preservarla al cambiar
  // la contraseña) se identifica por su sessionId, que
  // `requireSessionOrRedirect()` no expone — se relee la cookie acá.
  const cookieStore = await cookies();
  const token = cookieStore.get("skycode_session")?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const currentSessionId = payload?.sessionId ?? null;

  const [profile, sessions, totpStatus] = await Promise.all([
    getUserProfile(userId),
    getActiveUserSessions(userId),
    getTotpStatus(userId),
  ]);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Cuenta</h1>
        <p className="mt-1 text-xs text-foreground/70">Tu perfil, la seguridad de tu acceso y los dispositivos conectados.</p>
      </div>

      <ProfileCard initialProfile={profile} timezones={getTimezones()} audience={audience} />

      <section aria-labelledby="security-title" className="space-y-3">
        <div>
          <h2 id="security-title" className="text-sm font-bold text-foreground">
            Seguridad
          </h2>
          <p className="mt-0.5 text-xs text-foreground/70">Cómo se protege el acceso a tu cuenta.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <ChangePasswordCard />
          <TwoFactorSetup initialEnabled={totpStatus.enabled} initialRemainingBackupCodes={totpStatus.remainingBackupCodes} />
        </div>
      </section>

      {includePush && <PushNotificationSetup />}

      <SessionsView sessions={sessions} currentSessionId={currentSessionId} />
    </div>
  );
}
