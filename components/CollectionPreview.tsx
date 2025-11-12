"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const bots = [
  { id: 1, src: "/bot-1.PNG", name: "Basebot #1" },
  { id: 2, src: "/bot-2.PNG", name: "Basebot #2" },
  { id: 3, src: "/bot-3.PNG", name: "Basebot #3" },
  { id: 4, src: "/bot-4.PNG", name: "Basebot #4" },
];

export default function CollectionPreview() {
  return (
    <section className="w-full py-16 bg-[#0b0e14] text-zinc-100 flex flex-col items-center">
      {/* Title: bolder / nicer */}
      <h2 className="text-center font-extrabold tracking-tight text-4xl md:text-5xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_6px_20px_rgba(0,0,0,.35)]">
        Collection Preview
      </h2>
      <div
        aria-hidden
        className="mt-3 h-1 w-40 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70"
      />

      {/* Grid: always 2x2; smaller cards with comfy gaps */}
      <div className="mt-10 grid grid-cols-2 gap-8 max-w-3xl px-6 place-items-center">
        {bots.map((bot) => (
          <motion.div
            key={bot.id}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="w-40 md:w-48 aspect-square rounded-2xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-lg hover:shadow-cyan-500/10 overflow-hidden"
          >
            <div className="relative h-full w-full p-3">
              <Image
                src={bot.src}
                alt={bot.name}
                width={512}
                height={512}
                className="h-full w-full object-cover rounded-xl"
                priority={false}
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-black/0 hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-2 left-3 right-3 text-xs md:text-sm text-zinc-300/90 truncate">
                {bot.name}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
