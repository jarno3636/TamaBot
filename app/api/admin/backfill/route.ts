// app/api/admin/backfill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TAMABOT_CORE } from "@/lib/abi";
import { getOnchainState, hasSupabase, upsertLook, upsertPersona } from "@/lib/data";
import { pickLook } from "@/lib/archetypes";
import { generatePersonaText } from "@/lib/persona";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** -------------------- Auth -------------------- */
const ADMIN_WALLET =
  (process.env.ADMIN_WALLET ||
    "0xB37c91305F50e3CdB0D7a048a18d7536c9524f58").toLowerCase();

function authorized(req: NextRequest): boolean {
  // Option A: shared secret token
  const needToken = process.env.ADMIN_TOKEN || "";
  const gotToken = req.headers.get("x-admin-token") || "";
  const tokenOK = needToken ? gotToken === needToken : false;

  // Option B: allow-listed wallet header
  const gotWallet = (req.headers.get("x-wallet-address") || "").toLowerCase();
  const walletOK = !!gotWallet && gotWallet === ADMIN_WALLET;

  // If no ADMIN_TOKEN configured, wallet gate still works.
  return tokenOK || walletOK;
}

/** -------------------- Utils -------------------- */
function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** -------------------- Handler -------------------- */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      from?: number;
      to?: number;
      delayMs?: number;
    };

    const start = Math.max(1, Number(body.from ?? 1));
    const end = Math.max(start, Number(body.to ?? start));
    const delayMs = Math.max(0, Number(body.delayMs ?? 120));

    const done: number[] = [];
    const failed: { id: number; err: string }[] = [];
    const supa = hasSupabase();

    for (let id = start; id <= end; id++) {
      try {
        const s = await getOnchainState(TAMABOT_CORE.address, id);
        if (!s?.fid) throw new Error("no fid");

        // Deterministic look + persona
        const look = pickLook(s.fid);
        const persona = await generatePersonaText(s, look.archetype.name);

        // Upserts (optional if Supabase not wired)
        if (supa) {
          try {
            await upsertPersona({
              tokenId: id,
              text: persona.bio ?? "A cheerful bot tuned to your vibe.",
              label: persona.label ?? "Auto",
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
          } catch (dbErr: any) {
            // Non-fatal: record but keep flowing
            throw new Error(`supabase: ${dbErr?.message || dbErr}`);
          }
        }

        done.push(id);
      } catch (e: any) {
        failed.push({ id, err: String(e?.message || e) });
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    return json({
      ok: true,
      range: { from: start, to: end },
      counts: { done: done.length, failed: failed.length },
      done,
      failed,
    });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
