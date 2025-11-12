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
      <div className="glass glass-pad w-full max-w-xl md:max-w-2xl">
        <h2 className="text-center font-extrabold tracking-tight text-4xl md:text-5xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
          Collection Preview
        </h2>
        <div aria-hidden className="mx-auto mt-3 mb-6 h-1 w-36 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70" />

        {/* hard 2×2 at all widths */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 justify-items-center">
          {bots.map((bot) => (
            <motion.div
              key={bot.id}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="aspect-square w-24 md:w-32 rounded-xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-md overflow-hidden"
            >
              <div className="relative h-full w-full p-2">
                <Image
                  src={bot.src}
                  alt={`Basebot ${bot.id}`}
                  fill
                  sizes="(max-width: 768px) 6rem, 8rem"
                  className="object-contain rounded-lg"
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
