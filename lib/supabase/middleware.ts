import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type UserRole = "student" | "teacher";

function getUserRole(
  profileRole: string | null | undefined,
  metadataRole: unknown
): UserRole {
  if (profileRole === "teacher" || profileRole === "student") {
    return profileRole;
  }
  if (metadataRole === "teacher" || metadataRole === "student") {
    return metadataRole;
  }
  return "student";
}

function getDashboardPath(role: UserRole): string {
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = (options as {
              maxAge?: number;
              expires?: Date;
              httpOnly?: boolean;
              secure?: boolean;
              sameSite?: "strict" | "lax" | "none";
              path?: string;
            }) || {};

            supabaseResponse.cookies.set(name, value, {
              ...cookieOptions,
              maxAge: cookieOptions.maxAge || SESSION_COOKIE_MAX_AGE,
              httpOnly: cookieOptions.httpOnly ?? true,
              secure: cookieOptions.secure ?? process.env.NODE_ENV === "production",
              sameSite: cookieOptions.sameSite ?? "lax",
              path: cookieOptions.path ?? "/",
            });
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isPublicPage =
    pathname.startsWith("/api") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentRoute = pathname.startsWith("/student");

  if (!user && !isAuthPage && !isPublicPage && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const metaRole = (user.user_metadata as { role?: unknown } | null)?.role;
  const userRole = getUserRole(profile?.role, metaRole);
  const dashboardPath = getDashboardPath(userRole);

  // If already signed in and on landing page, go straight to dashboard
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  if (isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/dashboard", dashboardPath);
    return NextResponse.redirect(url);
  }

  if (isTeacherRoute && userRole === "student") {
    const url = request.nextUrl.clone();
    url.pathname = "/student/dashboard";
    return NextResponse.redirect(url);
  }

  if (isStudentRoute && userRole === "teacher") {
    const url = request.nextUrl.clone();
    url.pathname = "/teacher/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
