// lib/persona.ts

export type PersonaOut = {
  name: string;   // New short unique-ish bot name
  label: string;  // Vibe tag (2–5 words)
  bio: string;    // Wholesome summary
};

/** Build OpenAI persona-generation prompt */
export function buildPersonaPrompt(state: any, archetypeName: string) {
  return `You are TamaBot stylist.
On-chain state: ${JSON.stringify(state)}
Archetype: ${archetypeName}

Return compact JSON with these keys:
- "name": short unique-ish name (2–10 chars), feels alive (no numbers/emojis)
- "label": 2–5 word vibe tag describing the bot’s mood/personality
- "bio": 1–2 sentences, wholesome, <220 chars, no hashtags

In "bio", mention gentle encouragement or care tips tuned by weakest stats (mood, hunger, energy, cleanliness).
Keep it positive and imaginative but natural.`;
}

/** Generate persona with name, label, and bio */
export async function generatePersonaText(
  state: any,
  archetypeName: string,
  key = process.env.OPENAI_API_KEY
): Promise<PersonaOut> {
  if (!key) {
    return {
      name: "Nomi",
      label: "Chill Wanderer",
      bio: "A gentle bot discovering Farcaster, growing brighter with each cast.",
    };
  }

  const body = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: buildPersonaPrompt(state, archetypeName) }],
    response_format: { type: "json_object" },
    temperature: 0.65,
    max_tokens: 240,
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
      name: String(parsed.name || "Tama"),
      label: String(parsed.label || "Bright Buddy"),
      bio: String(parsed.bio || "A cheerful bot tuned to your vibe."),
    };
  } catch {
    return {
      name: "Tama",
      label: "Bright Buddy",
      bio: "A cheerful bot tuned to your vibe.",
    };
  }
}
