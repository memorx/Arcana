import Link from "next/link";
import { HoraDelDia } from "@/components/tinta/HoraDelDia";

/**
 * Entrar y registrarse: franja de tinta con la marca y la hora del día, y el
 * formulario sobre papel, centrado. Sin adornos (nada de estrellas ni lunas).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="suelo-tinta border-b border-papel/12 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-escena items-center gap-6 px-gutter py-2 lg:py-2.5">
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center font-titulo text-[1.45rem] leading-none tracking-[0.01em] text-papel"
          >
            Arcana
          </Link>
          <HoraDelDia variante="larga" className="ml-auto hidden text-right text-niebla lg:block" />
        </div>
        {/* En pantallas chicas la hora va en su propia fila, debajo de la marca */}
        <div className="border-t border-papel/10 lg:hidden">
          <div className="mx-auto max-w-escena px-gutter py-1.5 text-niebla">
            <HoraDelDia variante="corta" className="text-[0.625rem] md:text-center" />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-gutter py-[clamp(32px,8vh,96px)]"
      >
        {children}
      </main>
    </div>
  );
}
