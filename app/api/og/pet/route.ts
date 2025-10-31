import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";

/**
 * /api/og/pet
 * Generates dynamic OG images with live token metadata.
 * Example:
 *   /api/og/pet?id=123
 *   /api/og/pet?title=Mint%20a%20TamaBot&subtitle=On%20Base
 */
export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const title = searchParams.get("title") || (id ? `TamaBot #${id}` : "TamaBots");
  const subtitle = searchParams.get("subtitle") || "Farcaster-aware pets on Base";

  // Prefer secure server-only RPC, fallback to public if not defined
  const rpcUrl =
    process.env.CHAIN_RPC_BASE ||
    process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
    "https://mainnet.base.org";

  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

  let image = "/og.png";

  try {
    if (id) {
      const tokenURI = await client.readContract({
        address: TAMABOT_CORE.address,
        abi: parseAbi([
          "function tokenURI(uint256 id) view returns (string)",
        ]),
        functionName: "tokenURI",
        args: [BigInt(id)],
      });

      // Attempt to parse IPFS/HTTP link from metadata
      if (typeof tokenURI === "string" && tokenURI.startsWith("ipfs://")) {
        image = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
      } else if (typeof tokenURI === "string" && tokenURI.startsWith("http")) {
        image = tokenURI;
      }
    }
  } catch (err) {
    console.error("OG fetch error:", err);
  }

  // Return simple OG image HTML (Vercel’s OG Image API can consume this)
  const html = `
    <html>
      <head>
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${subtitle}" />
        <meta property="og:image" content="${image}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${subtitle}" />
        <meta name="twitter:image" content="${image}" />
      </head>
      <body style="
        margin:0;
        display:flex;
        align-items:center;
        justify-content:center;
        background:radial-gradient(circle at 30% 20%, #1f6feb33, transparent),
                   radial-gradient(circle at 70% 80%, #f59e0b33, transparent),
                   #0a0b10;
        height:100vh;
        width:100vw;
        color:#fff;
        font-family:system-ui,sans-serif;
        text-align:center;
      ">
        <div style="max-width:800px;padding:40px;">
          <img src="${image}" alt="${title}" style="width:220px;height:220px;border-radius:20px;margin-bottom:20px;border:2px solid rgba(255,255,255,.2);" />
          <h1 style="font-size:48px;margin:0;">${title}</h1>
          <p style="font-size:22px;opacity:.8;margin-top:12px;">${subtitle}</p>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
