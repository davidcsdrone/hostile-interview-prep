import { NextResponse } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";

const NEXT_COOKIE = "hlt_auth_next";

/** Only allow same-origin relative paths (blocks open redirects). */
function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/signup")) return "/dashboard";
  if (value.startsWith("/auth/")) return "/dashboard";
  return value;
}

/**
 * Google (and other OAuth) lands here with ?code=...
 * Exchange the code for a session cookie, then send the user into the app.
 *
 * Important: redirectTo must be exactly /auth/callback (no query string).
 * Post-login destination is stored in the hlt_auth_next cookie by AuthForm.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const nextFromCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${NEXT_COOKIE}=`))
    ?.slice(NEXT_COOKIE.length + 1);

  const next = safeNextPath(nextFromCookie);

  const clearNextCookie = (response: NextResponse) => {
    response.cookies.set(NEXT_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (oauthError) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "oauth");
    return clearNextCookie(NextResponse.redirect(loginUrl));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return clearNextCookie(NextResponse.redirect(`${origin}${next}`));
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "oauth");
  return clearNextCookie(NextResponse.redirect(loginUrl));
}
