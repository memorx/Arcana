import { Header, Footer } from "@/components/layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </>
  );
}
