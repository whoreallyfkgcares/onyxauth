import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Onyx — Sign in",
  description: "Authentication for the Onyx platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10">
          <Image
            src="/gradient.png"
            alt=""
            width={2165}
            height={480}
            className="h-auto w-full select-none"
            priority
          />
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
