"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { isFirebaseConfigured, signInWithGoogleAndGetIdToken } from "@/lib/firebase-client";

export function GoogleSignInButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFirebaseConfigured) return null;

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);
    try {
      const idToken = await signInWithGoogleAndGetIdToken();
      const result = await signIn("firebase-google", { idToken, redirect: false });
      if (result?.error) {
        setError("Google sign-in failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      // Includes the user closing the Google popup - not worth showing as an error.
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
        disabled={isSubmitting}
      >
        <GoogleIcon />
        {isSubmitting ? "Connecting..." : "Continue with Google"}
      </Button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
