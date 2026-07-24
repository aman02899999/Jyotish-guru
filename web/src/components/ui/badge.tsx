import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
  {
    variants: {
      variant: {
        gold: "bg-saffron/15 text-saffron border border-saffron/40 shadow-[0_0_12px_-4px_rgba(234,88,12,0.5)]",
        success: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
        muted: "bg-ink/5 text-clay border border-clay/20",
        rose: "bg-rust/10 text-rust border border-rust/30",
      },
    },
    defaultVariants: { variant: "gold" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
