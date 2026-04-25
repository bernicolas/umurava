"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
   Toast,
   ToastClose,
   ToastDescription,
   ToastProvider,
   ToastTitle,
   ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
   const { toasts } = useToast();

   return (
      <ToastProvider>
         {toasts.map(({ id, title, description, action, ...props }) => {
            const isDestructive = props.variant === "destructive";
            return (
               <Toast
                  key={id}
                  {...props}
               >
                  {/* Icon */}
                  <div className="shrink-0 pt-0.5">
                     {isDestructive ? (
                        <XCircle className="h-4.5 w-4.5 text-red-500" />
                     ) : (
                        <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                     )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                     {title && <ToastTitle>{title}</ToastTitle>}
                     {description && (
                        <ToastDescription>{description}</ToastDescription>
                     )}
                  </div>

                  {action}
                  <ToastClose />
               </Toast>
            );
         })}
         <ToastViewport />
      </ToastProvider>
   );
}
