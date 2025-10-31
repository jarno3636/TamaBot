export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold">About TamaBots</h1>
        <p className="mt-2 text-zinc-700">
          TamaBots are on-chain, Farcaster-aware pets. Your daily activity can nudge stats and evolve sprites.
        </p>
        <ul className="mt-4 grid sm:grid-cols-2 gap-3">
          <li className="badge">Base L2</li>
          <li className="badge">IPFS sprites</li>
          <li className="badge">Mini app in Warpcast</li>
          <li className="badge">EIP-712 attestation sync</li>
        </ul>
        <p className="mt-4 text-sm text-zinc-600">
          Tip: open the mini app in Warpcast, sign in, and enable notifications for milestone pings.
        </p>
      </div>
    </main>
  );
}
