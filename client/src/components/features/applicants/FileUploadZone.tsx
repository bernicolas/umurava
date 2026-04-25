"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
   onFile: (file: File) => void;
   onFiles?: (files: File[]) => void; // for multi-file mode
   isLoading?: boolean;
   accept?: Record<string, string[]>;
   multiple?: boolean;
   maxFiles?: number;
}

export function FileUploadZone({
   onFile,
   onFiles,
   isLoading,
   accept,
   multiple = false,
   maxFiles = 1,
}: FileUploadZoneProps) {
   const onDrop = useCallback(
      (accepted: File[]) => {
         if (!accepted.length) return;
         if (multiple && onFiles) {
            onFiles(accepted);
         } else {
            if (accepted[0]) onFile(accepted[0]);
         }
      },
      [onFile, onFiles, multiple],
   );

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple,
      maxFiles,
      accept: accept ?? {
         "text/csv": [".csv"],
         "application/vnd.ms-excel": [".xls"],
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      },
      disabled: isLoading,
   });

   const isPdf = !!accept?.["application/pdf"];

   return (
      <div
         {...getRootProps()}
         className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors",
            isDragActive
               ? "border-primary bg-primary/5"
               : "border-border hover:border-primary/50",
            isLoading && "opacity-50 cursor-not-allowed",
         )}
      >
         <input {...getInputProps()} />
         <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {isDragActive ? (
               <UploadCloud className="h-6 w-6 text-primary animate-bounce" />
            ) : (
               <FileText className="h-6 w-6 text-primary" />
            )}
         </div>
         <div className="text-center">
            <p className="text-sm font-medium">
               {isDragActive
                  ? "Drop them here"
                  : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
               {isPdf
                  ? `PDF only — up to ${maxFiles} file${maxFiles !== 1 ? "s" : ""}, max 10 MB each`
                  : "CSV, XLS, XLSX — max 10 MB"}
            </p>
         </div>
      </div>
   );
}