export function SplashUI() {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-blue-50 to-blue-100">
      <div className="absolute h-[520px] w-[520px] rounded-full bg-blue-200/40 blur-3xl animate-pulse-slow" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-300/40 blur-2xl animate-heartbeat" />
          <img
            src="/caresense-logo.svg"
            alt="CareSense"
            className="relative h-40 w-40 animate-heartbeat drop-shadow-xl"
          />
        </div>

        <h1 className="animate-fade-up text-5xl font-extrabold tracking-tight text-[#1E3FBF]">
          CareSense
        </h1>
        <p className="animate-fade-up-delay text-base font-medium text-blue-900/70">
          Care that listens. Insight that protects.
        </p>

        <div className="mt-4 h-1 w-56 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full w-1/3 rounded-full bg-[#1E3FBF] animate-loading-bar" />
        </div>
      </div>

      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.12); }
          30% { transform: scale(1); }
          45% { transform: scale(1.08); }
          60% { transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .animate-heartbeat { animation: heartbeat 1.4s ease-in-out infinite; }
        .animate-fade-up { animation: fadeUp 0.8s ease-out 0.2s both; }
        .animate-fade-up-delay { animation: fadeUp 0.8s ease-out 0.6s both; }
        .animate-loading-bar { animation: loadingBar 1.4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulseSlow 3s ease-in-out infinite; }
      `}</style>
    </main>
  );
}
