"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TrixEditor = dynamic(() => import("@/components/ui/TrixEditor"), {
   ssr: false,
});
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobFormData } from "@/types";

const schema = z.object({
   title: z.string().min(1, "Required"),
   description: z.string().min(1, "Required"),
   requirements: z.string().min(1, "Required"),
   requiredSkills: z
      .array(z.object({ value: z.string().min(1) }))
      .min(1, "Add at least one skill"),
   requiredExperience: z.coerce.number().min(0),
   location: z.string().min(1, "Required"),
   type: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
   shortlistSize: z.coerce
      .number()
      .transform(
         (v) =>
            ([5, 10, 15, 20, 30, 50].includes(v) ? v : 10) as
               | 5
               | 10
               | 15
               | 20
               | 30
               | 50,
      ),
});

type FormValues = z.infer<typeof schema>;

interface JobFormProps {
   defaultValues?: Partial<JobFormData>;
   /** Pre-selected shortlist size from settings */
   defaultShortlistSize?: 5 | 10 | 15 | 20 | 30 | 50;
   onSubmit: (data: JobFormData) => void;
   isSubmitting?: boolean;
   submitLabel?: string;
}

function FieldGroup({
   label,
   hint,
   error,
   children,
}: {
   label: string;
   hint?: string;
   error?: string;
   children: React.ReactNode;
}) {
   return (
      <div className="space-y-2">
         <div className="flex items-baseline justify-between">
            <Label>{label}</Label>
            {hint && (
               <span className="text-xs text-muted-foreground">{hint}</span>
            )}
         </div>
         {children}
         {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
   );
}

export function JobForm({
   defaultValues,
   defaultShortlistSize,
   onSubmit,
   isSubmitting,
   submitLabel = "Save Job",
}: JobFormProps) {
   const {
      register,
      handleSubmit,
      control,
      setValue,
      watch,
      formState: { errors },
   } = useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
         title: defaultValues?.title ?? "",
         description: defaultValues?.description ?? "",
         requirements: defaultValues?.requirements ?? "",
         requiredSkills: (defaultValues?.requiredSkills ?? []).map((s) => ({
            value: s,
         })),
         requiredExperience: defaultValues?.requiredExperience ?? 0,
         location: defaultValues?.location ?? "",
         type: defaultValues?.type ?? "Full-time",
         shortlistSize:
            defaultValues?.shortlistSize ?? defaultShortlistSize ?? 10,
      },
   });

   const { fields, append, remove } = useFieldArray({
      control,
      name: "requiredSkills",
   });

   const submit = (values: FormValues) => {
      onSubmit({
         ...values,
         requiredSkills: values.requiredSkills.map((s) => s.value),
      });
   };

   return (
      <form
         onSubmit={handleSubmit(submit)}
         className="space-y-8"
      >
         {/* ── Basic Info ── */}
         <section className="space-y-5">
            <div className="border-b pb-3">
               <h3 className="text-sm font-semibold text-foreground">
                  Basic Information
               </h3>
               <p className="text-xs text-muted-foreground mt-0.5">
                  What are you hiring for?
               </p>
            </div>

            <FieldGroup
               label="Job Title"
               error={errors.title?.message}
            >
               <Input
                  placeholder="e.g. Senior Backend Engineer"
                  {...register("title")}
               />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
               <FieldGroup
                  label="Location"
                  error={errors.location?.message}
               >
                  <Input
                     placeholder="e.g. Kigali, Rwanda"
                     {...register("location")}
                  />
               </FieldGroup>
               <FieldGroup label="Job Type">
                  <Select
                     defaultValue={watch("type")}
                     onValueChange={(v) =>
                        setValue("type", v as JobFormData["type"])
                     }
                  >
                     <SelectTrigger>
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {(
                           [
                              "Full-time",
                              "Part-time",
                              "Contract",
                              "Internship",
                           ] as const
                        ).map((t) => (
                           <SelectItem
                              key={t}
                              value={t}
                           >
                              {t}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </FieldGroup>
            </div>

            <FieldGroup
               label="Description"
               error={errors.description?.message}
            >
               <TrixEditor
                  value={watch("description")}
                  onChange={(v) =>
                     setValue("description", v, { shouldValidate: true })
                  }
                  placeholder="Describe the role, responsibilities, and what success looks like..."
               />
            </FieldGroup>

            <FieldGroup
               label="Requirements"
               error={errors.requirements?.message}
            >
               <TrixEditor
                  value={watch("requirements")}
                  onChange={(v) =>
                     setValue("requirements", v, { shouldValidate: true })
                  }
                  placeholder="List the must-have qualifications, education, certifications..."
               />
            </FieldGroup>
         </section>

         {/* ── Screening Criteria ── */}
         <section className="space-y-5">
            <div className="border-b pb-3">
               <h3 className="text-sm font-semibold text-foreground">
                  AI Screening Criteria
               </h3>
               <p className="text-xs text-muted-foreground mt-0.5">
                  Parameters Gemini uses to rank candidates
               </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FieldGroup
                  label="Min. Experience"
                  hint="years"
               >
                  <Input
                     type="number"
                     min={0}
                     {...register("requiredExperience")}
                  />
               </FieldGroup>
               <FieldGroup label="Shortlist Size">
                  <Select
                     defaultValue={String(watch("shortlistSize"))}
                     onValueChange={(v) =>
                        setValue(
                           "shortlistSize",
                           Number(v) as 5 | 10 | 15 | 20 | 30 | 50,
                        )
                     }
                  >
                     <SelectTrigger>
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="5">Top 5 candidates</SelectItem>
                        <SelectItem value="10">Top 10 candidates</SelectItem>
                        <SelectItem value="15">Top 15 candidates</SelectItem>
                        <SelectItem value="20">Top 20 candidates</SelectItem>
                        <SelectItem value="30">Top 30 candidates</SelectItem>
                        <SelectItem value="50">Top 50 candidates</SelectItem>
                     </SelectContent>
                  </Select>
               </FieldGroup>
            </div>

            <FieldGroup
               label="Required Skills"
               hint={`${fields.length} added`}
               error={
                  errors.requiredSkills ? "Add at least one skill" : undefined
               }
            >
               <div className="flex flex-wrap gap-2 min-h-11 rounded-lg border border-input bg-background p-2.5">
                  {fields.map((field, idx) => (
                     <span
                        key={field.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 pl-2.5 pr-1.5 py-1 text-xs font-medium text-primary"
                     >
                        <input
                           {...register(`requiredSkills.${idx}.value`)}
                           className="bg-transparent outline-none w-20 text-xs text-primary placeholder:text-primary/50"
                           placeholder="skill..."
                        />
                        <button
                           type="button"
                           onClick={() => remove(idx)}
                           className="cursor-pointer rounded hover:bg-primary/20 transition-colors p-0.5"
                        >
                           <X className="h-3 w-3" />
                        </button>
                     </span>
                  ))}
                  <button
                     type="button"
                     onClick={() => append({ value: "" })}
                     className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-input px-2.5 py-1 text-xs text-muted-foreground",
                        "hover:border-primary hover:text-primary transition-colors",
                     )}
                  >
                     <Plus className="h-3 w-3" />
                     Add skill
                  </button>
               </div>
            </FieldGroup>
         </section>

         <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full"
         >
            {isSubmitting ? (
               <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
               </>
            ) : (
               submitLabel
            )}
         </Button>
      </form>
   );
}
