export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">📡</div>
      <h1 className="text-xl font-semibold text-white mb-2">You&apos;re offline</h1>
      <p className="text-gray-400 text-sm mb-6">Check your connection and try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
