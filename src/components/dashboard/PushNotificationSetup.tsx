"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { logError } from "@/lib/logger";

type Status = "checking" | "unsupported" | "not-configured" | "subscribed" | "not-subscribed" | "denied";

/** Formato que exige `PushManager.subscribe({ applicationServerKey })` — la clave VAPID viaja en base64url, no en el binario crudo que la Push API necesita. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Autogestión pura (como 2FA o revocar sesiones propias) — sin permiso
 * RBAC, cualquier sesión activa notificaciones push para sí misma desde
 * /dashboard/cuenta. Complementa (no reemplaza) las notificaciones in-app
 * y por correo ya existentes — ver `sendPushToUser()` en lib/webPush.ts,
 * llamado desde el mismo `createNotification()` que ya alimenta esos dos
 * canales.
 *
 * Se auto-oculta (`return null`) si `NEXT_PUBLIC_VAPID_PUBLIC_KEY` no está
 * configurada en este deploy — mismo criterio que otras integraciones
 * opcionales del proyecto (Bold, Sentry): la app funciona igual sin esto.
 */
export function PushNotificationSetup() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<Status>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vapidPublicKey) return;

    let cancelled = false;

    async function checkStatus() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription ? "subscribed" : "not-subscribed");
      } catch {
        if (!cancelled) setStatus("not-subscribed");
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  if (!vapidPublicKey) return null;

  const handleEnable = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "not-subscribed");
        return;
      }

      await navigator.serviceWorker.register("/sw-push.js");
      const readyRegistration = await navigator.serviceWorker.ready;
      const subscription = await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "No se pudo activar las notificaciones push.");
        return;
      }
      setStatus("subscribed");
    } catch (err) {
      logError("Error al activar notificaciones push", err);
      setError("Ocurrió un error al activar las notificaciones push.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("not-subscribed");
    } catch (err) {
      logError("Error al desactivar notificaciones push", err);
      setError("Ocurrió un error al desactivar las notificaciones push.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <BellRing size={16} className="text-accent" />
        Notificaciones push del navegador
      </h2>
      <p className="text-xs text-foreground/60">
        Recibe un aviso del navegador para propuestas vistas, facturas vencidas, SLA por vencer y seguimientos de
        leads — sin necesidad de tener el dashboard abierto. Complementa la campanita y el correo, no los reemplaza.
      </p>

      {error && <Alert tone="error">{error}</Alert>}

      {status === "checking" && <p className="text-xs text-foreground/50">Comprobando soporte del navegador…</p>}

      {status === "unsupported" && (
        <p className="text-xs text-foreground/50">Tu navegador no soporta notificaciones push.</p>
      )}

      {status === "denied" && (
        <p className="text-xs text-amber-700">
          Bloqueaste los permisos de notificación para este sitio — actívalos desde la configuración del navegador
          para usar esta función.
        </p>
      )}

      {status === "not-subscribed" && (
        <Button variant="secondary" onClick={handleEnable} disabled={isSubmitting} className="gap-1.5">
          <Bell size={14} />
          {isSubmitting ? "Activando…" : "Activar notificaciones push"}
        </Button>
      )}

      {status === "subscribed" && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-green-700">Activas en este navegador.</span>
          <Button variant="secondary" onClick={handleDisable} disabled={isSubmitting} className="gap-1.5">
            <BellOff size={14} />
            {isSubmitting ? "Desactivando…" : "Desactivar"}
          </Button>
        </div>
      )}
    </div>
  );
}
