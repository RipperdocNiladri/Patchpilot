"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname() || "";
  const match = pathname.match(/^\/repository\/([^/]+)\/([^/]+)/);
  const currentOwner = match ? match[1] : "fastapi-users";
  const currentRepo = match ? match[2] : "taskflow-api";

  const repoBase = `/repository/${currentOwner}/${currentRepo}`;

  const navLinks = [
    { label: "Landing", href: "/" },
    { label: "Overview", href: repoBase },
    { label: "Code Explorer", href: `${repoBase}/code` },
    { label: "Contributions", href: `${repoBase}/contributions` },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container h-14 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary-container text-white font-bold flex items-center justify-center text-sm shadow-xs">
            P
          </span>
          <span className="font-semibold text-base text-on-surface">PatchPilot</span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
            Beta
          </span>
        </Link>
      </div>
      <nav className="flex items-center gap-2 text-xs font-medium">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || (link.href !== repoBase && pathname.startsWith(link.href));
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-surface-container text-primary font-semibold"
                  : "hover:bg-surface-container text-on-surface-variant"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
