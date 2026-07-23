import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sessions = await prisma.reportSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display mb-6 text-2xl font-semibold tracking-wide text-celestial-gold">My Consultations</h1>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-4xl">🌙</span>
          <p className="text-sm text-space-lavender">No consultation logs found in the stars.</p>
          <Link href="/dashboard" className="mt-2 text-xs font-bold text-celestial-gold hover:underline">
            Pick an astrologer to begin
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/session/${session.id}`}>
              <Card className="flex items-center gap-4 p-4 transition-colors hover:border-celestial-gold/40">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-celestial-gold/40 bg-gradient-to-br from-soft-plum to-dark-space-purple text-xl">
                  {session.specialty.includes("Marriage") ? "💑" : "🔮"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold text-galactic-white">{session.astrologerName}</p>
                    <Badge variant={session.isPaid ? "success" : "muted"}>
                      {session.isPaid ? "Paid" : "Locked"}
                    </Badge>
                  </div>
                  <p className="text-xs text-celestial-gold">{session.specialty}</p>
                  <p className="mt-1 text-[10px] text-space-lavender">
                    {new Date(session.createdAt).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
