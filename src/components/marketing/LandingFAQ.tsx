import { Heading, Text } from "@/components/ui/typography";
import { Question, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getLandingFAQs, landingCategories } from "@/data/faq";
import type { FAQQuestion } from "@/data/faq";
import Link from "next/link";

export function LandingFAQ() {
  const landingFAQs = getLandingFAQs();

  const categories: Array<{
    key: "basics" | "watching" | "competing" | "social";
    title: string;
    description: string;
    questions: FAQQuestion[];
  }> = [
    { key: "basics", ...landingCategories.basics, questions: landingFAQs.basics },
    { key: "watching", ...landingCategories.watching, questions: landingFAQs.watching },
    { key: "competing", ...landingCategories.competing, questions: landingFAQs.competing },
    { key: "social", ...landingCategories.social, questions: landingFAQs.social },
  ];

  return (
    <section aria-labelledby="faq-heading">
      <div className="mb-12 md:mb-16 max-w-2xl">
        <div className="flex items-center gap-3 mb-3">
          <Question className="h-6 w-6" style={{ color: "var(--primary)" }} weight="duotone" />
          <Heading
            id="faq-heading"
            level={2}
            className="text-3xl md:text-4xl font-bold tracking-tight"
          >
            Questions?
          </Heading>
        </div>
        <Text size="body" className="text-[var(--text-secondary)]">
          Everything worth knowing about clubs and festivals before you jump in.
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {categories.map((category) => (
          <div key={category.key}>
            <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-[var(--text-muted)] mb-3">
              {category.title}
            </h3>
            <ul>
              {category.questions.map((item, idx) => (
                <li
                  key={item.id}
                  className={`border-t border-[var(--border)] ${
                    idx === category.questions.length - 1 ? "border-b" : ""
                  }`}
                >
                  <details className="group">
                    <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none font-medium text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors">
                      <span>{item.question}</span>
                      <CaretRight
                        className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-90 text-[var(--text-muted)]"
                        weight="bold"
                      />
                    </summary>
                    <p className="pb-4 pr-8 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {item.answer}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/faq"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          View all FAQs
          <CaretRight className="h-3.5 w-3.5" weight="bold" />
        </Link>
      </div>
    </section>
  );
}
