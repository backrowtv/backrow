import { Heading, Text } from "@/components/ui/typography";

const steps = [
  {
    number: "1",
    title: "Create or join a club",
    body: "Start your own or find a group that shares your taste.",
  },
  {
    number: "2",
    title: "Build the lineup",
    body: "Anyone nominates. The club votes films into the running.",
  },
  {
    number: "3",
    title: "Watch, rate, discuss",
    body: "Log ratings, talk it out, see where the night lands.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading">
      <div className="mb-12 md:mb-16 text-center">
        <Heading
          id="how-it-works-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          How{" "}
          <span
            style={{
              fontFamily: "var(--font-brand)",
              color: "var(--primary)",
              fontWeight: 600,
            }}
          >
            BackRow
          </span>{" "}
          works
        </Heading>
        <Text size="body" className="mt-3 text-[var(--text-secondary)] max-w-xl mx-auto">
          From zero to your first festival in three steps.
        </Text>
      </div>

      <ol className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
        {/* Horizontal connector on desktop */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute left-[16.666%] right-[16.666%] top-6 h-px"
          style={{ backgroundColor: "var(--border)" }}
        />
        {steps.map((step) => (
          <li key={step.number} className="relative flex flex-col items-center text-center">
            <div
              className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full font-semibold text-lg mb-4"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {step.number}
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{step.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
