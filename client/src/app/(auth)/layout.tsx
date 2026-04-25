import Image from "next/image";

function UmuravaLogo({ className }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 52 36"
         fill="none"
         className={className}
      >
         {/* Right ring — C-shape opening to the upper-left */}
         <path
            d="M28 6 A 13 13 0 1 1 28 30"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
         />
         {/* Left ring — C-shape opening to the lower-right */}
         <path
            d="M24 30 A 13 13 0 1 1 24 6"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
         />
      </svg>
   );
}

const FEATURES = [
   "AI-powered candidate ranking with Gemini",
   "Upload CVs or sync platform profiles in seconds",
   "Weighted scoring: skills, experience & education",
   "Instant shortlist — no manual review needed",
];

export default function AuthLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
         {/* ── Brand panel (desktop only) ─────────────────────────── */}
         <div
            className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden text-white"
            style={{
               background:
                  "linear-gradient(145deg, hsl(224 90% 30%) 0%, hsl(218 87% 52%) 100%)",
            }}
         >
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/6" />
            <div className="pointer-events-none absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-white/6" />
            <div className="pointer-events-none absolute top-1/2 right-10 h-52 w-52 -translate-y-1/2 rounded-full bg-white/4" />
            {/* grid dots */}
            <div
               className="pointer-events-none absolute inset-0 opacity-[0.07]"
               style={{
                  backgroundImage:
                     "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
               }}
            />

            {/* Logo */}
            <div className="relative z-10 flex items-center gap-3">
               <UmuravaLogo className="h-8 w-14 text-white" />
               <div className="leading-tight">
                  <span className="font-bold text-xl tracking-wide text-white">
                     Umurava
                  </span>
                  <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
                     HR
                  </span>
               </div>
            </div>

            {/* Hero copy */}
            <div className="relative z-10 space-y-10">
               <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                     Powered by Gemini AI
                  </div>
                  <h1 className="text-4xl font-bold leading-[1.15] tracking-tight">
                     Hire smarter.
                     <br />
                     Screen faster.
                  </h1>
                  <p className="text-blue-200 text-base leading-relaxed max-w-xs">
                     Africa&apos;s intelligent talent screening platform — rank
                     and shortlist the best candidates in minutes, not days.
                  </p>
               </div>

               {/* Feature checklist */}
               <ul className="space-y-3">
                  {FEATURES.map((f) => (
                     <li
                        key={f}
                        className="flex items-center gap-3 text-sm text-blue-100"
                     >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                           <svg
                              viewBox="0 0 12 12"
                              fill="none"
                              className="h-3 w-3"
                           >
                              <path
                                 d="M2 6l3 3 5-5"
                                 stroke="currentColor"
                                 strokeWidth="1.5"
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                              />
                           </svg>
                        </span>
                        {f}
                     </li>
                  ))}
               </ul>

               {/* Stats row */}
               <div className="flex items-center gap-8 text-sm border-t border-white/15 pt-6">
                  {[
                     ["10×", "Faster screening"],
                     ["AI", "Scored profiles"],
                     ["100%", "Bias-free ranking"],
                  ].map(([val, label]) => (
                     <div key={label}>
                        <p className="text-2xl font-bold">{val}</p>
                        <p className="text-blue-300 text-xs mt-0.5">{label}</p>
                     </div>
                  ))}
               </div>
            </div>

            {/* Footer */}
            <p className="relative z-10 text-xs text-blue-400">
               © {new Date().getFullYear()} Umurava · Africa&apos;s Talent
               Marketplace
            </p>
         </div>

         {/* ── Form panel ─────────────────────────────────────────── */}
         <div className="flex items-center justify-center bg-background px-6 py-10 overflow-y-auto">
            <div className="w-full max-w-95">
               {/* Mobile logo — use the real PNG logo */}
               <div className="mb-8 flex items-center justify-center lg:hidden">
                  <Image
                     src="/logo.png"
                     alt="Umurava"
                     width={160}
                     height={48}
                     className="object-contain"
                     priority
                  />
               </div>

               {children}
            </div>
         </div>
      </div>
   );
}

