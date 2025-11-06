// lib/archetypes.ts
export type Archetype = {
  id: string;
  name: string;
  moodTags: string[];
  baseColor: string;
  accentColor: string;
  prompt: string; // base art prompt (cel-shaded, transparent bg)
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "panda",
    name: "PandaBot",
    moodTags: ["calm", "thoughtful", "sleepy", "wise"],
    baseColor: "#e6d5b8",
    accentColor: "#2b2b2b",
    prompt:
      "A gentle robotic panda, cel-shaded, glossy metal plates, teal glow, bamboo motif, front-facing, cute proportions, transparent background",
  },
  {
    id: "frog",
    name: "FrogBot",
    moodTags: ["happy", "energetic", "curious"],
    baseColor: "#4adb6d",
    accentColor: "#00995e",
    prompt:
      "A cheerful robotic frog, cel-shaded, smooth metal, subtle water highlights, front-facing, cute, transparent background",
  },
  {
    id: "owl",
    name: "OwlBot",
    moodTags: ["smart", "strategic", "mysterious"],
    baseColor: "#8c6a4a",
    accentColor: "#352a1a",
    prompt:
      "A wise robotic owl, cel-shaded, luminous circuitry in wings, front-facing, cute, transparent background",
  },
  {
    id: "fox",
    name: "FoxBot",
    moodTags: ["clever", "playful", "confident"],
    baseColor: "#f1732f",
    accentColor: "#4e2a08",
    prompt:
      "A slick robotic fox, cel-shaded, holographic tail accents, front-facing, cute, transparent background",
  },
];
