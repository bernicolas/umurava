"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
   HTMLInputElement,
   React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
   <input
      type={type}
      className={cn(
         "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground",
         "placeholder:text-muted-foreground/60",
         "transition-colors duration-150",
         "hover:border-primary/50",
         "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15",
         "file:border-0 file:bg-transparent file:text-sm file:font-medium",
         "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
         className,
      )}
      ref={ref}
      {...props}
   />
));
Input.displayName = "Input";

export { Input };
