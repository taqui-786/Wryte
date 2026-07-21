import type { Metadata } from "next";
import { Provider } from "./Provider";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin user management",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-dvh w-full">
      <Provider>{children}</Provider>
    </main>
  );
}
