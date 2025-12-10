import { redirect } from "next/navigation";

interface UpcomingRedirectProps {
  params: Promise<{ slug: string }>;
}

export default async function UpcomingRedirect({ params }: UpcomingRedirectProps) {
  const { slug } = await params;
  redirect(`/club/${slug}/history`);
}
