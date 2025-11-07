// app/api/pet/generate/route.ts
import { NextResponse } from "next/server";
import { ARCHETYPES } from "@/lib/archetypes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { fid, neynarProfile } = await req.json();

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing OpenAI key" }, { status: 500 });
  }

  // Present a compact list of archetypes (id + name). The model can infer from profile data.
  const archetypeList = ARCHETYPES
    .map((a) => `- id: ${a.id}, name: ${a.name}`)
    .join("\n");

  const archetypePrompt = `
You are an AI assigning a creature archetype for a Farcaster user based on their profile & activity.

User data (JSON):
${JSON.stringify(neynarProfile, null, 2)}

Available archetypes:
${archetypeList}

Rules:
- Pick exactly ONE archetype id from the list above.
- Consider things like post frequency, tone, interests, bio keywords, follower/following, engagement.
- Return only valid JSON with keys: id, reason, personality
  - "id": string (must match one of the listed ids)
  - "reason": short explanation (<= 140 chars)
  - "personality": short vibe/personality line (<= 100 chars)

Respond with JSON only.
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: archetypePrompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 300,
    }),
  });

  const j = await res.json().catch(() => ({}));
  const content = j?.choices?.[0]?.message?.content || "{}";

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { id: ARCHETYPES[0]?.id || "panda", reason: "fallback", personality: "curious and friendly" };
  }

  return NextResponse.json(parsed);
}
