"use client";

import { Heading, Text } from "@/components/ui/typography";
import { Trophy, FilmStrip } from "@phosphor-icons/react";
import Link from "next/link";

const modes = [
  {
    icon: Trophy,
    name: "Standard Festival",
    description: "Themed seasons with phases, scoring, and standings. See whose picks win.",
    type: "standard",
  },
  {
    icon: FilmStrip,
    name: "Endless Festival",
    description: "Continuous watching, casual ratings, no competition. Watch at your own pace.",
    type: "endless",
  },
];

export function HowItWorks() {
  return (
    <section>
      <div className="mb-8">
        <Heading level={2} className="text-2xl md:text-3xl font-bold">
          How does your club watch?
        </Heading>
        <Text size="body" className="mt-2 text-[var(--text-secondary)] max-w-2xl">
          Every club is different. Pick a style that fits your group — you can always adjust as you
          go.
        </Text>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link
              key={mode.name}
              href={`/create-club?type=${mode.type}`}
              className="group rounded-xl border border-[var(--border)] p-5 transition-colors hover:border-[var(--text-muted)]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: "var(--surface-1)" }}>
                  <Icon className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {mode.name}
                </h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {mode.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
