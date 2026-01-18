// app/story/page.tsx
export default function StoryPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#020617] text-white">
      <div className="container mx-auto px-4 py-12">
        <div
          className="
            relative overflow-hidden rounded-3xl border border-white/10
            bg-black/40 p-6 md:p-8
            shadow-[0_40px_120px_rgba(0,0,0,0.75)]
          "
        >
          {/* ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 400px at 15% -20%, rgba(121,255,225,0.10), transparent 60%), radial-gradient(900px 400px at 90% 120%, rgba(168,85,247,0.10), transparent 60%)",
            }}
          />

          <div className="relative">
            {/* Title */}
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
              Narrative Cartridge
            </div>

            <h1 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight">
              BASEBOTS // STORY MODE
            </h1>

            {/* Teaser */}
            <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-white/70">
              The city hums quietly beneath the chain.  
              Your Basebot was never meant to stay idle.  
              <span className="block mt-2 text-white/85 font-semibold">
                Something is waking up.
              </span>
            </p>

            {/* Episode Grid */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {/* Episode 1 */}
              <div
                className="
                  relative overflow-hidden rounded-2xl border border-emerald-400/30
                  bg-black/50 p-5
                  shadow-[0_0_0_1px_rgba(121,255,225,0.12),0_30px_80px_rgba(0,0,0,0.6)]
                "
              >
                <div className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(600px 240px at 20% 0%, rgba(121,255,225,0.14), transparent 60%)",
                  }}
                />

                <div className="relative">
                  <div className="text-xs uppercase tracking-wide text-emerald-300">
                    Episode 01
                  </div>

                  <div className="mt-1 text-xl font-bold">
                    Awakening Protocol
                  </div>

                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                    Your Basebot comes online for the first time.
                    Signals flicker. A choice appears.
                    Nothing you do here can be undone.
                  </p>

                  <button
                    type="button"
                    className="
                      mt-5 inline-flex items-center justify-center
                      rounded-full px-5 py-2
                      text-sm font-bold
                      bg-emerald-400 text-[#020617]
                      hover:bg-emerald-300
                      active:scale-95 transition
                      shadow-[0_12px_30px_rgba(121,255,225,0.25)]
                    "
                  >
                    ▶ Insert Cartridge
                  </button>
                </div>
              </div>

              {/* Episode 2 */}
              <div
                className="
                  relative overflow-hidden rounded-2xl border border-white/10
                  bg-black/30 p-5 opacity-80
                "
              >
                <div className="text-xs uppercase tracking-wide text-white/50">
                  Episode 02
                </div>

                <div className="mt-1 text-xl font-bold text-white/70">
                  Signal Fracture
                </div>

                <p className="mt-2 text-sm text-white/55 leading-relaxed">
                  The network responds.  
                  New actors emerge.  
                  Consequences begin to stack.
                </p>

                <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
                  Locked • Coming Soon
                </div>
              </div>
            </div>

            {/* Footer flavor */}
            <div className="mt-8 text-center text-xs text-white/45">
              Progress, choices, and artifacts may carry forward.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
