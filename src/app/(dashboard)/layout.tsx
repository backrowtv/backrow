import { connection } from "next/server";
import { EmailVerificationBannerClient } from "@/components/auth/EmailVerificationBannerClient";
import { ServiceWorkerRegistrar } from "@/components/system/ServiceWorkerRegistrar";

/**
 * Dashboard layout - wraps all authenticated pages.
 *
 * `await connection()` opts the subtree out of cacheComponents prerender.
 * Every dashboard page reads the Supabase session from cookies, which is
 * inherently dynamic; without this opt-out the build fails with
 * "Uncached data was accessed outside of <Suspense>" on every route.
 *
 * Email verification is handled client-side via EmailVerificationBannerClient
 * to avoid re-triggering server auth checks on every navigation.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <>
      <EmailVerificationBannerClient />
      <ServiceWorkerRegistrar />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}
