import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header */}
      <header className="p-4">
        <Link href="/" className="inline-block">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
            Arcana
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Decorative elements */}
      <div className="fixed top-1/4 left-10 text-6xl text-purple-500/10 pointer-events-none">
        &#9790;
      </div>
      <div className="fixed bottom-1/4 right-10 text-6xl text-amber-500/10 pointer-events-none">
        &#9733;
      </div>
    </div>
  );
}
