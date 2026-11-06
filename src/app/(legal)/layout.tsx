import { Header, Footer } from "@/components/layout";

/** Páginas legales: la misma cabecera y el mismo pie que el resto, sobre papel. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="w-full flex-1 scroll-mt-(--alto-cabecera)">
        {children}
      </main>
      <Footer />
    </>
  );
}
