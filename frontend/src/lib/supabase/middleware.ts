import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the auth session from cookies and enforce the login gate.
 * Must return the supabaseResponse so refreshed cookies reach the browser.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Misconfigured env: fail closed for app pages, still allow auth pages
    const path = request.nextUrl.pathname;
    if (
      path === "/login" ||
      path === "/signup" ||
      path === "/auth/callback" ||
      path.startsWith("/auth/callback/")
    ) {
      return supabaseResponse;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "auth_config");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Do not insert logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isAuthCallback = path === "/auth/callback" || path.startsWith("/auth/callback/");
  const isProtected =
    path === "/" ||
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path.startsWith("/sessions/");

  // OAuth callback must stay public so the code can be exchanged for a session
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // Failed OAuth often lands on Site URL (/) with ?error=... — send to login, not interview
  const oauthFailed =
    request.nextUrl.searchParams.has("error") &&
    (request.nextUrl.searchParams.has("error_code") ||
      request.nextUrl.searchParams.has("error_description"));
  if (oauthFailed && (path === "/" || isAuthPage)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(loginUrl);
  }

  // Signed out on a protected page → login (keep return path)
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in on login/signup → dashboard
  if (user && isAuthPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
