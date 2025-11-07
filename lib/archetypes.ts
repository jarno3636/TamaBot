// lib/archetypes.ts

// ---------- Types ----------
export type Archetype = {
  id: string;
  name: string;        // Display name, e.g. "PandaBot"
  baseColor: string;   // Primary color
  accentColor: string; // Secondary / trim color
  aura?: string;       // Optional soft glow / rim-light tint
};

export type PickedLook = {
  archetype: Archetype;
  biome: typeof BIOMES[number];
  accessory: typeof ACCESSORIES[number];
  base: string;    // jittered base color (hex)
  accent: string;  // jittered accent color (hex)
  aura: string;    // final aura color (hex)
};

// ---------- Core Archetypes (keep this list large & varied) ----------
export const ARCHETYPES: Archetype[] = [
  { id: "panda",     name: "PandaBot",     baseColor: "#E8DFD3", accentColor: "#2B2B2B", aura: "#9AA0A6" },
  { id: "frog",      name: "FrogBot",      baseColor: "#49D27A", accentColor: "#0B8E5C", aura: "#92F5B8" },
  { id: "owl",       name: "OwlBot",       baseColor: "#8C6A4A", accentColor: "#362515", aura: "#C7A07C" },
  { id: "fox",       name: "FoxBot",       baseColor: "#F1732F", accentColor: "#5A2F12", aura: "#FFD1B3" },
  { id: "tiger",     name: "TigerBot",     baseColor: "#F59E0B", accentColor: "#1F2937", aura: "#FFE8B2" },
  { id: "bear",      name: "BearBot",      baseColor: "#7A5B45", accentColor: "#2C1E13", aura: "#B59175" },
  { id: "wolf",      name: "WolfBot",      baseColor: "#9AA4B2", accentColor: "#303946", aura: "#C9D1D9" },
  { id: "bunny",     name: "BunnyBot",     baseColor: "#F6DDE7", accentColor: "#6B7280", aura: "#FFDFF0" },
  { id: "cat",       name: "CatBot",       baseColor: "#D2D2D2", accentColor: "#1F2937", aura: "#EAEAEA" },
  { id: "dog",       name: "DogBot",       baseColor: "#C59A6B", accentColor: "#3A2A1C", aura: "#E8C29A" },
  { id: "koala",     name: "KoalaBot",     baseColor: "#B7BFC8", accentColor: "#4B5563", aura: "#D6DCE2" },
  { id: "sloth",     name: "SlothBot",     baseColor: "#9C826B", accentColor: "#3C2F25", aura: "#C4AB96" },
  { id: "raccoon",   name: "RaccoonBot",   baseColor: "#BEBFC4", accentColor: "#2F343B", aura: "#E0E1E4" },
  { id: "penguin",   name: "PenguinBot",   baseColor: "#161E2E", accentColor: "#F5F6F7", aura: "#9BD6FF" },
  { id: "seal",      name: "SealBot",      baseColor: "#DDE6EF", accentColor: "#657587", aura: "#F0F6FC" },
  { id: "otter",     name: "OtterBot",     baseColor: "#8A5E3A", accentColor: "#2E1C10", aura: "#C7966E" },
  { id: "whale",     name: "WhaleBot",     baseColor: "#3A5A8C", accentColor: "#0A2340", aura: "#6FA3FF" },
  { id: "dolphin",   name: "DolphinBot",   baseColor: "#67B7D1", accentColor: "#2B6E87", aura: "#A9E7FF" },
  { id: "shark",     name: "SharkBot",     baseColor: "#8AA0B2", accentColor: "#1D2B38", aura: "#CFE6FF" },
  { id: "crab",      name: "CrabBot",      baseColor: "#E3574F", accentColor: "#5A1D1B", aura: "#FF9C96" },
  { id: "turtle",    name: "TurtleBot",    baseColor: "#66A86D", accentColor: "#2D5A31", aura: "#B0E3B6" },
  { id: "lizard",    name: "LizardBot",    baseColor: "#84CC16", accentColor: "#365314", aura: "#D9F99D" },
  { id: "dragon",    name: "DragonBot",    baseColor: "#9B5DE5", accentColor: "#3A1C65", aura: "#D8B4FE" },
  { id: "phoenix",   name: "PhoenixBot",   baseColor: "#F97316", accentColor: "#7C2D12", aura: "#FFD29A" },
  { id: "griffin",   name: "GriffinBot",   baseColor: "#D4AF37", accentColor: "#4A3421", aura: "#FFE68B" },
  { id: "unicorn",   name: "UnicornBot",   baseColor: "#F5E1FF", accentColor: "#7C3AED", aura: "#F0ABFC" },
  { id: "rhino",     name: "RhinoBot",     baseColor: "#A0A6AD", accentColor: "#2D3748", aura: "#D5DADF" },
  { id: "hippo",     name: "HippoBot",     baseColor: "#9BA4B5", accentColor: "#3F4B5B", aura: "#C4CCDA" },
  { id: "giraffe",   name: "GiraffeBot",   baseColor: "#E7B566", accentColor: "#5A3A16", aura: "#FFE3AE" },
  { id: "elephant",  name: "ElephantBot",  baseColor: "#B8C2CC", accentColor: "#374151", aura: "#E2E8F0" },
  { id: "zebra",     name: "ZebraBot",     baseColor: "#F5F5F5", accentColor: "#111827", aura: "#D1D5DB" },
  { id: "camel",     name: "CamelBot",     baseColor: "#D0A266", accentColor: "#5A3B1E", aura: "#F0CFA0" },
  { id: "moose",     name: "MooseBot",     baseColor: "#7A4F36", accentColor: "#26170F", aura: "#B98A6D" },
  { id: "buffalo",   name: "BuffaloBot",   baseColor: "#6B4E3D", accentColor: "#241A14", aura: "#A98571" },
  { id: "goat",      name: "GoatBot",      baseColor: "#D6D6D6", accentColor: "#3F3F46", aura: "#EEEEEE" },
  { id: "ram",       name: "RamBot",       baseColor: "#C8B08E", accentColor: "#4B3A25", aura: "#E9D8B4" },
  { id: "boar",      name: "BoarBot",      baseColor: "#8B5C47", accentColor: "#2E1C16", aura: "#C4937D" },
  { id: "hawk",      name: "HawkBot",      baseColor: "#B0895B", accentColor: "#3C2A18", aura: "#E6C49A" },
  { id: "eagle",     name: "EagleBot",     baseColor: "#C9A87B", accentColor: "#1F2937", aura: "#F3D9B5" },
  { id: "parrot",    name: "ParrotBot",    baseColor: "#3CCB7F", accentColor: "#C81E1E", aura: "#9BF8CE" },
  { id: "flamingo",  name: "FlamingoBot",  baseColor: "#FFA3B1", accentColor: "#7A2840", aura: "#FFD7E0" },
  { id: "peacock",   name: "PeacockBot",   baseColor: "#138D90", accentColor: "#0B3A3B", aura: "#53E0E5" },
  { id: "swan",      name: "SwanBot",      baseColor: "#F7FAFC", accentColor: "#94A3B8", aura: "#E2E8F0" },
  { id: "bee",       name: "BeeBot",       baseColor: "#FBBF24", accentColor: "#111827", aura: "#FFE58F" },
  { id: "butterfly", name: "ButterflyBot", baseColor: "#06B6D4", accentColor: "#7C3AED", aura: "#BCEBFF" },
  { id: "ant",       name: "AntBot",       baseColor: "#6B7280", accentColor: "#111827", aura: "#CBD5E1" },
  { id: "ladybug",   name: "LadybugBot",   baseColor: "#EF4444", accentColor: "#111827", aura: "#FFB4B4" },
  { id: "gecko",     name: "GeckoBot",     baseColor: "#7DD3FC", accentColor: "#155E75", aura: "#CFF0FF" },
  { id: "axolotl",   name: "AxolotlBot",   baseColor: "#FBD1D7", accentColor: "#7C2D12", aura: "#FFE6EB" },
];

// ---------- Deterministic Hash ----------
function hash32(s: string | number) {
  const str = String(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- Pickers ----------
export function pickArchetypeForFid(fid: number): Archetype {
  const idx = hash32(fid) % ARCHETYPES.length;
  return ARCHETYPES[idx];
}

// Subtle per-FID color jitter to avoid identical-looking runs
export function jitterColor(hex: string, seed: number, amt = 6): string {
  const h = hash32(`${seed}:${hex}`); // string salt to avoid numeric literal pitfalls
  const [r, g, b] = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const j = (n: number, off: number) =>
    Math.max(0, Math.min(255, n + (((h >> off) & 0xff) % (amt * 2) - amt)));
  const R = j(r, 0), G = j(g, 8), B = j(b, 16);
  return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
}

// ---------- Micro-traits ----------
export const BIOMES = [
  "forest", "bamboo", "tundra", "desert", "reef",
  "nebula", "volcanic", "moonlit", "neon", "rainy",
] as const;

export const ACCESSORIES = [
  "bandana", "goggles", "ear-tag", "antenna", "tiny-backpack",
  "wrist-band", "halo", "neck-bell", "leaf-cape", "utility-belt",
] as const;

// Deterministic full look (no RNG) from FID
export function pickLook(fid: number): PickedLook {
  const arch = pickArchetypeForFid(fid);
  // Use string-salted hashing — no invalid hex literals:
  const biome = BIOMES[hash32(`${fid}-biome`) % BIOMES.length];
  const accessory = ACCESSORIES[hash32(`${fid}-acc`) % ACCESSORIES.length];
  const base = jitterColor(arch.baseColor, fid, 8);
  const accent = jitterColor(arch.accentColor, fid, 8);
  const aura = arch.aura ?? "#FFFFFF";
  return { archetype: arch, biome, accessory, base, accent, aura };
}

// ---------- Prompt Builder ----------
export function buildArtPrompt(look: PickedLook) {
  return [
    `Cel-shaded, cute ${look.archetype.name} in ${look.biome} biome, full-body,`,
    `consistent collection style, minimal clean background, soft rim light ${look.aura},`,
    `primary color ${look.base}, accent ${look.accent}, small ${look.accessory} accessory,`,
    `clean linework, subtle shadow under feet, centered, 2000x2000, transparent background.`,
  ].join(" ");
}
