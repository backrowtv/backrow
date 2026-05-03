import { Heading, Text } from "@/components/ui/typography";
import { FestivalDemoSlideshow } from "@/components/marketing/FestivalDemoSlideshow";

const steps = [
  { number: 1, label: "Create", description: "Pick a theme and dates." },
  { number: 2, label: "Nominate", description: "Members submit movies that fit." },
  { number: 3, label: "Watch", description: "Everyone watches at their own pace." },
  { number: 4, label: "Rate", description: "Score the picks and leave reviews." },
  {
    number: 5,
    label: "Reveal",
    description: "Standings, winners, and who had the best taste.",
  },
];

export function FestivalFlow() {
  return (
    <section aria-labelledby="festival-flow-heading">
      <div className="mb-10 md:mb-14 max-w-2xl mx-auto text-center">
        <Heading
          id="festival-flow-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          How a festival runs, start to finish.
        </Heading>
        <Text size="body" className="mt-3 text-[var(--text-secondary)]">
          Create a theme, collect nominations, watch, rate, reveal.
        </Text>
      </div>

      <ol className="mb-12 md:mb-16 grid gap-4 md:grid-cols-5">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex flex-col rounded-xl border p-5"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-1)",
            }}
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--primary)",
                border: "1px solid var(--border)",
              }}
            >
              {step.number}
            </span>
            <Heading level={3} className="mt-3 text-base font-semibold">
              {step.label}
            </Heading>
            <Text
              size="small"
              className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              {step.description}
            </Text>
          </li>
        ))}
      </ol>

      <div
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
      >
        <FestivalDemoSlideshow />
      </div>
    </section>
  );
}
