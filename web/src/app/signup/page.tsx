"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { isFirebaseConfigured } from "@/lib/firebase-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created, but automatic login failed. Please log in manually.");
        setIsSubmitting(false);
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-celestial-gold/40 bg-gradient-to-br from-celestial-gold/20 via-soft-plum to-transparent text-3xl shadow-[0_0_30px_-6px_rgba(212,175,55,0.55)]">
            ✨
          </span>
          <CardTitle className="mt-3 text-xl">Begin Your Journey</CardTitle>
          <CardDescription>Create a free account - takes less than a minute.</CardDescription>
        </CardHeader>
        <CardContent>
          {isFirebaseConfigured && (
            <>
              <GoogleSignInButton />
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-space-lavender/15" />
                <span className="text-[10px] font-bold text-space-lavender/60">OR</span>
                <div className="h-px flex-1 bg-space-lavender/15" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-space-lavender">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-celestial-gold hover:underline">
              Log in
            </Link>
          </p>
          <p className="mt-4 text-center text-[10px] leading-relaxed text-space-lavender/70">
            By continuing you consent to receiving AI-generated astrological interpretations for
            guidance and entertainment purposes only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
