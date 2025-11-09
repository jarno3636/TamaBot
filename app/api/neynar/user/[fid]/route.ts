// app/api/neynar/user/[fid]/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { fid?: string } }) {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "missing NEYNAR_API_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const fidNum = Number(params?.fid);
  if (!Number.isFinite(fidNum) || fidNum <= 0) {
    return new Response(JSON.stringify({ ok: false, error: "bad fid" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  // Primary call
  const r = await fetch(
    `https://api.neynar.com/v2/farcaster/user?fid=${fidNum}`,
    { headers: { "x-api-key": key } }
  );

  // Bubble body as-is (so shape matches Neynar)
  const body = await r.text().catch(() => "");
  return new Response(body, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
