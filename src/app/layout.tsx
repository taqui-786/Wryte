import type { Metadata } from "next";
import { Montserrat, Fira_Code } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

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
    <html lang="en">
     
      <body
        className={`${montserrat.variable} ${firaCode.variable} antialiased`}
      >
        {children}
        <Toaster richColors={true} />
      </body>
    </html>
  );
}
