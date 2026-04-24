import { connection } from "next/server";

// Auth pages read searchParams and (via children) check the Supabase
// session cookie — both dynamic under cacheComponents. Opt the subtree
// out of static prerender at the layout so pages don't each repeat it.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <>{children}</>;
}
