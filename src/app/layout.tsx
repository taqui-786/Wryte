import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const APP_NAME = "Wryte";
const APP_DESCRIPTION =
  "Wryte is an AI-powered writing assistant that helps you draft, edit, and refine documents effortlessly. Backed by a smart AI agent, real-time suggestions, and a distraction-free ProseMirror editor — write boldly, publish faster.";
const APP_URL = "https://wryte.vercel.app"; 

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — AI-Powered Writing Assistant`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "AI writing assistant",
    "AI editor",
    "content writer",
    "writing tool",
    "ProseMirror editor",
    "AI-powered editor",
    "document editor",
    "Wryte",
    "AI content creation",
    "smart writing",
    "drafting tool",
    "text editor",
  ],
  authors: [{ name: "Md Taqui Imam" }],
  creator: "Md Taqui Imam",
  publisher: "Md Taqui Imam",

  metadataBase: new URL(APP_URL),

  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — AI-Powered Writing Assistant`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/app_logo_img.png",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — Write Boldly with AI`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — AI-Powered Writing Assistant`,
    description: APP_DESCRIPTION,
    images: ["/app_logo_img.png"],
    creator: "@wrabornn",
  },

  icons: {
    icon: "/logo-short.png",
    shortcut: "/logo-short.png",
    apple: "/logo-short.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning={true}>
      <body className="antialiased">
        {children}
        <Toaster richColors={true} />
      </body>
    </html>
  );
}
