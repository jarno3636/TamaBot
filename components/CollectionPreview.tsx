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
    <section className="w-full py-14 bg-[#0b0e14] text-zinc-100 flex flex-col items-center">
      {/* Title */}
      <h2 className="text-center font-extrabold tracking-tight text-3xl md:text-4xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_6px_20px_rgba(0,0,0,.35)]">
        Collection Preview
      </h2>
      <div
        aria-hidden
        className="mt-2 h-1 w-32 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70"
      />

      {/* Grid 2x2 */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:gap-6 place-items-center">
        {bots.map((bot) => (
          <motion.div
            key={bot.id}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="w-28 h-28 md:w-40 md:h-40 rounded-xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-md hover:shadow-cyan-500/10 overflow-hidden"
          >
            <Image
              src={bot.src}
              alt={`Basebot ${bot.id}`}
              width={256}
              height={256}
              className="h-full w-full object-contain"
              priority={false}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
