"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef<
   HTMLInputElement,
   React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
   const [visible, setVisible] = React.useState(false);

   return (
      <div className="relative">
         <input
            type={visible ? "text" : "password"}
            className={cn(
               "flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 pr-11 text-sm text-foreground",
               "placeholder:text-muted-foreground/60",
               "transition-colors duration-150",
               "hover:border-primary/50",
               "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15",
               "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
               className,
            )}
            ref={ref}
            {...props}
         />
         <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
            className={cn(
               "absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5",
               "text-muted-foreground hover:text-foreground transition-colors",
            )}
         >
            {visible ? (
               <EyeOff className="h-4 w-4" />
            ) : (
               <Eye className="h-4 w-4" />
            )}
         </button>
      </div>
   );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
