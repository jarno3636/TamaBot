// scripts/backfill.ts
import "dotenv/config";
import { getOnchainState, upsertPersona, upsertLook } from "../lib/data";
import { TAMABOT_CORE } from "../lib/abi";
import { pickLook } from "../lib/archetypes";
import { generatePersonaText } from "../lib/persona";

function arg(name: string, def?: string) {
  const m = process.argv.find(a => a.startsWith(`--${name}=`));
  return m ? m.split("=").slice(1).join("=") : def;
}

const F = Number(arg("from", "1"));
const T = Number(arg("to", String(F)));
const DELAY = Number(arg("delayMs", "150"));

(async () => {
  const done: number[] = [];
  const failed: { id: number; err: string }[] = [];
  for (let id = F; id <= T; id++) {
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
      console.log(`ok ${id} fid=${s.fid} ${look.archetype.id} "${persona.label}"`);
    } catch (e: any) {
      failed.push({ id, err: String(e?.message || e) });
      console.error(`fail ${id}: ${String(e?.message || e)}`);
    }
    await new Promise(r => setTimeout(r, DELAY));
  }
  console.log(JSON.stringify({ from: F, to: T, done, failed }, null, 2));
})().catch(e => {
  console.error(e);
  process.exit(1);
});
