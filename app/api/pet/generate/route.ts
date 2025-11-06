// app/api/pet/generate/route.ts
import { NextResponse } from "next/server";
import { ARCHETYPES } from "@/lib/archetypes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { fid, neynarProfile } = await req.json();

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing OpenAI key" }, { status: 500 });

  const archetypePrompt = `
You are an AI assigning a creature archetype based on this Farcaster user's data:
${JSON.stringify(neynarProfile, null, 2)}

Archetypes:
${ARCHETYPES.map((a) => `- ${a.name}: ${a.moodTags.join(", ")}`).join("\n")}

Pick ONE archetype that best matches their vibe. Respond with:
{
  "id": "<archetype_id>",
  "reason": "<why>",
  "personality": "<short personality>"
}
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: archetypePrompt }],
      temperature: 0.7,
    }),
  });
  const j = await res.json().catch(() => ({}));
  const content = j?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return NextResponse.json(parsed);
}
