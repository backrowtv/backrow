import { Heading, Text } from "@/components/ui/typography";
import { FestivalDemoVideo } from "@/components/marketing/FestivalDemoVideo";

export function FestivalDemo() {
  return (
    <section aria-labelledby="festival-demo-heading">
      <div className="mb-8 md:mb-12 max-w-2xl mx-auto text-center">
        <Heading
          id="festival-demo-heading"
          level={2}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          See a festival in motion
        </Heading>
        <Text size="body" className="mt-3 text-[var(--text-secondary)]">
          Nominations, ratings, and results — all in one place.
        </Text>
      </div>

      <div
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-1)" }}
      >
        <FestivalDemoVideo />
      </div>
    </section>
  );
}
