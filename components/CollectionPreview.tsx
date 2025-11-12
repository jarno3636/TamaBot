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
      {/* Glass tile wrapper like the rest of the app */}
      <div className="glass glass-pad w-full max-w-xl md:max-w-2xl">
        {/* Title - increased font size and subtle glow */}
        <h2 className="text-center font-extrabold tracking-tight text-4xl md:text-5xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_8px_25px_rgba(0,0,0,.45)]">
          Collection Preview
        </h2>
        <div
          aria-hidden
          className="mx-auto mt-3 mb-8 h-1 w-36 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70"
        />

        {/* Always 2x2; smaller bots with good spacing */}
        <div className="grid grid-cols-2 gap-5 md:gap-8 place-items-center">
          {bots.map((bot) => (
            <motion.div
              key={bot.id}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="w-28 h-28 md:w-36 md:h-36 rounded-xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-md hover:shadow-cyan-500/10 overflow-hidden"
            >
              <div className="relative h-full w-full p-2">
                <Image
                  src={bot.src}
                  alt={`Basebot ${bot.id}`}
                  width={256}
                  height={256}
                  sizes="(max-width: 768px) 120px, 144px"
                  className="h-full w-full object-contain rounded-lg"
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
