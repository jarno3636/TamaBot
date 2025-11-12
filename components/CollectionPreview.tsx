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
    <section className="w-full py-20 bg-[#0b0e14] text-zinc-100 flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-12 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
        Collection Preview
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl px-6">
        {bots.map((bot, i) => (
          <motion.div
            key={bot.id}
            whileHover={{ scale: 1.08, rotate: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
          >
            <Image
              src={bot.src}
              alt={bot.name}
              width={512}
              height={512}
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all"></div>
            <div className="absolute bottom-3 left-3 text-sm text-zinc-300">
              {bot.name}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
