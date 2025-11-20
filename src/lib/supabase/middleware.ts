import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication - redirect to sign-in if not authenticated.
// NOTE: /club, /movies, /discover, /person intentionally omitted so crawlers and
// anonymous visitors can see metadata + OG + JSON-LD. Each of those pages handles
// the anon case itself (public → view-only landing, private → redirect).
const PROTECTED_ROUTES = [
  "/clubs",
  "/profile",
  "/activity",
  "/calendar",
  "/search",
  "/admin",
  "/timeline",
];

// Routes that should redirect TO dashboard if already authenticated
const AUTH_ROUTES = ["/sign-in", "/sign-up", "/forgot-password"];

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use getSession() here - it doesn't revalidate the Auth token.
  // Use getUser() which sends a request to Supabase Auth to validate and refresh the token.
  // This is critical for ensuring the session is valid after login redirect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Block authenticated users whose account has been soft-deleted: sign them
  // out and redirect to the landing page with a banner. The grace window runs
  // until the account-hard-delete job fires (30 days after POST /api/account/delete).
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("deleted_at")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.deleted_at) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "?deleted=1";
      return NextResponse.redirect(url);
    }
  }

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  // Check if route is an auth route (sign-in, sign-up, etc.)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes to sign-in
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    // Store the original URL (with query params) so we can redirect back after sign-in
    const fullPath = pathname + request.nextUrl.search;
    url.searchParams.set("redirectTo", fullPath);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth routes to home (dashboard)
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
