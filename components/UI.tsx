// components/UI.tsx
"use client";
import Link from "next/link";

export function Pill({
  children, className = "", ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={[
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "text-sm font-semibold text-white/95",
        "bg-white/10 border border-white/20 backdrop-blur",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_22px_rgba(0,0,0,0.35)]",
        "hover:bg-white/15 transition-colors",
        className,
      ].join(" ")}
    />
  );
}

export function PillLink({
  href, active = false, children, onClick, className = "",
}: { href: string; active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
        "bg-white/12 border border-white/25 text-white/95 backdrop-blur",
        active
          ? "shadow-[0_0_0_2px_rgba(255,255,255,0.55),0_0_30px_6px_rgba(255,255,255,0.25)]"
          : "shadow-[0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/18",
        "transition",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function Card({
  children, className = "", ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={[
        "rounded-3xl p-6",
        "bg-white/7 border border-white/15 backdrop-blur-xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
