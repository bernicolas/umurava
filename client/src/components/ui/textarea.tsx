"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
   HTMLTextAreaElement,
   React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
   <textarea
      className={cn(
         "flex min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground",
         "placeholder:text-muted-foreground/60",
         "transition-colors duration-150 resize-none",
         "hover:border-primary/50",
         "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15",
         "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
         className,
      )}
      ref={ref}
      {...props}
   />
));
Textarea.displayName = "Textarea";

export { Textarea };
