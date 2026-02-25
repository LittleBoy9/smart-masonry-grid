"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Masonry", desc: "100 items" },
  { href: "/virtual", label: "Virtual", desc: "up to 10k" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              active
                ? "bg-zinc-100 text-zinc-900 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {link.label}
            <span
              className={`ml-1.5 text-[10px] font-normal ${
                active ? "text-zinc-500" : "text-zinc-600"
              }`}
            >
              {link.desc}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
