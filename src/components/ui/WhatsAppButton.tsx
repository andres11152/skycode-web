"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

const WHATSAPP_PHONE = "573138081081"; // Número de la agencia
const DEFAULT_MESSAGE = encodeURIComponent(
  "Hola equipo SKYCODE, estuve revisando su sitio web y me gustaría cotizar un proyecto de software."
);

export function WhatsAppButton() {
  const reduced = Boolean(useReducedMotion());
  const [isOpen, setIsOpen] = useState(false);

  const waLink = `https://wa.me/${WHATSAPP_PHONE}?text=${DEFAULT_MESSAGE}`;

  return (
    // z-40: por debajo de Navbar (50), ScrollProgress (55), skip-link (60) y CookieBanner
    // (65) — el banner de cookies, que ocupa todo el ancho inferior, debe poder taparlo.
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto">
      {/* Popover / Chat Card Preview */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 15, scale: reduced ? 1 : 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 15, scale: reduced ? 1 : 0.9 }}
            transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 350, damping: 25 }}
            className="mb-3 w-80 rounded-xl border border-foreground/15 bg-foreground/95 p-4 text-background shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-background/10 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-background leading-tight">SKYCODE Directo</h4>
                  <span className="text-[10px] text-background/60 font-mono">Respuesta en horario laboral</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-background/60 hover:bg-background/10 hover:text-background transition-colors"
                aria-label="Cerrar chat"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl bg-background/10 p-3 text-xs leading-relaxed text-background/90 mb-4 font-sans">
              <strong>Estimado cliente:</strong> ¿Tiene dudas sobre su proyecto o requiere una valoración técnica inmediata? Chatee directamente con nuestro equipo de ingeniería.
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#20bd5a] active:scale-98 transition-all"
            >
              <span>Abrir Chat de WhatsApp</span>
              <Send size={14} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-shadow hover:shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={28} className="text-white transition-transform duration-300 group-hover:scale-110" />
      </motion.button>
    </div>
  );
}
