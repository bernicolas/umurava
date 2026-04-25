"use client";

/**
 * Rich-text email body editor backed by Trix (https://trix-editor.org).
 * Must be loaded with `dynamic(..., { ssr: false })` because Trix uses
 * browser-only APIs (custom elements / document).
 */

import { useEffect, useId, useRef } from "react";
import "trix";
import "trix/dist/trix.css";
import { cn } from "@/lib/utils";

// ── React module augmentation for <trix-editor> web component ────────────────
declare module "react" {
   // eslint-disable-next-line @typescript-eslint/no-namespace
   namespace JSX {
      interface IntrinsicElements {
         "trix-editor": React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement> & {
               input?: string;
               placeholder?: string;
            },
            HTMLElement
         >;
      }
   }
}

interface TrixEditorProps {
   value: string;
   onChange: (html: string) => void;
   placeholder?: string;
   className?: string;
}

export default function TrixEditor({
   value,
   onChange,
   placeholder,
   className,
}: TrixEditorProps) {
   const inputId = useId();
   const editorRef = useRef<HTMLElement>(null);
   const onChangeRef = useRef(onChange);
   onChangeRef.current = onChange;
   const isInitialized = useRef(false);

   // Wire up trix-initialize and trix-change (runs once on mount)
   useEffect(() => {
      const el = editorRef.current as HTMLElement & {
         editor?: { loadHTML: (html: string) => void };
         innerHTML: string;
      };
      if (!el) return;

      const handleInit = () => {
         isInitialized.current = true;
         if (value) el.editor?.loadHTML(value);
      };

      const handleChange = () => {
         onChangeRef.current(el.innerHTML ?? "");
      };

      el.addEventListener("trix-initialize", handleInit);
      el.addEventListener("trix-change", handleChange);
      return () => {
         el.removeEventListener("trix-initialize", handleInit);
         el.removeEventListener("trix-change", handleChange);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Sync when external value changes (e.g. API load, reset to defaults)
   useEffect(() => {
      const el = editorRef.current as HTMLElement & {
         editor?: { loadHTML: (html: string) => void };
         innerHTML: string;
      };
      if (!el?.editor || !isInitialized.current) return;
      if (el.innerHTML !== value) {
         el.editor.loadHTML(value ?? "");
      }
   }, [value]);

   return (
      <div
         className={cn(
            "trix-wrapper rounded-lg border border-input overflow-hidden bg-background",
            className,
         )}
      >
         <input
            id={inputId}
            type="hidden"
            defaultValue={value}
         />
         <trix-editor
            ref={editorRef}
            input={inputId}
            placeholder={placeholder ?? "Write your email body…"}
         />
      </div>
   );
}
