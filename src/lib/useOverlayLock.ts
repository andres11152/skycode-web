"use client";

import { useEffect, type RefObject } from "react";

/**
 * Mientras `active`: bloquea el scroll del fondo compensando el ancho de la
 * barra de desplazamiento (sin eso la página salta unos píxeles al abrir) y
 * deja `inert` todo hermano del overlay en `<body>`, así ni el foco ni los
 * lectores de pantalla llegan a la página de atrás.
 *
 * Es la misma lógica que `ui/Modal.tsx`, que la lleva inline. El overlay debe
 * montarse en un portal a `<body>` (hermano directo de lo demás).
 *
 * Declárese ANTES de `useFocusTrap`: las limpiezas corren en orden de
 * declaración, y el trap devuelve el foco al abrir; si la página siguiera
 * `inert` en ese momento, `focus()` no haría nada.
 */
export function useOverlayLock(active: boolean, overlayRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    const madeInert: Element[] = [];
    for (const child of Array.from(body.children)) {
      if (child === overlayRef.current || child.tagName === "SCRIPT" || child.hasAttribute("inert")) continue;
      child.setAttribute("inert", "");
      madeInert.push(child);
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      for (const el of madeInert) el.removeAttribute("inert");
    };
  }, [active, overlayRef]);
}
