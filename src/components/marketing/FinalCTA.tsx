import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="rounded-2xl border border-[var(--border)] py-16 px-6 md:py-20 md:px-12 text-center"
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      <Heading
        id="final-cta-heading"
        level={2}
        className="text-3xl md:text-4xl font-bold tracking-tight"
      >
        Start your first festival on{" "}
        <span
          style={{
            fontFamily: "var(--font-brand)",
            color: "var(--primary)",
            fontWeight: 600,
          }}
        >
          BackRow
        </span>
        .
      </Heading>
      <Text size="body" className="mt-4 max-w-xl mx-auto text-[var(--text-secondary)]">
        Create a club, invite your people, pick a theme. Thirty seconds to your first nomination.
      </Text>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/clubs">Browse clubs</Link>
        </Button>
      </div>
    </section>
  );
}
