import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold", {
  variants: {
    variant: {
      gold: "bg-celestial-gold/15 text-celestial-gold border border-celestial-gold/40",
      success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      muted: "bg-white/5 text-space-lavender border border-space-lavender/20",
      rose: "bg-astral-rose/10 text-astral-rose border border-astral-rose/30",
    },
  },
  defaultVariants: { variant: "gold" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
