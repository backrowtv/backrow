import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ForceDarkMode } from "@/components/shared/ForceDarkMode";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Keep the layout shell synchronous so cacheComponents can prerender
  // marketing pages. The auth-dependent ForceDarkMode gate runs inside
  // a Suspense boundary via the async MaybeForceDarkMode child.
  return (
    <>
      <Suspense fallback={null}>
        <MaybeForceDarkMode />
      </Suspense>
      {children}
    </>
  );
}

async function MaybeForceDarkMode() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return null;
  return <ForceDarkMode />;
}
