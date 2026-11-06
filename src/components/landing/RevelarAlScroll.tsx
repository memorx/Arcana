"use client";

import { useEffect } from "react";

/** Atributo en <html> que activa el revelado (portada.css). Sin JS o con reduced-motion nunca se pone. */
export const ATRIBUTO_REVELAR = "data-portada-revelar";

/**
 * Revelado editorial al hacer scroll para los bloques `[data-revelar]` de la portada.
 *
 * Nada depende de esto para verse: el servidor manda todo visible; al montar, lo que ya está en pantalla (o
 * arriba) se marca visible y sólo entonces se enciende el atributo que esconde lo que falta por llegar. Sin JS,
 * con `prefers-reduced-motion` o sin IntersectionObserver, no hace nada.
 */
export function RevelarAlScroll() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const bloques = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]"));
    if (bloques.length === 0) return;

    const mostrar = (el: Element) => el.setAttribute("data-visible", "");
    const limite = window.innerHeight * 0.92;
    const pendientes = bloques.filter((el) => {
      if (el.getBoundingClientRect().top < limite) {
        mostrar(el);
        return false;
      }
      return true;
    });
    if (pendientes.length === 0) return;

    const html = document.documentElement;
    html.setAttribute(ATRIBUTO_REVELAR, "");

    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          mostrar(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    pendientes.forEach((el) => io.observe(el));

    // Red para saltos por ancla: lo que quedó arriba sin pasar por la vista también se muestra.
    const alDesplazar = () => {
      for (const el of pendientes) {
        if (!el.hasAttribute("data-visible") && el.getBoundingClientRect().bottom < 0) mostrar(el);
      }
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", alDesplazar);
      html.removeAttribute(ATRIBUTO_REVELAR);
    };
  }, []);

  return null;
}
