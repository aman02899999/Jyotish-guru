import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-24 w-full rounded-xl border border-clay/30 bg-cream px-4 py-3 text-sm text-ink placeholder:text-clay/60 outline-none transition-colors focus:border-saffron disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
