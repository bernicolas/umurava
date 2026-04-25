import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
   display: "swap",
   preload: false,
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
   display: "swap",
   preload: false,
});

export const metadata: Metadata = {
   title: "Umurava HR — AI Talent Screening",
   description:
      "AI-powered recruiter dashboard for screening and shortlisting candidates",
};

export default function RootLayout({
   children,
}: Readonly<{ children: React.ReactNode }>) {
   return (
      <html
         lang="en"
         suppressHydrationWarning
      >
         <body
            className={`${geistSans.variable} ${geistMono.variable} font-sans`}
             suppressHydrationWarning
         >
            <Providers>{children}</Providers>
         </body>
      </html>
   );
}
