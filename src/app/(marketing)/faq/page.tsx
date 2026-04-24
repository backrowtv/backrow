import type { Metadata } from "next";
import { BrandText } from "@/components/ui/brand-text";
import { getAllCategories } from "@/data/faq";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { MarketingSidebarMount } from "@/components/marketing/MarketingSidebarMount";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const metadata: Metadata = {
  title: "FAQ - BackRow",
  description: "Answers to everything about BackRow — movie clubs, festivals, ratings, and more.",
  alternates: { canonical: absoluteUrl("/faq") },
  openGraph: {
    title: "FAQ - BackRow",
    description: "Answers to everything about BackRow — movie clubs, festivals, ratings, and more.",
    type: "website",
    url: absoluteUrl("/faq"),
    siteName: "BackRow",
  },
};

export default function FAQPage() {
  const categories = getAllCategories();

  return (
    <div className="bg-[var(--background)]">
      <MarketingSidebarMount />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            <BrandText>BackRow</BrandText> FAQ
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Short answers. Jump to a section or scroll.
          </p>
          <nav aria-label="FAQ sections" className="mt-6">
            {/* Mobile: collapsed <details> disclosure. Avoids a 14-row wall of text. */}
            <details className="sm:hidden group rounded-md border border-[var(--border)] bg-[var(--surface-1)]">
              <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
                <span>Jump to a section</span>
                <CaretDown
                  className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] marker:text-[var(--text-muted)] px-3 pb-3 pt-1 space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <a
                      href={`#${category.id}`}
                      className="text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
                    >
                      {category.title}
                    </a>
                  </li>
                ))}
              </ol>
            </details>

            {/* Tablet & desktop: flat multi-column list. */}
            <ol className="hidden sm:block list-decimal list-inside text-sm text-[var(--text-secondary)] marker:text-[var(--text-muted)] sm:columns-2 lg:columns-3 gap-x-8">
              {categories.map((category) => (
                <li key={category.id} className="break-inside-avoid py-1">
                  <a
                    href={`#${category.id}`}
                    className="text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    {category.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </header>

        <div className="space-y-14">
          {categories.map((category) => {
            const sorted = [...category.questions].sort((a, b) => a.priority - b.priority);
            return (
              <section
                key={category.id}
                id={category.id}
                className="scroll-mt-24"
                aria-labelledby={`${category.id}-heading`}
              >
                <h2
                  id={`${category.id}-heading`}
                  className="text-lg font-semibold text-[var(--text-primary)] mb-4"
                >
                  {category.title}
                </h2>
                <div className="border-t border-[var(--border)]">
                  {sorted.map((item) => (
                    <details key={item.id} className="group py-4 border-b border-[var(--border)]">
                      <summary className="flex items-start justify-between gap-4 cursor-pointer list-none text-sm font-medium text-[var(--text-primary)]">
                        <span className="leading-snug">
                          <BrandText>{item.question}</BrandText>
                        </span>
                        <CaretDown
                          className="h-4 w-4 flex-shrink-0 mt-0.5 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                        <BrandText>{item.answer}</BrandText>
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
