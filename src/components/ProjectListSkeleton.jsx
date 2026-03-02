export default function ProjectListSkeleton({ count = 6 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/40 last:border-0"
        >
          {/* Avatar */}
          <div className="h-14 w-14 shrink-0 rounded-full bg-gray-700 animate-pulse" />
          {/* Text */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/5 rounded bg-gray-700 animate-pulse" />
            <div className="h-3 w-2/5 rounded bg-gray-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
