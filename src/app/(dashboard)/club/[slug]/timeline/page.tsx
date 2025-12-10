import { redirect } from "next/navigation";

interface TimelineRedirectProps {
  params: Promise<{ slug: string }>;
}

/**
 * Redirect old /timeline URLs to /history for backwards compatibility
 */
export default async function TimelineRedirect({ params }: TimelineRedirectProps) {
  const { slug } = await params;
  redirect(`/club/${slug}/history`);
}
