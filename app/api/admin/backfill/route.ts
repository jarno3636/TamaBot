import { NextRequest, NextResponse } from "next/server";
import { getOnchainState, upsertPersona, upsertLook } from "@/lib/data";
import { pickLook } from "@/lib/archetypes";
import { generatePersonaText } from "@/lib/persona";
import { TAMABOT_CORE } from "@/lib/abi";

export const runtime = "edge";

function json(data: any, code = 200) {
  return NextResponse.json(data, { status: code });
}
function auth(req: NextRequest) {
  const need = process.env.ADMIN_TOKEN || "";
  if (!need) return true; // no token set => open (dev)
  const got = req.headers.get("x-admin-token") || "";
  return got && got === need;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return json({ error: "unauthorized" }, 401);

  const { from = 1, to = from } = (await req.json().catch(() => ({}))) as { from?: number; to?: number };
  const start = Math.max(1, Number(from || 1));
  const end = Math.max(start, Number(to || start));

  const done: number[] = [];
  const failed: { id: number; err: string }[] = [];

  for (let id = start; id <= end; id++) {
    try {
      const s = await getOnchainState(TAMABOT_CORE.address, id);
      if (!s?.fid) throw new Error("no fid");
      const look = pickLook(s.fid);
      const persona = await generatePersonaText(s, look.archetype.name);

      try {
        await upsertPersona(id, persona);
        await upsertLook(id, {
          archetypeId: look.archetype.id,
          baseColor: look.base,
          accentColor: look.accent,
          auraColor: look.aura,
        });
      } catch {}

      done.push(id);
    } catch (e: any) {
      failed.push({ id, err: String(e?.message || e) });
    }
    // small delay to be polite to OpenAI
    await new Promise(r => setTimeout(r, 120));
  }

  return json({ ok: true, range: { from: start, to: end }, done, failed });
}
