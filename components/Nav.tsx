// components/Nav.tsx (snippet)
import Link from "next/link";
export default function Nav() {
  return (
    <nav className="p-4 flex gap-4">
      <Link href="/">Mint</Link>
      <Link href="/my">My Pet</Link>
    </nav>
  );
}
