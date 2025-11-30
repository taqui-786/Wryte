"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
export function Provider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient());

  return (
    <NuqsAdapter>
      <QueryClientProvider client={client}><Suspense fallback={null}>{children}</Suspense></QueryClientProvider>
    </NuqsAdapter>
  );
}
