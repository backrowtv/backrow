"use client";

import { Heading, Text } from "@/components/ui/typography";
import { FilmStrip, Trophy, Calendar, Users, ChatCircle, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const endlessFeatures = [
  {
    icon: Users,
    label: "No rankings",
    description: "Watch separately without the pressure of scores or standings.",
  },
  {
    icon: Calendar,
    label: "Watch when you can",
    description: "No deadlines or pressure — everyone watches on their own schedule.",
  },
  {
    icon: ChatCircle,
    label: "Quick thoughts",
    description: "Share what you liked without writing long reviews.",
  },
];

const standardFeatures = [
  {
    icon: Star,
    label: "Scoring and standings",
    description:
      "Your picks earn points based on how the group rates them. Track who has the best taste.",
  },
  {
    icon: Trophy,
    label: "Themed seasons",
    description: "Run themed rounds with phases — nominate, watch, rate, and reveal the results.",
  },
  {
    icon: ChatCircle,
    label: "Discussion and reviews",
    description: "Talk about what makes films work and see how everyone rated each pick.",
  },
];

export function AlternativeModesShowcase() {
  return (
    <TooltipProvider>
      <section
        aria-labelledby="alternative-modes-heading"
        className="relative overflow-hidden bg-[var(--background)]"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          {/* Heading */}
          <div className="mb-12">
            <Heading
              id="alternative-modes-heading"
              level={2}
              className="text-left text-3xl font-bold tracking-tight md:text-4xl"
            >
              Pick your club's
              <br />
              style.
            </Heading>
            <Text
              size="body"
              className="mt-4 max-w-2xl text-left text-base leading-relaxed text-[var(--text-secondary)]"
            >
              Every club watches differently. Choose the format that matches how your group likes to
              talk about films.
            </Text>
          </div>

          <div className="grid gap-12 md:grid-cols-2 md:items-stretch">
            {/* ENDLESS - Program List Style */}
            <div className="flex flex-col">
              <div className="mb-6 flex items-start gap-3 min-h-[80px]">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--surface-2)] mt-0.5">
                  <FilmStrip className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <Heading level={3} className="text-xl font-semibold">
                    Go{" "}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/create-club?type=endless" className="text-[var(--primary)]">
                          Endless
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Create an Endless Festival</TooltipContent>
                    </Tooltip>
                    .
                  </Heading>
                  <Text
                    size="body"
                    className="mt-2 max-w-2xl text-left text-base leading-relaxed text-[var(--text-secondary)]"
                  >
                    Create an{" "}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/create-club?type=endless" className="text-[var(--primary)]">
                          Endless Festival
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Create an Endless Festival</TooltipContent>
                    </Tooltip>
                    . Continuous watching with no deadlines — add movies anytime and rate at your
                    own pace.
                  </Text>
                </div>
              </div>

              {/* Horizontal program-style list */}
              <div
                className="flex-1 space-y-0 border-l-2 pl-6"
                style={{ borderColor: "rgba(148, 163, 184, 0.3)" }}
              >
                {endlessFeatures.map((feature, _index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div
                      key={feature.label}
                      className="relative border-b py-4 first:pt-0 last:border-b-0"
                      style={{ borderColor: "rgba(148, 163, 184, 0.2)" }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-[var(--primary)] bg-[var(--surface-2)]">
                          <FeatureIcon className="h-3 w-3 text-[var(--primary)]" />
                        </div>
                        <div className="flex-1">
                          <Text size="small" className="mb-1 font-semibold">
                            {feature.label}
                          </Text>
                          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Art placeholder */}
              <div className="mt-6 hidden md:block">
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
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Endless festival view</p>
                  </div>
                </div>
              </div>
            </div>

            {/* STANDARD - Program List Style (matching Endless) */}
            <div className="flex flex-col">
              <div className="mb-6 flex items-start gap-3 min-h-[80px]">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--surface-2)] mt-0.5">
                  <Trophy className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <Heading level={3} className="text-xl font-semibold">
                    Go{" "}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/create-club?type=standard" className="text-[var(--primary)]">
                          Standard
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Create a Standard Festival</TooltipContent>
                    </Tooltip>
                    .
                  </Heading>
                  <Text
                    size="body"
                    className="mt-2 max-w-2xl text-left text-base leading-relaxed text-[var(--text-secondary)]"
                  >
                    Create a{" "}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/create-club?type=standard" className="text-[var(--primary)]">
                          Standard Festival
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Create a Standard Festival</TooltipContent>
                    </Tooltip>
                    . Themed seasons with phases, scoring, and standings — see whose picks win.
                  </Text>
                </div>
              </div>

              {/* Horizontal program-style list */}
              <div
                className="flex-1 space-y-0 border-l-2 pl-6"
                style={{ borderColor: "rgba(148, 163, 184, 0.3)" }}
              >
                {standardFeatures.map((feature, _index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div
                      key={feature.label}
                      className="relative border-b py-4 first:pt-0 last:border-b-0"
                      style={{ borderColor: "rgba(148, 163, 184, 0.2)" }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-[var(--primary)] bg-[var(--surface-2)]">
                          <FeatureIcon className="h-3 w-3 text-[var(--primary)]" />
                        </div>
                        <div className="flex-1">
                          <Text size="small" className="mb-1 font-semibold">
                            {feature.label}
                          </Text>
                          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Art placeholder */}
              <div className="mt-6 hidden md:block">
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
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Standard festival view</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
