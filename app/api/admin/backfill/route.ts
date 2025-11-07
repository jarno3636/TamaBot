// app/api/admin/backfill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOnchainState, upsertPersona, upsertLook } from "@/lib/data";
import { TAMABOT_CORE } from "@/lib/abi";
import { pickLook } from "@/lib/archetypes";
import { generatePersonaText } from "@/lib/persona";

export const runtime = "nodejs";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

function ok(data: any, code = 200) {
  return NextResponse.json(data, { status: code });
}
function auth(req: NextRequest) {
  const need = process.env.ADMIN_TOKEN || "";
  if (!need) return true;
  const got = req.headers.get("x-admin-token") || "";
  return got && got === need;
}

async function backfillSingle(id: number, full = false) {
  if (full) {
    // Full mode → delegate to finalize (image + pin + set sprite URI)
    const res = await fetch(`${baseUrl}/api/tamabot/finalize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.error || `Finalize error for id ${id}`);
    return { ok: true, mode: "full", id, ...j };
  }

  // Persona + look only
  const s = await getOnchainState(TAMABOT_CORE.address, id);
  if (!s?.fid) throw new Error("no-fid-on-token");

  const look = pickLook(Number(s.fid));
  const persona = await generatePersonaText(s, look.archetype.name);

  // ✅ upsertPersona expects ONE object argument in your project
  await upsertPersona({
    tokenId: id,
    persona,
    label: "Auto",
    source: "openai",
  });

  await upsertLook(id, {
    archetypeId: look.archetype.id,
    baseColor: look.base,
    accentColor: look.accent,
    auraColor: look.aura,
    biome: look.biome,
    accessory: look.accessory,
  });

  return { ok: true, mode: "light", id, fid: Number(s.fid) };
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return ok({ ok: false, error: "unauthorized" }, 401);

  const { from, to, id, delayMs = 150, full = false } =
    (await req.json().catch(() => ({}))) as {
      from?: number;
      to?: number;
      id?: number;
      delayMs?: number;
      full?: boolean;
    };

  const start = id ?? from ?? 1;
  const end = id ? id : to ?? from ?? 1;
  const delay = Math.max(0, Number(delayMs || 0));

  const done: number[] = [];
  const failed: { id: number; err: string }[] = [];

  for (let n = start; n <= end; n++) {
    try {
      const r = await backfillSingle(n, full);
      if (r.ok) done.push(n);
      else throw new Error((r as any).error || "unknown");
    } catch (e: any) {
      failed.push({ id: n, err: String(e?.message || e) });
    }
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }

  return ok({ ok: true, range: { from: start, to: end }, full, done, failed });
}
