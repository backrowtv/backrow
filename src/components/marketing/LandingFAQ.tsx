"use client";

import { Heading, Text } from "@/components/ui/typography";
import { Question } from "@phosphor-icons/react";
import { getLandingFAQs, landingCategories } from "@/data/faq";
import Link from "next/link";

export function LandingFAQ() {
  const landingFAQs = getLandingFAQs();

  const categories = [
    { key: "basics" as const, ...landingCategories.basics, questions: landingFAQs.basics },
    { key: "watching" as const, ...landingCategories.watching, questions: landingFAQs.watching },
    { key: "competing" as const, ...landingCategories.competing, questions: landingFAQs.competing },
    { key: "social" as const, ...landingCategories.social, questions: landingFAQs.social },
  ];

  return (
    <section aria-labelledby="faq-heading" className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
            <Question className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <Heading
            id="faq-heading"
            level={2}
            className="text-left text-4xl font-bold tracking-tight md:text-4xl"
          >
            Questions?
          </Heading>
        </div>
        <Text
          size="body"
          className="max-w-md text-left text-lg md:text-base leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Everything you need to know about movie clubs and festivals.
        </Text>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <div
            key={category.key}
            className="rounded-lg border p-5"
            style={{
              borderColor: "rgba(148, 163, 184, 0.2)",
              backgroundColor: "var(--surface-1)",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.2)",
            }}
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)] pb-3 border-b border-[var(--border)] mb-3">
              {category.title}
            </h3>
            <div className="space-y-1">
              {category.questions.map((item) => (
                <details
                  key={item.id}
                  className="group cursor-pointer py-2 border-b border-[var(--border)]/50 last:border-0"
                >
                  <summary className="flex items-center justify-between font-medium text-sm list-none text-[var(--text-primary)]">
                    <span>{item.question}</span>
                    <svg
                      className="h-4 w-4 flex-shrink-0 ml-4 transition-transform group-open:rotate-180 text-[var(--text-muted)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Link to full FAQ */}
      <div className="text-center pt-4">
        <Link
          href="/faq"
          className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline"
        >
          View all FAQs
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
