"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectPill from "@/components/ConnectPill";
import Image from "next/image";

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Mint" },
    { href: "/my", label: "My Bot" },
  ];

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#0b0d12]/70 border-b border-white/10">
      <div className="container flex items-center justify-between py-3 px-4">
        {/* Left section: logo + title + nav pills */}
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/logo.PNG"
                alt="Basebots"
                fill
                sizes="32px"
                className="object-contain rounded-md"
              />
            </div>
            <span
              className={[
                "tracking-wide font-extrabold",
                "text-transparent bg-clip-text",
                "bg-gradient-to-r from-[#86b6ff] via-[#5bb1ff] to-[#79ffe1]",
                "drop-shadow-[0_2px_8px_rgba(121,255,225,.25)]",
                "text-lg md:text-2xl",
              ].join(" ")}
            >
              BASEBOTS
            </span>
          </Link>

          {/* Pills */}
          <div className="flex gap-2">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-pill text-sm font-semibold ${active ? "nav-pill--active" : ""}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: connect pill (single global location) */}
        <ConnectPill />
      </div>
    </nav>
  );
}
