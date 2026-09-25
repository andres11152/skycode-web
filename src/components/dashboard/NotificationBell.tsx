"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/logger";
import type { AppNotification } from "./types";

const POLL_INTERVAL_MS = 60_000;

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

/**
 * Campanita de notificaciones in-app del dashboard — mismo evento que ya
 * dispara un correo desde lib/queries/notifications.ts (propuesta vista,
 * factura vencida, SLA por vencer, seguimiento de lead), solo que este
 * canal no depende de que alguien revise su bandeja de entrada. Sondeo
 * cada 60s en vez de WebSocket/SSE: el volumen de notificaciones de esta
 * agencia es bajo (nada de "chat en vivo"), así que un intervalo simple es
 * suficiente y no agrega infraestructura nueva.
 */
export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function load() {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) return;
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        })
        .catch((error) => logError("Error al cargar notificaciones", error));
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleNotificationClick = (notification: AppNotification) => {
    setOpen(false);
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      fetch(`/api/notifications/${notification.id}`, { method: "PATCH" }).catch((error) =>
        logError("Error al marcar notificación como leída", error)
      );
    }
    if (notification.link) router.push(notification.link);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    fetch("/api/notifications", { method: "POST" }).catch((error) =>
      logError("Error al marcar todas las notificaciones como leídas", error)
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notificaciones — ${unreadCount} sin leer` : "Notificaciones"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[9px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notificaciones"
          className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-2xl shadow-black/20 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
            <span className="text-xs font-bold text-foreground">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 rounded text-[11px] font-semibold text-accent-strong hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Check size={12} /> Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-foreground/50">Sin notificaciones todavía.</p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 border-b border-foreground/5 px-4 py-3 text-left transition-colors hover:bg-foreground/5 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                        !notification.read && "bg-accent/5"
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" aria-hidden="true" />}
                        <span className={cn("text-xs text-foreground", !notification.read ? "font-bold" : "font-medium")}>
                          {notification.title}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-foreground/70">{notification.body}</p>
                      <span className="font-mono text-[10px] text-foreground/40">{timeAgo(notification.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
