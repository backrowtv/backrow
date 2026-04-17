import type { Metadata } from "next";
import { Section, Container } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { Notebook } from "@phosphor-icons/react/dist/ssr";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "Blog - BackRow",
  description:
    "Read the latest news, updates, and insights from BackRow about movie clubs, film festivals, and cinema culture.",
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: "Blog - BackRow",
    description:
      "Read the latest news, updates, and insights from BackRow about movie clubs, film festivals, and cinema culture.",
    type: "website",
    url: absoluteUrl("/blog"),
    siteName: "BackRow",
  },
};

export default async function BlogPage() {
  return (
    <Section variant="default" fullWidth>
      <MarketingSidebarMount />
      <Container size="md" className="p-6 md:p-8">
        <div className="mb-6">
          <Heading level={1} className="mb-2">
            BackRow Blog
          </Heading>
          <Text size="lg" muted>
            Stay updated with the latest news, tips, and insights about movie clubs and film
            festivals
          </Text>
        </div>

        <div className="space-y-6 md:space-y-8">
          <EmptyState
            icon={Notebook}
            title="Coming soon"
            message="We're working on bringing you great content about movie clubs, film festivals, and cinema culture. Check back soon!"
            variant="card"
          />
        </div>
      </Container>
    </Section>
  );
}
