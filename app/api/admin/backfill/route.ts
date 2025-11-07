// app/api/admin/backfill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOnchainState, upsertPersona, upsertLook } from "@/lib/data";
import { TAMABOT_CORE } from "@/lib/abi";
import { pickLook } from "@/lib/archetypes";
import { generatePersonaText } from "@/lib/persona";

export const runtime = "nodejs";

/* ---------- helpers ---------- */
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
  return !!got && got === need;
}
function parseBool(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}
function normalizePersona(raw: any): { label: string; bio: string } {
  if (raw && typeof raw === "object") {
    const label = String(raw.label ?? "Auto");
    const bio = typeof raw.bio === "string" ? raw.bio : JSON.stringify(raw);
    return { label, bio };
  }
  return { label: "Auto", bio: String(raw ?? "") };
}

/* ---------- single backfill ---------- */
async function backfillSingle(id: number, full = false) {
  if (!Number.isFinite(id) || id <= 0) throw new Error("invalid-id");

  if (full) {
    // Use GET finalize (so you can hit it in a browser, too)
    const res = await fetch(`${baseUrl}/api/tamabot/finalize?id=${id}`, {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const j = await res.json();
    if (!res.ok || !j?.ok) throw new Error(j?.error || `finalize-failed`);
    return { ok: true, mode: "full", id, ...j };
  }

  // 🔧 IMPORTANT: pass NUMBER, not bigint
  const s = await getOnchainState(TAMABOT_CORE.address as `0x${string}`, Number(id));
  if (!s?.fid) throw new Error("no-fid-on-token");

  const look = pickLook(Number(s.fid));
  const personaRaw = await generatePersonaText(s, look.archetype.name);
  const persona = normalizePersona(personaRaw);

  await upsertPersona({
    tokenId: id,
    text: persona.bio,
    label: persona.label,
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

/* ---------- POST: { id } or { from, to, delayMs, full } ---------- */
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
  const end = id ?? to ?? from ?? 1;
  const delay = Math.max(0, Number(delayMs || 0));

  const done: number[] = [];
  const failed: { id: number; err: string }[] = [];

  for (let n = start; n <= end; n++) {
    try {
      const r = await backfillSingle(Number(n), Boolean(full));
      if ((r as any).ok) done.push(n);
      else throw new Error((r as any).error || "unknown");
    } catch (e: any) {
      failed.push({ id: n, err: String(e?.message || e) });
    }
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }

  return ok({ ok: true, range: { from: start, to: end }, full, done, failed });
}

/* ---------- GET: /api/admin/backfill?id=1&full=1 ---------- */
export async function GET(req: NextRequest) {
  if (!auth(req)) return ok({ ok: false, error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || "0");
  const full = parseBool(url.searchParams.get("full"));

  if (!Number.isFinite(id) || id <= 0) {
    return ok({ ok: false, error: "invalid-id" }, 400);
  }

  try {
    const r = await backfillSingle(id, full);
    return ok({ ok: true, ...r });
  } catch (e: any) {
    return ok({ ok: false, error: String(e?.message || e) }, 500);
  }
}
