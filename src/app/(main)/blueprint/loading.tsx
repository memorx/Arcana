/** Skeleton of the Arcana Map in papel-hondo: the hero, its stamps and the ruled plates. Still with reduced motion. */
export default function BlueprintLoading() {
  const bloque = "rounded-sm bg-papel-hondo motion-safe:animate-pulse";
  return (
    <div className="grid gap-14" aria-busy="true">
      <div className="grid items-center gap-10 border-b border-filete pb-10 md:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="grid gap-5">
          <div className={`h-3 w-28 ${bloque}`} />
          <div className={`h-12 w-3/4 ${bloque}`} />
          <div className={`h-3 w-1/2 ${bloque}`} />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-10 w-36 rounded-full ${bloque}`} />
            ))}
          </div>
        </div>
        <div className={`aspect-square w-48 justify-self-center rounded-full sm:w-60 md:justify-self-end ${bloque}`} />
      </div>
      <div className="grid gap-px border-y border-filete bg-filete/25 md:grid-cols-2">
        <div className="h-64 bg-suelo p-7 md:col-span-2">
          <div className={`h-full ${bloque}`} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 bg-suelo p-7">
            <div className={`h-full ${bloque}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
