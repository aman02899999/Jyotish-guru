import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-celestial-gold/60 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:translate-y-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-[#f2dc8c] via-celestial-gold to-mystic-amber text-deep-midnight shadow-[0_10px_25px_-8px_rgba(212,175,55,0.55)] hover:shadow-[0_14px_32px_-8px_rgba(212,175,55,0.75)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_6px_16px_-8px_rgba(212,175,55,0.6)]",
        outline:
          "border border-celestial-gold/40 text-celestial-gold hover:bg-celestial-gold/10 hover:border-celestial-gold/70 hover:shadow-[0_0_24px_-6px_rgba(212,175,55,0.45)]",
        ghost: "text-space-lavender hover:bg-white/5 hover:text-galactic-white",
        destructive: "border border-red-500/40 text-red-400 hover:bg-red-500/10",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
