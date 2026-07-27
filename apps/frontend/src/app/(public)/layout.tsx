import { ThemeProvider } from "@/components/theme-provider";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main className="min-h-dvh bg-background text-foreground">
        {children}
      </main>
    </ThemeProvider>
  );
}
