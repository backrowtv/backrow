import { Heading, Text } from "@/components/ui/typography";

interface FeatureRow {
  title: string;
  body: string;
  placeholderLabel: string;
}

const features: FeatureRow[] = [
  {
    title: "Nominations & voting",
    body: "Anyone can put a film in the ring. The club votes the lineup into order so every season reflects what your people actually want to watch.",
    placeholderLabel: "Nominations",
  },
  {
    title: "Rubric ratings, not just stars",
    body: "Score each film on the criteria your club cares about — cinematography, script, vibes, whatever. Weighted totals, always on a 0.0–10.0 scale.",
    placeholderLabel: "Rubric ratings",
  },
  {
    title: "Results & leaderboards",
    body: "See who picked the champ, who called it early, and who's climbing the season standings. Bragging rights, receipts included.",
    placeholderLabel: "Leaderboards",
  },
  {
    title: "Discussions, polls, and talk tracks",
    body: "Every film gets its own thread. Polls settle the side debates. Reactions land where the conversation lives.",
    placeholderLabel: "Discussions",
  },
];

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="relative aspect-[16/10] w-full rounded-xl border border-dashed flex items-center justify-center overflow-hidden"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-1)",
      }}
      aria-hidden="true"
    >
      <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Screenshot · {label}
      </span>
    </div>
  );
}

export function FeatureShowcase() {
  return (
    <section aria-labelledby="features-heading">
      <div className="mb-12 md:mb-16 max-w-2xl">
        <Heading
          id="features-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          Built for the way film clubs actually watch
        </Heading>
        <Text size="body" className="mt-3 text-[var(--text-secondary)]">
          The tools are shaped by real clubs running real festivals. Not a generic watchlist with a
          social layer bolted on.
        </Text>
      </div>

      <div className="space-y-20 md:space-y-28">
        {features.map((feature, index) => {
          const imageFirst = index % 2 === 0;
          return (
            <div
              key={feature.title}
              className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-12 md:items-center"
            >
              <div className={imageFirst ? "md:order-1" : "md:order-2"}>
                <ScreenshotPlaceholder label={feature.placeholderLabel} />
              </div>
              <div className={`max-w-md ${imageFirst ? "md:order-2" : "md:order-1"}`}>
                <h3 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  {feature.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
