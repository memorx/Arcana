import { Header, Footer } from "@/components/layout";
import { InstallPWA } from "@/components/ui/InstallPWA";

/** Pantallas de la app: papel, con el ancho y los márgenes de la maqueta (§5.4). */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main
        id="main-content"
        className="mx-auto w-full max-w-pliego flex-1 scroll-mt-(--alto-cabecera) px-gutter py-[clamp(32px,6vh,64px)]"
      >
        {children}
      </main>
      <Footer />
      <InstallPWA />
    </>
  );
}
