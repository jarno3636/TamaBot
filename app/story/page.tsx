// app/story/page.tsx
export default function StoryPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#020617] text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80">
            Story • Episode Hub
          </div>

          <h1 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight">
            Basebots: Narrative Mode
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl">
            Episode selection, choices, and gated NFT features will live here. This page is visible to anyone
            who visits the URL, but only your wallet sees it in the nav.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Episode 1</div>
              <div className="mt-1 text-lg font-bold">Cartridge: Awakening</div>
              <div className="mt-2 text-sm text-white/65">
                Playable now (admin draft). Branching narrative + inventory + on-chain flavor.
              </div>
              <button
                className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold bg-white text-[#020617] hover:opacity-90 active:scale-95 transition"
                type="button"
              >
                Enter Episode 1
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 opacity-80">
              <div className="text-xs text-white/60">Episode 2</div>
              <div className="mt-1 text-lg font-bold">Coming Soon</div>
              <div className="mt-2 text-sm text-white/65">
                Placeholder slot for future episodes — shows users what’s next.
              </div>
              <div className="mt-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                Locked • Coming soon
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-white/50">
            Tip: if you ever want to hard-gate this page later, we can add middleware — but right now it’s nav-only.
          </div>
        </div>
      </div>
    </main>
  );
}
