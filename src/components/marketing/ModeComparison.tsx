import { Heading, Text } from "@/components/ui/typography";
import { Trophy, FilmStrip, Check } from "@phosphor-icons/react/dist/ssr";

interface Mode {
  icon: typeof Trophy;
  name: string;
  size: string;
  description: string;
  bullets: string[];
  bestFor: string;
}

const modes: Mode[] = [
  {
    icon: Trophy,
    name: "Standard Festival",
    size: "For small-to-mid groups (5–30)",
    description:
      "Themed seasons with a clear start and end. Everyone nominates, watches, rates, and the scoreboard settles it.",
    bullets: [
      "Phased schedule: nominate → watch → rate → results",
      "Rotating nominators keep the slate fresh",
      "Competitive scoring + season leaderboards",
      "Season awards and historical standings",
    ],
    bestFor: "Best for friends, families, film school crews.",
  },
  {
    icon: FilmStrip,
    name: "Endless Festival",
    size: "For massive communities",
    description:
      "An always-on watchlist with casual ratings and no phases. Great for theaters, creators, and subreddit-scale groups.",
    bullets: [
      "No phases — watch at your own pace",
      "Casual ratings, discovery-driven",
      "No competition, no deadlines",
      "Scales to thousands of members",
    ],
    bestFor: "Best for public clubs, theaters, large online communities.",
  },
];

export function ModeComparison() {
  return (
    <section aria-labelledby="modes-heading">
      <div className="mb-12 md:mb-16 text-center max-w-2xl mx-auto">
        <Heading
          id="modes-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          Two ways to run a club
        </Heading>
        <Text size="body" className="mt-3 text-[var(--text-secondary)]">
          Pick the festival mode that fits your group. You can always adjust.
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-[var(--border)]">
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.name}
              className={`py-8 md:py-4 ${index === 0 ? "md:pr-10" : "md:pl-10"} ${
                index === 0 ? "border-b border-[var(--border)] md:border-b-0" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon className="w-6 h-6" style={{ color: "var(--primary)" }} weight="duotone" />
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">{mode.name}</h3>
              </div>
              <p className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
                {mode.size}
              </p>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-6">
                {mode.description}
              </p>
              <ul className="space-y-3 mb-6">
                {mode.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2.5 text-sm text-[var(--text-primary)]"
                  >
                    <Check
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: "var(--primary)" }}
                      weight="bold"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm italic text-[var(--text-muted)]">{mode.bestFor}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
