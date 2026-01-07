"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { SupabaseProvider } from "./supabase-provider";
import { UserProvider } from "./user-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SupabaseProvider>
          <UserProvider>
            {children}
            <Toaster richColors position="top-right" />
          </UserProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

