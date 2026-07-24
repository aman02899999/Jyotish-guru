"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMenuOpen(false);
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-saffron/10 bg-cream/75 shadow-[0_1px_0_0_rgba(234,88,12,0.08),0_12px_24px_-16px_rgba(42,27,18,0.15)] backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href={data ? "/dashboard" : "/"} className="group flex items-center gap-2 sm:gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-saffron/40 bg-gradient-to-br from-saffron/20 to-transparent text-base shadow-[0_0_16px_-4px_rgba(234,88,12,0.5)] transition-transform group-hover:scale-105">
            🕉️
          </span>
          <span className="font-display whitespace-nowrap text-sm font-semibold tracking-wide text-saffron sm:text-lg">
            Adi Jyotish Gurus
          </span>
        </Link>

        {status === "authenticated" ? (
          <>
            <nav className="hidden items-center gap-1 lg:flex lg:gap-2">
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
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-saffron hover:bg-saffron/10 lg:hidden"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </>
        ) : status === "unauthenticated" ? (
          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="hidden whitespace-nowrap text-sm font-semibold text-clay hover:text-ink sm:inline-block"
            >
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "whitespace-nowrap")}>
              Get Started
            </Link>
          </nav>
        ) : null}
      </div>

      {status === "authenticated" && isMenuOpen && (
        <nav className="border-t border-saffron/10 bg-paper px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                  pathname?.startsWith(link.href) ? "bg-saffron/15 text-saffron" : "text-clay hover:bg-saffron/5 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-1 rounded-xl px-4 py-3 text-left text-sm font-bold text-clay hover:bg-saffron/5 hover:text-ink"
            >
              Log out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
