// components/CollectionPreview.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const bots = [
  { id: 1, src: "/bot-1.PNG" },
  { id: 2, src: "/bot-2.PNG" },
  { id: 3, src: "/bot-3.PNG" },
  { id: 4, src: "/bot-4.PNG" },
];

export default function CollectionPreview() {
  return (
    <section className="w-full flex justify-center">
      <div className="glass glass-pad w-full max-w-md sm:max-w-lg md:max-w-2xl">
        {/* Title */}
        <h2 className="text-center font-extrabold tracking-tight text-3xl md:text-4xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
          Collection Preview
        </h2>
        <div
          aria-hidden
          className="mx-auto mt-3 mb-6 h-1 w-28 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70"
        />

        {/* Always 2x2 — flexbox is more reliable inside in-app Safari */}
        <div className="flex flex-wrap -mx-2 min-w-0">
          {bots.map((bot) => (
            <motion.div
              key={bot.id}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="w-1/2 px-2 mb-4 min-w-0"
            >
              <div className="aspect-square rounded-xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-md overflow-hidden flex items-center justify-center">
                <Image
                  src={bot.src}
                  alt={`Basebot ${bot.id}`}
                  width={512}
                  height={512}
                  className="object-contain w-full h-full p-2"
                  priority={false}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
