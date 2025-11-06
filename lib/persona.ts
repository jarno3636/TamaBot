// lib/persona.ts
export type PersonaOut = { label: string; bio: string };

export function buildPersonaPrompt(state: any, archetypeName: string) {
  return `You are TamaBot stylist.
On-chain state: ${JSON.stringify(state)}
Archetype: ${archetypeName}

Write JSON with keys:
- "label": short 2-5 word vibe tag (no emojis)
- "bio": 1-2 sentences, wholesome, <220 chars, no hashtags

Tune tips by weakest stats (mood/hunger/energy/cleanliness). Keep it positive.`;
}

export async function generatePersonaText(state: any, archetypeName: string, key = process.env.OPENAI_API_KEY): Promise<PersonaOut> {
  if (!key) return { label: "Chill Wanderer", bio: "A gentle bot discovering Farcaster, growing brighter with each cast." };
  const body = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: buildPersonaPrompt(state, archetypeName) }],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 220,
  });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body,
  });
  const j = await r.json().catch(() => ({}));
  const raw = j?.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      label: String(parsed.label || "Bright Buddy"),
      bio: String(parsed.bio || "A cheerful bot tuned to your vibe."),
    };
  } catch {
    return { label: "Bright Buddy", bio: "A cheerful bot tuned to your vibe." };
  }
}
