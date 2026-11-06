"use client";

import { Fragment, ReactNode, RefObject, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------------
   Trampa de foco compartida (Modal y el menú móvil de la cabecera)
   -------------------------------------------------------------------------- */

const ENFOCABLES = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function enfocables(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
    (el) => !el.closest("[hidden], [inert], [aria-hidden='true']")
  );
}

/** Capas abiertas, de abajo arriba: sólo la de encima atiende Tab y Esc. */
const capas: symbol[] = [];
/** Bloqueo de scroll compartido: se quita cuando se cierra la última capa. */
const bloqueo = { overflow: "", paddingRight: "" };

function bloquearScroll() {
  const { body, documentElement } = document;
  bloqueo.overflow = body.style.overflow;
  bloqueo.paddingRight = body.style.paddingRight;
  const barra = window.innerWidth - documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (barra > 0) body.style.paddingRight = `${barra}px`;
}

function soltarScroll() {
  document.body.style.overflow = bloqueo.overflow;
  document.body.style.paddingRight = bloqueo.paddingRight;
}

export interface FocusTrapOptions {
  /** Se llama con Esc (sólo si esta capa es la de encima). */
  onEscape?: () => void;
  /** Elemento que recibe el foco al abrir; si no, el primero enfocable o el panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Bloquear el scroll del documento mientras está activa (por omisión sí). */
  lockScroll?: boolean;
}

/**
 * Mientras `active`: foco inicial dentro de `ref`, Tab y Mayús+Tab no salen,
 * Esc llama a `onEscape`, el documento no se desplaza y, al terminar, el foco
 * vuelve a donde estaba (el disparador).
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {}
) {
  const opciones = useRef(options);
  useEffect(() => {
    opciones.current = options;
  });

  useEffect(() => {
    const panel = ref.current;
    if (!active || !panel) return;

    const capa = Symbol("capa");
    capas.push(capa);
    const encima = () => capas[capas.length - 1] === capa;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bloquea = opciones.current.lockScroll !== false;
    if (bloquea && capas.length === 1) bloquearScroll();

    const inicial =
      opciones.current.initialFocusRef?.current ??
      panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]") ??
      enfocables(panel)[0] ??
      panel;
    inicial.focus({ preventScroll: true });

    const alTeclear = (e: KeyboardEvent) => {
      if (!encima()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        opciones.current.onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables(panel);
      if (lista.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement;
      const fuera = !panel.contains(actual);
      if (e.shiftKey && (actual === primero || actual === panel || fuera)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (actual === ultimo || fuera)) {
        e.preventDefault();
        primero.focus();
      }
    };

    // Si el foco se escapa (un clic fuera, un script), vuelve adentro.
    const alEnfocar = (e: FocusEvent) => {
      if (!encima() || panel.contains(e.target as Node)) return;
      (enfocables(panel)[0] ?? panel).focus({ preventScroll: true });
    };

    document.addEventListener("keydown", alTeclear);
    document.addEventListener("focusin", alEnfocar);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("focusin", alEnfocar);
      const i = capas.indexOf(capa);
      if (i >= 0) capas.splice(i, 1);
      if (bloquea && capas.length === 0) soltarScroll();
      if (anterior && anterior.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

/* --------------------------------------------------------------------------
   Modal: siempre sobre tinta (§5.4/§5.5)
   -------------------------------------------------------------------------- */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** id del título. Si no se da, se usa el primer h1/h2/h3 (o [data-modal-title]) del contenido. */
  "aria-labelledby"?: string;
  /** Nombre accesible cuando no hay un título visible. */
  "aria-label"?: string;
  /** Elemento que recibe el foco al abrir (por omisión, el primero enfocable). */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  "aria-labelledby": labelledBy,
  "aria-label": ariaLabel,
  initialFocusRef,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const presionDentro = useRef(false);
  const autoId = useId();

  useFocusTrap(panelRef, isOpen, { onEscape: onClose, initialFocusRef });

  // Nombre accesible: el título del contenido, si quien usa el modal no dio uno.
  useEffect(() => {
    const panel = panelRef.current;
    if (!isOpen || !panel || labelledBy || ariaLabel) return;
    const titulo = panel.querySelector<HTMLElement>("[data-modal-title], h1, h2, h3");
    if (!titulo) return;
    if (!titulo.id) titulo.id = `${autoId}-titulo`;
    panel.setAttribute("aria-labelledby", titulo.id);
  }, [isOpen, labelledBy, ariaLabel, autoId, children]);

  if (!isOpen) return null;

  return (
    <Fragment>
      {/* Fondo: el pliego se apaga en tinta */}
      <div className="fixed inset-0 z-50 bg-tinta/75" aria-hidden="true" />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          // Cierra con un clic en el fondo, no al soltar fuera un arrastre que empezó adentro.
          const empezoDentro = presionDentro.current;
          presionDentro.current = false;
          if (e.target === e.currentTarget && !empezoDentro) onClose();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={ariaLabel}
          tabIndex={-1}
          className={cn(
            "suelo-tinta relative w-full max-w-lg max-h-[90vh] overflow-auto rounded-sm border border-filete/20",
            "focus:outline-none motion-safe:animate-entra",
            className
          )}
          onMouseDown={() => {
            // Todo clic burbujea al contenedor de arriba, que lo vuelve a poner en falso.
            presionDentro.current = true;
          }}
        >
          {children}
        </div>
      </div>
    </Fragment>
  );
}

export function ModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6 pb-4 border-b border-filete/15", className)}>{children}</div>;
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "p-6 pt-4 border-t border-filete/15 flex flex-wrap items-center justify-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
