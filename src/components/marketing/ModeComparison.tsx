import { Heading, Text } from "@/components/ui/typography";

export function ModeComparison() {
  return (
    <section aria-labelledby="modes-heading">
      <div className="mb-10 md:mb-12 text-center max-w-2xl mx-auto">
        <Heading
          id="modes-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          A club that fits your group
        </Heading>
        <Text size="body" className="mt-3 text-[var(--text-secondary)]">
          Five friends or five thousand strangers — same tools, your pace.
        </Text>
      </div>

      <div
        className="rounded-2xl border border-[var(--border)] px-6 py-10 md:px-12 md:py-12"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        <p className="text-base md:text-lg text-[var(--text-primary)] leading-relaxed max-w-3xl mx-auto text-center">
          Run a themed festival with phases, rotating nominators, and a final scoreboard — or keep
          it always-on with a shared watchlist and casual ratings. Either way, nominations, ratings,
          and discussions stay in one place, and you can change modes whenever the vibe shifts.
        </p>
      </div>
    </section>
  );
}
