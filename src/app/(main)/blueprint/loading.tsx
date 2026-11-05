export default function BlueprintLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-10" aria-busy="true">
      <div className="flex flex-col items-center gap-8 rounded-3xl border border-slate-800 bg-slate-900/40 px-5 py-8 sm:px-10 sm:py-12 md:flex-row">
        <div className="h-44 w-44 shrink-0 rounded-full bg-slate-800/60 motion-safe:animate-pulse sm:h-52 sm:w-52" />
        <div className="w-full flex-1 space-y-4">
          <div className="mx-auto h-3 w-24 rounded bg-slate-800 motion-safe:animate-pulse md:mx-0" />
          <div className="mx-auto h-8 w-3/4 rounded bg-slate-800 motion-safe:animate-pulse md:mx-0" />
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-24 rounded-full bg-slate-800 motion-safe:animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 rounded-xl border border-slate-800 bg-slate-900/40 motion-safe:animate-pulse md:col-span-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl border border-slate-800 bg-slate-900/40 motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
