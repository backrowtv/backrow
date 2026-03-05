import { createClient } from "@/lib/supabase/server";
import { ForceDarkMode } from "@/components/shared/ForceDarkMode";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {!user && <ForceDarkMode />}
      {children}
    </>
  );
}
