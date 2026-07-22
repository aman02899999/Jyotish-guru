"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Consult" },
  { href: "/reports", label: "My Reports" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-white/5 bg-deep-midnight/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={data ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="text-xl">🕉️</span>
          <span className="text-lg font-extrabold tracking-wide text-celestial-gold">Adi Jyotish Gurus</span>
        </Link>

        {status === "authenticated" ? (
          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-bold sm:text-sm",
                  pathname?.startsWith(link.href)
                    ? "bg-celestial-gold/15 text-celestial-gold"
                    : "text-space-lavender hover:text-galactic-white"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Log out
            </Button>
          </nav>
        ) : status === "unauthenticated" ? (
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-semibold text-space-lavender hover:text-galactic-white">
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Get Started
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
