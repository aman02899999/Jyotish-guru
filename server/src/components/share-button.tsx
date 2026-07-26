"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateShareCard, shareOrDownloadImage, type ShareCardOptions } from "@/lib/share-card";

export function ShareButton({
  filename,
  options,
  label = "Share",
  className,
}: {
  filename: string;
  options: ShareCardOptions;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleShare() {
    setPending(true);
    try {
      const blob = await generateShareCard(options);
      await shareOrDownloadImage(blob, filename);
    } catch {
      // Best-effort feature - a failed render/share just leaves the button clickable again.
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare} disabled={pending} className={className}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
      {pending ? "Preparing..." : label}
    </Button>
  );
}
