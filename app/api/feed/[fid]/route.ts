// app/api/feed/[fid]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: any) {
  const fidStr = ctx?.params?.fid as string | undefined;
  const fidNum = Number(fidStr);
  if (!fidStr || !Number.isFinite(fidNum)) {
    return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
  }

  // TODO: your feed logic here
  return NextResponse.json({ ok: true, fid: fidNum });
}
