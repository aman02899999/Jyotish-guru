"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Consult" },
  { href: "/compatibility", label: "Kundli Milan" },
  { href: "/muhurat", label: "Muhurat" },
  { href: "/reports", label: "My Reports" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-saffron/10 bg-cream/75 shadow-[0_1px_0_0_rgba(234,88,12,0.08),0_12px_24px_-16px_rgba(42,27,18,0.15)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={data ? "/dashboard" : "/"} className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-saffron/40 bg-gradient-to-br from-saffron/20 to-transparent text-base shadow-[0_0_16px_-4px_rgba(234,88,12,0.5)] transition-transform group-hover:scale-105">
            🕉️
          </span>
          <span className="font-display text-lg font-semibold tracking-wide text-saffron">
            Adi Jyotish Gurus
          </span>
        </Link>

        {status === "authenticated" ? (
          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-bold transition-colors sm:text-sm",
                  pathname?.startsWith(link.href)
                    ? "bg-saffron/15 text-saffron shadow-[inset_0_0_0_1px_rgba(234,88,12,0.25)]"
                    : "text-clay hover:text-ink"
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
            <Link href="/login" className="text-sm font-semibold text-clay hover:text-ink">
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
