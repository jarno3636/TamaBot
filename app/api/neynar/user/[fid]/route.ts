// app/api/neynar/user/[fid]/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: any) {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "missing NEYNAR_API_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const fidNum = Number(params?.fid);
  if (!Number.isFinite(fidNum) || fidNum <= 0) {
    return new Response(JSON.stringify({ error: "bad fid" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const r = await fetch(
    `https://api.neynar.com/v2/farcaster/user?fid=${fidNum}`,
    { headers: { "x-api-key": key } }
  );

  // Bubble Neynar errors as-is
  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json; charset=utf-8" },
  });
}
