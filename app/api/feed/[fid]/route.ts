// app/api/feed/[fid]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { fid: string } }
) {
  const fidNum = Number(params.fid);
  if (!Number.isFinite(fidNum)) {
    return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
  }

  // TODO: your feed logic here
  return NextResponse.json({ ok: true, fid: fidNum });
}
