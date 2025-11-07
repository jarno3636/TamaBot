import { NextRequest, NextResponse } from "next/server";
import { getOnchainState, upsertPersona, upsertLook } from "@/lib/data";
import { pickLook } from "@/lib/archetypes";
import { generatePersonaText } from "@/lib/persona";
import { TAMABOT_CORE } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const need = process.env.ADMIN_TOKEN || "";
  if (!need) return true;
  const got = req.headers.get("x-admin-token") || "";
  return !!got && got === need;
}

function json(data: any, code = 200) {
  return NextResponse.json(data, { status: code });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return json({ ok: false, error: "unauthorized" }, 401);

  const { from = 1, to = from, delayMs = 120 } = (await req.json().catch(() => ({}))) as {
    from?: number;
    to?: number;
    delayMs?: number;
  };

  const start = Math.max(1, Number(from || 1));
  const end = Math.max(start, Number(to || start));
  const delay = Math.max(0, Number(delayMs || 0));

  const done: number[] = [];
  const failed: { id: number; err: string }[] = [];

  for (let id = start; id <= end; id++) {
    try {
      const s = await getOnchainState(TAMABOT_CORE.address, id);
      if (!s?.fid) throw new Error("no fid");
      const look = pickLook(s.fid);
      const persona = await generatePersonaText(s, look.archetype.name);

      try {
        // current signature: upsertPersona(tokenId, text, label?, source?)
        await upsertPersona(id, `${persona.label}\n\n${persona.bio}`, "Auto", "openai");
        await upsertLook(id, {
          archetypeId: look.archetype.id,
          baseColor: look.base,
          accentColor: look.accent,
          auraColor: look.aura,
          biome: look.biome,
          accessory: look.accessory,
        });
      } catch (dbErr: any) {
        // keep going; record error
        failed.push({ id, err: `db: ${String(dbErr?.message || dbErr)}` });
        continue;
      }

      done.push(id);
    } catch (e: any) {
      failed.push({ id, err: String(e?.message || e) });
    }
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }

  return json({ ok: true, range: { from: start, to: end }, done, failed });
}
