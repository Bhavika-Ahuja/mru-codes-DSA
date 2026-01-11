import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies with extended expiration (30 days) for persistent sessions
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = options as {
              maxAge?: number;
              expires?: Date;
              httpOnly?: boolean;
              secure?: boolean;
              sameSite?: "strict" | "lax" | "none";
              path?: string;
            } || {};

            supabaseResponse.cookies.set(name, value, {
              ...cookieOptions,
              maxAge: cookieOptions.maxAge || 60 * 60 * 24 * 30, // 30 days default
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app slow
  // to respond to users.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define route types
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy");

  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentRoute = pathname.startsWith("/student");

  // If user is not logged in and trying to access protected routes
  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in, handle role-based routing
  if (user) {
    // Fetch user profile to get role (needed for multiple checks)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // If the profile row doesn't exist yet (first login), fall back to Supabase user metadata.
    const metaRole = (user.user_metadata as { role?: unknown } | null)?.role;
    const userRole = profile?.role ?? (metaRole === "teacher" || metaRole === "student" ? metaRole : "student");

    // Redirect from auth pages to appropriate dashboard
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      if (userRole === "teacher") {
        url.pathname = "/teacher/dashboard";
      } else {
        url.pathname = "/student/dashboard";
      }
      return NextResponse.redirect(url);
    }

    // Redirect generic /dashboard to role-specific dashboard
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      const url = request.nextUrl.clone();
      if (userRole === "teacher") {
        url.pathname = pathname.replace("/dashboard", "/teacher/dashboard");
      } else {
        url.pathname = pathname.replace("/dashboard", "/student/dashboard");
      }
      return NextResponse.redirect(url);
    }

    // Role-based route protection
    // If a student tries to access teacher routes
    if (isTeacherRoute && userRole === "student") {
      const url = request.nextUrl.clone();
      url.pathname = "/student/dashboard";
      return NextResponse.redirect(url);
    }

    // If a teacher tries to access student routes
    if (isStudentRoute && userRole === "teacher") {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
