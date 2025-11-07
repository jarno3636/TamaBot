// scripts/backfill.ts
import "dotenv/config";
import { getOnchainState, upsertPersona, upsertLook } from "../lib/data";
import { TAMABOT_CORE } from "../lib/abi";
import { pickLook } from "../lib/archetypes";
import { generatePersonaText } from "../lib/persona";

function arg(name: string, def?: string) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=").slice(1).join("=") : def;
}

const F = Number(arg("from", "1"));
const T = Number(arg("to", String(F)));
const DELAY = Number(arg("delayMs", "150"));

function normalizePersona(raw: any): { label: string; bio: string } {
  if (raw && typeof raw === "object") {
    const label = String(raw.label ?? "Auto");
    const bio = typeof raw.bio === "string" ? raw.bio : JSON.stringify(raw);
    return { label, bio };
  }
  return { label: "Auto", bio: String(raw ?? "") };
}

(async () => {
  const done: number[] = [];
  const failed: { id: number; err: string }[] = [];

  for (let id = F; id <= T; id++) {
    try {
      const s = await getOnchainState(TAMABOT_CORE.address, id);
      if (!s?.fid) throw new Error("no fid");

      const look = pickLook(s.fid);
      const rawPersona = await generatePersonaText(s, look.archetype.name);
      const persona = normalizePersona(rawPersona); // { label, bio }

      try {
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
      } catch {
        // non-fatal persistence error
      }

      done.push(id);
      console.log(`ok ${id} fid=${s.fid} ${look.archetype.id} "${persona.label}"`);
    } catch (e: any) {
      failed.push({ id, err: String(e?.message || e) });
      console.error(`fail ${id}: ${String(e?.message || e)}`);
    }

    // be polite to OpenAI
    await new Promise((r) => setTimeout(r, DELAY));
  }

  console.log(JSON.stringify({ from: F, to: T, done, failed }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
