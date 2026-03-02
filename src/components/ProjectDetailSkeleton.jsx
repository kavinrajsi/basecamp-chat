export default function ProjectDetailSkeleton() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="flex flex-col h-[100dvh] sm:hidden">
        {/* Header */}
        <div className="bg-gray-900 shadow-md px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-gray-700 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-20 rounded bg-gray-700 animate-pulse" />
              <div className="h-3 w-32 rounded bg-gray-800 animate-pulse" />
            </div>
          </div>
          {/* Tab bar */}
          <div className="flex gap-6 mt-3 border-t border-gray-700 pt-2">
            <div className="h-4 w-12 rounded bg-gray-700 animate-pulse" />
            <div className="h-4 w-12 rounded bg-gray-800 animate-pulse" />
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 bg-gray-800 p-4 space-y-5">
          {/* Date separator */}
          <div className="flex justify-center">
            <div className="h-6 w-48 rounded-full bg-gray-700/60 animate-pulse" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 3 === 0 ? "flex-row-reverse" : ""}`}>
              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-700 animate-pulse" />
              <div className={`space-y-1.5 ${i % 3 === 0 ? "items-end" : ""}`} style={{ maxWidth: "75%" }}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 rounded bg-gray-700 animate-pulse" />
                  <div className="h-3 w-10 rounded bg-gray-800 animate-pulse" />
                </div>
                <div className={`rounded-2xl px-4 py-3 ${i % 3 === 0 ? "bg-blue-600/30" : "bg-gray-700"} animate-pulse`}>
                  <div className="h-3 w-40 rounded bg-gray-600/50" />
                  {i % 2 === 0 && <div className="h-3 w-28 rounded bg-gray-600/50 mt-1.5" />}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Input */}
        <div className="bg-gray-900 px-4 py-3">
          <div className="h-10 w-full rounded-xl bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden sm:block space-y-6">
        {/* Back link */}
        <div className="h-4 w-24 rounded bg-gray-700 animate-pulse" />
        {/* Project header */}
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-700 animate-pulse" />
          <div className="h-4 w-72 rounded bg-gray-800 animate-pulse" />
        </div>
        {/* Chat card */}
        <div className="rounded-2xl border border-gray-700/50 bg-gray-800 p-6 space-y-4">
          <div className="h-5 w-16 rounded bg-gray-700 animate-pulse" />
          {/* Date separator */}
          <div className="flex justify-center">
            <div className="h-6 w-48 rounded-full bg-gray-700/60 animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gray-700 animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded bg-gray-700 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-gray-800 animate-pulse" />
                </div>
                <div className="h-3 w-3/5 rounded bg-gray-700 animate-pulse" />
                {i % 2 === 0 && <div className="h-3 w-2/5 rounded bg-gray-700/60 animate-pulse" />}
              </div>
            </div>
          ))}
          {/* Input */}
          <div className="h-10 w-full rounded-xl bg-gray-700 animate-pulse mt-2" />
        </div>
      </div>
    </>
  );
}
