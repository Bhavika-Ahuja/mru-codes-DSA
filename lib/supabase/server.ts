import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

// Create Supabase client for server-side auth operations
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set cookies with extended expiration (30 days)
              const cookieOptions = options as {
                maxAge?: number;
                expires?: Date;
                httpOnly?: boolean;
                secure?: boolean;
                sameSite?: "strict" | "lax" | "none";
                path?: string;
              } || {};

              // Set standard cookie options for persistent sessions
              cookieStore.set(name, value, {
                ...cookieOptions,
                maxAge: cookieOptions.maxAge || 60 * 60 * 24 * 30, // 30 days default
                httpOnly: cookieOptions.httpOnly ?? true,
                secure: cookieOptions.secure ?? process.env.NODE_ENV === "production",
                sameSite: cookieOptions.sameSite ?? "lax",
                path: cookieOptions.path ?? "/",
              });
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Get the current authenticated user from Supabase Auth
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// Get the current user's profile from Prisma
export async function getProfile() {
  const user = await getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  return profile;
}

// Get profile with additional data
export async function getProfileWithStats() {
  const user = await getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: {
      _count: {
        select: {
          submissions: true,
          sessionParticipations: true,
        },
      },
    },
  });

  return profile;
}
