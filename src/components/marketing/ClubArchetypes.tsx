import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";

type Mode = "Standard" | "Endless";

interface Archetype {
  title: string;
  description: string;
  mode: Mode;
  artCaption: string;
}

const archetypes: Archetype[] = [
  {
    title: "Friends & Family",
    description:
      "Five to thirty people, rotating who picks the movie. Built for inside jokes and long-running rivalries.",
    mode: "Standard",
    artCaption: "Friends & family club",
  },
  {
    title: "Film Podcasts & Creators",
    description:
      "Let listeners and viewers watch alongside you. They nominate, rate, and discuss — you program.",
    mode: "Endless",
    artCaption: "Podcast / creator club",
  },
  {
    title: "Theaters & Cinemas",
    description:
      "Publish your screening calendar as a living festival. Audiences rate what they saw and follow along.",
    mode: "Endless",
    artCaption: "Theater / cinema club",
  },
  {
    title: "Fandoms & Subreddits",
    description:
      "Massive communities ranking a genre or filmography together. Thousands can join; scoring scales.",
    mode: "Endless",
    artCaption: "Fandom / subreddit club",
  },
];

export function ClubArchetypes() {
  return (
    <section aria-labelledby="club-archetypes-heading">
      <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
        <Heading
          id="club-archetypes-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          Run a club. Or join one.
        </Heading>
        <Text size="body" className="mt-4 text-[var(--text-secondary)]">
          A BackRow club is a group of people who watch and talk about movies together. The group
          can be small or massive — here's the shape of it.
        </Text>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {archetypes.map((archetype) => (
          <div
            key={archetype.title}
            className="flex flex-col rounded-2xl border p-5"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-1)",
            }}
          >
            <div
              className="relative w-full overflow-hidden rounded border border-dashed"
              style={{
                borderColor: "rgba(148, 163, 184, 0.6)",
                backgroundColor: "var(--surface-2)",
                aspectRatio: "4 / 3",
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                <Text size="small" className="font-semibold">
                  [Art placeholder]
                </Text>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{archetype.artCaption}</p>
              </div>
            </div>

            <Heading level={3} className="mt-5 text-lg font-semibold">
              {archetype.title}
            </Heading>
            <Text size="body" className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {archetype.description}
            </Text>
            <div
              className="mt-auto border-t pt-4 text-xs text-[var(--text-muted)]"
              style={{ borderColor: "var(--border)" }}
            >
              Usually runs as a{" "}
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>{archetype.mode}</span>{" "}
              festival.
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/sign-up">Start a club</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/clubs">Browse clubs</Link>
        </Button>
      </div>
    </section>
  );
}
