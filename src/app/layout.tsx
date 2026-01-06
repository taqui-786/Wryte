import type { Metadata } from "next";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Wryte",
  description: "AI-powered writing assistant that helps you create high-quality content faster.",
};

 

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable} >
     
      <body
        className={` antialiased`}
      >
        {children}
        <Toaster richColors={true} />
      </body>
    </html>
  );
}
