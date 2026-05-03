import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";

interface Archetype {
  title: string;
  description: string;
  artCaption: string;
  imageSrc: string;
}

const archetypes: Archetype[] = [
  {
    title: "Friends & Family",
    description:
      "A rotating cast taking turns picking the movie. Built for inside jokes and long-running rivalries.",
    artCaption: "Friends & family club",
    imageSrc: "/marketing/archetype-friends-family.jpg",
  },
  {
    title: "Film Podcasts & Creators",
    description:
      "Let listeners and viewers watch alongside you. They nominate, rate, and discuss — you program.",
    artCaption: "Podcast / creator club",
    imageSrc: "/marketing/archetype-podcast.jpg",
  },
  {
    title: "Theaters & Cinemas",
    description:
      "Publish your screening calendar as a living festival. Audiences rate what they saw and follow along.",
    artCaption: "Theater / cinema club",
    imageSrc: "/marketing/archetype-theater.jpg",
  },
  {
    title: "Fandoms & Subreddits",
    description:
      "A community ranking a genre or filmography together. Scoring scales however big the room gets.",
    artCaption: "Fandom / subreddit club",
    imageSrc: "/marketing/archetype-fandom.jpg",
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
              className="relative w-full overflow-hidden rounded border"
              style={{
                borderColor: "var(--border)",
                aspectRatio: "4 / 3",
              }}
            >
              <Image
                src={archetype.imageSrc}
                alt={archetype.artCaption}
                fill
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 92vw"
                className="object-cover"
              />
            </div>

            <Heading level={3} className="mt-5 text-lg font-semibold">
              {archetype.title}
            </Heading>
            <Text size="body" className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {archetype.description}
            </Text>
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
