"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Badge, LanguageSelector, buttonClasses } from "@/components/ui";
import { useFocusTrap } from "@/components/ui/modal";
import { SoundToggle } from "@/components/SoundToggle";
import { HoraDelDia } from "@/components/tinta/HoraDelDia";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { LEVELS } from "@/lib/levels";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "newReading"
  | "dailyCard"
  | "calendar"
  | "history"
  | "blueprint"
  | "insights"
  | "compatibility"
  | "collection"
  | "achievements"
  | "challenges"
  | "subscribe"
  | "profile"
  | "referral"
  | "settings";

interface Enlace {
  href: string;
  key: NavKey;
  prefetch?: boolean;
  /** Sólo cabe en la barra desde xl (1280); debajo vive en el menú de usuario. */
  desdeXl?: boolean;
}

/** Barra de escritorio (≥ 1024) y cabeza del menú móvil, en este orden. */
const PRINCIPALES: Enlace[] = [
  { href: "/dashboard", key: "dashboard", prefetch: true },
  { href: "/reading/new", key: "newReading", prefetch: true },
  { href: "/daily", key: "dailyCard", desdeXl: true },
  { href: "/calendar", key: "calendar", desdeXl: true },
  { href: "/history", key: "history" },
];

/** Menú de usuario (escritorio) y «Tu Arcana» (móvil). */
const DEL_USUARIO: Enlace[] = [
  { href: "/daily", key: "dailyCard" },
  { href: "/calendar", key: "calendar" },
  { href: "/blueprint", key: "blueprint" },
  { href: "/history/insights", key: "insights" },
  { href: "/compatibility", key: "compatibility" },
  { href: "/collection", key: "collection" },
  { href: "/achievements", key: "achievements" },
  { href: "/challenges", key: "challenges" },
  { href: "/subscribe", key: "subscribe" },
  { href: "/profile/setup", key: "profile" },
  { href: "/referral", key: "referral" },
  { href: "/settings", key: "settings" },
];

const ENLACE_BARRA =
  "inline-flex min-h-11 items-center font-dato text-[0.6875rem] tracking-[0.1em] text-niebla uppercase transition-colors hover:text-papel aria-[current=page]:text-papel aria-[current=page]:underline aria-[current=page]:decoration-rosa aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[7px]";

const ENLACE_MENU_USUARIO =
  "flex min-h-11 items-center px-4 text-[0.9375rem] text-papel/90 transition-colors hover:bg-papel/5 hover:text-papel aria-[current=page]:text-rosa-luz";

const MQ_ESCRITORIO = "(min-width: 1024px)";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [freeReadings, setFreeReadings] = useState<number | null>(null);
  const [userLevel, setUserLevel] = useState<number>(1);
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const tDashboard = useTranslations("dashboard");
  const tLevels = useTranslations("levels");

  const botonUsuario = useRef<HTMLButtonElement>(null);
  const menuMovilRef = useRef<HTMLDivElement>(null);
  const cerrarMovilRef = useRef<HTMLButtonElement>(null);

  // Fetch actual credits and level from API (not cached JWT)
  useEffect(() => {
    if (status === "authenticated") {
      const fetchUserData = async () => {
        try {
          const res = await fetch("/api/user/credits");
          if (res.ok) {
            const data = await res.json();
            setCredits(data.credits);
            setFreeReadings(data.freeReadingsLeft);
            if (data.level) {
              setUserLevel(data.level);
            }
          }
        } catch {
          // Fall back to session values if API fails
          setCredits(session?.user?.credits ?? 0);
          setFreeReadings(session?.user?.freeReadingsLeft ?? 0);
        }
      };
      fetchUserData();
    }
  }, [status, session?.user?.credits, session?.user?.freeReadingsLeft]);

  // Use fetched values or fall back to session
  const displayCredits = credits ?? session?.user?.credits ?? 0;
  const displayFreeReadings = freeReadings ?? session?.user?.freeReadingsLeft ?? 0;
  const autenticado = status === "authenticated" && !!session?.user;

  const cerrarMovil = useCallback(() => setMenuMovil(false), []);

  // Mientras el menú móvil está abierto, lo de atrás no existe para el teclado ni el lector.
  useEffect(() => {
    const menu = menuMovilRef.current;
    if (!menuMovil || !menu) return;
    const tapados = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== menu && !["SCRIPT", "STYLE", "LINK"].includes(el.tagName)
    );
    const antes = tapados.map((el) => [el.getAttribute("aria-hidden"), el.hasAttribute("inert")] as const);
    tapados.forEach((el) => {
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("inert", "");
    });
    return () => {
      tapados.forEach((el, i) => {
        const [ariaHidden, inert] = antes[i];
        if (ariaHidden === null) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", ariaHidden);
        if (!inert) el.removeAttribute("inert");
      });
    };
  }, [menuMovil]);

  // Menú móvil: foco atrapado, Esc, scroll bloqueado y el foco vuelve al botón. Va después del
  // efecto de arriba a propósito: al cerrar, primero se quita el `inert` y luego vuelve el foco.
  useFocusTrap(menuMovilRef, menuMovil, { onEscape: cerrarMovil, initialFocusRef: cerrarMovilRef });

  // Si la ventana crece a escritorio con el menú abierto, se cierra (el menú es sólo < 1024).
  useEffect(() => {
    if (!menuMovil || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MQ_ESCRITORIO);
    const alCambiar = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuMovil(false);
    };
    mq.addEventListener?.("change", alCambiar);
    return () => mq.removeEventListener?.("change", alCambiar);
  }, [menuMovil]);

  // Menú de usuario (escritorio): Esc lo cierra y devuelve el foco a su botón.
  useEffect(() => {
    if (!isMenuOpen) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        botonUsuario.current?.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [isMenuOpen]);

  const actual = (href: string) => (pathname === href ? "page" : undefined);

  const creditos = (
    <>
      {displayFreeReadings > 0 && (
        <Badge variant="success">
          {displayFreeReadings} {tDashboard("freeShort")}
        </Badge>
      )}
      <Badge variant={displayCredits === 0 && displayFreeReadings === 0 ? "warning" : "secondary"}>
        {tDashboard("credits", { count: displayCredits })}
      </Badge>
    </>
  );

  const inicial =
    session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?";

  return (
    <header className="suelo-tinta sticky top-0 z-40 w-full border-b border-papel/12 pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex max-w-escena items-center gap-4 px-gutter py-2 lg:gap-8 lg:py-2.5">
        {/* Marca */}
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center font-titulo text-[1.45rem] leading-none tracking-[0.01em] text-papel"
        >
          Arcana
        </Link>

        {/* Navegación de escritorio */}
        <nav aria-label={t("mainNav")} className="hidden items-center gap-6 lg:flex xl:gap-7">
          {autenticado ? (
            PRINCIPALES.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                prefetch={e.prefetch}
                aria-current={actual(e.href)}
                className={cn(ENLACE_BARRA, e.desdeXl && "hidden xl:inline-flex")}
              >
                {t(e.key)}
              </Link>
            ))
          ) : status === "unauthenticated" ? (
            <Link href="/calendar" aria-current={actual("/calendar")} className={ENLACE_BARRA}>
              {t("calendar")}
            </Link>
          ) : null}
        </nav>

        {/* Lado derecho */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            <SoundToggle />
            <LanguageSelector />
          </div>

          {status === "loading" ? (
            <div aria-hidden="true" className="h-9 w-28 rounded-full bg-papel/10 motion-safe:animate-pulse" />
          ) : autenticado && session?.user ? (
            <>
              {/* Créditos y lecturas gratis */}
              <Link
                href="/credits"
                className="hidden min-h-11 items-center gap-1.5 rounded-full px-1 transition-opacity hover:opacity-80 sm:flex"
              >
                {creditos}
              </Link>

              {/* Menú de usuario (escritorio) */}
              <div className="relative hidden lg:block">
                <button
                  ref={botonUsuario}
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex min-h-11 items-center gap-2 rounded-full px-1.5 transition-colors hover:bg-papel/10"
                  aria-label={isMenuOpen ? t("closeMenu") : t("openMenu")}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="relative">
                    <span className="flex size-9 items-center justify-center rounded-full border border-papel/40 font-titulo text-base text-papel">
                      {inicial}
                    </span>
                    {/* Nivel */}
                    <span
                      className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-rosa-luz font-dato text-[9px] leading-none text-tinta"
                      title={`${tLevels("level")} ${userLevel}: ${LEVELS[userLevel - 1]?.name || ""}`}
                    >
                      {userLevel}
                    </span>
                  </span>
                  <svg
                    aria-hidden="true"
                    className={cn("h-4 w-4 text-niebla transition-transform", isMenuOpen && "rotate-180")}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setIsMenuOpen(false)} />
                    <div className="suelo-tinta absolute right-0 z-20 mt-2 w-64 rounded-sm border border-filete/20 py-2 motion-safe:animate-entra">
                      <div className="border-b border-filete/12 px-4 pt-1 pb-3">
                        <p className="truncate font-titulo text-lg leading-tight">
                          {session.user.name || tDashboard("welcomeDefault")}
                        </p>
                        <p className="truncate font-dato text-[0.6875rem] tracking-[0.04em] text-niebla">
                          {session.user.email}
                        </p>
                      </div>

                      <div className="py-1">
                        {DEL_USUARIO.map((e) => (
                          <Link
                            key={e.href}
                            href={e.href}
                            aria-current={actual(e.href)}
                            className={ENLACE_MENU_USUARIO}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {t(e.key)}
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-filete/12 pt-1">
                        <button
                          type="button"
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="flex min-h-11 w-full items-center px-4 text-left text-[0.9375rem] text-error-claro transition-colors hover:bg-papel/5"
                        >
                          {t("logout")}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                prefetch={true}
                className={buttonClasses({ variant: "linea", size: "sm", className: "lg:border-transparent" })}
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                prefetch={true}
                className={buttonClasses({ variant: "primario", size: "sm", className: "hidden lg:inline-flex" })}
              >
                {t("register")}
              </Link>
            </>
          )}

          {/* Menú móvil (< 1024) */}
          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-papel/30 transition-colors hover:border-papel lg:hidden"
            aria-label={menuMovil ? t("closeNav") : t("openNav")}
            aria-expanded={menuMovil}
            aria-controls="menu-movil"
          >
            <svg aria-hidden="true" className="h-4 w-5" viewBox="0 0 20 16" fill="none" stroke="currentColor">
              <path strokeWidth={1.4} strokeLinecap="round" d="M2 5h16M2 11h11" />
            </svg>
          </button>
        </div>
      </div>

      {/* La hora del día: larga en escritorio, corta abajo de la marca en pantallas chicas */}
      <div className="border-t border-papel/10">
        <div className="mx-auto max-w-escena px-gutter py-1.5 text-niebla">
          <HoraDelDia variante="larga" className="hidden text-center lg:block" />
          <HoraDelDia variante="corta" className="text-[0.625rem] md:text-center lg:hidden" />
        </div>
      </div>

      {menuMovil &&
        createPortal(
          <div
            ref={menuMovilRef}
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label={t("navMenu")}
            tabIndex={-1}
            className="suelo-tinta fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain focus:outline-none motion-safe:animate-entra lg:hidden"
          >
            <div className="flex items-center justify-between gap-4 border-b border-papel/12 px-gutter pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
              <Link
                href="/"
                onClick={cerrarMovil}
                className="inline-flex min-h-11 items-center font-titulo text-[1.45rem] leading-none tracking-[0.01em]"
              >
                Arcana
              </Link>
              <button
                ref={cerrarMovilRef}
                type="button"
                onClick={cerrarMovil}
                aria-label={t("closeNav")}
                className="inline-flex size-11 items-center justify-center rounded-full border border-papel/30 transition-colors hover:border-papel"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <path strokeWidth={1.4} strokeLinecap="round" d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>

            <div className="px-gutter py-2 text-niebla">
              <HoraDelDia variante="larga" />
            </div>

            <nav aria-label={t("mainNav")} className="px-gutter pt-6 pb-8">
              <ul className="grid gap-1">
                {(autenticado
                  ? PRINCIPALES.map((e) => ({ href: e.href, texto: t(e.key) }))
                  : [
                      { href: "/calendar", texto: t("calendar") },
                      { href: "/cards", texto: tFooter("explore") },
                      { href: "/blog", texto: tFooter("blog") },
                    ]
                ).map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      onClick={cerrarMovil}
                      aria-current={actual(e.href)}
                      className="inline-flex min-h-12 items-center font-titulo text-[clamp(1.75rem,1.2rem+2.4vw,2.4rem)] leading-tight transition-colors hover:text-rosa-luz aria-[current=page]:text-rosa-luz"
                    >
                      {e.texto}
                    </Link>
                  </li>
                ))}
              </ul>

              {autenticado && (
                <>
                  <Etiqueta className="mt-8 mb-2">{t("yourArcana")}</Etiqueta>
                  <ul className="grid grid-cols-1 gap-x-8 min-[420px]:grid-cols-2">
                    {DEL_USUARIO.filter((e) => e.href !== "/daily" && e.href !== "/calendar").map((e) => (
                      <li key={e.href}>
                        <Link
                          href={e.href}
                          onClick={cerrarMovil}
                          aria-current={actual(e.href)}
                          className="flex min-h-11 items-center border-b border-papel/10 text-[1.0625rem] text-papel/90 transition-colors hover:text-papel aria-[current=page]:text-rosa-luz"
                        >
                          {t(e.key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="mt-auto grid gap-5 border-t border-papel/12 px-gutter pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
              {autenticado && session?.user && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Etiqueta punto={false} className="mb-0.5">
                      {t("account")}
                    </Etiqueta>
                    <p className="truncate font-titulo text-lg leading-tight">
                      {session.user.name || tDashboard("welcomeDefault")}
                    </p>
                  </div>
                  <Link
                    href="/credits"
                    onClick={cerrarMovil}
                    className="flex min-h-11 flex-wrap items-center gap-1.5 hover:opacity-80"
                  >
                    {creditos}
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <LanguageSelector variant="inline" />
                <SoundToggle className="border border-papel/30" />
              </div>

              {autenticado ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className={buttonClasses({ variant: "linea", size: "md", className: "w-full text-error-claro" })}
                >
                  {t("logout")}
                </button>
              ) : (
                <div className="grid gap-3 min-[420px]:grid-cols-2">
                  <Link
                    href="/login"
                    onClick={cerrarMovil}
                    className={buttonClasses({ variant: "linea", size: "md" })}
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={cerrarMovil}
                    className={buttonClasses({ variant: "primario", size: "md" })}
                  >
                    {t("register")}
                  </Link>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
