"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { SupabaseProvider } from "./supabase-provider";
import { UserProvider } from "./user-provider";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <SupabaseProvider>
          <UserProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'white',
                  color: '#0f0f0f',
                },
                success: {
                  style: {
                    background: 'white',
                    color: '#0f0f0f',
                  },
                },
                error: {
                  style: {
                    background: 'white',
                    color: '#0f0f0f',
                  },
                },
                loading: {
                  style: {
                    background: 'white',
                    color: '#0f0f0f',
                  },
                },
              }}
            />
          </UserProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

