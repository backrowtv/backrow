import { EmailVerificationBannerClient } from "@/components/auth/EmailVerificationBannerClient";
import { ServiceWorkerRegistrar } from "@/components/system/ServiceWorkerRegistrar";

/**
 * Dashboard layout - wraps all authenticated pages.
 *
 * Note: Email verification is now handled client-side via EmailVerificationBannerClient
 * to avoid re-triggering server auth checks on every navigation (which would bypass
 * the Router Cache and show loading skeletons).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
