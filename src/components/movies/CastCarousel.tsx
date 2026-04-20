"use client";

import Image from "next/image";
import Link from "next/link";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import { ScrollNavButton } from "@/components/ui/scroll-nav-button";
import { getPersonUrl } from "@/lib/persons/slugs";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useRef, useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
  character: string;
}

interface CrewMember {
  id: number;
  name: string;
  profile_path: string | null;
  job: string;
}

interface CastCarouselProps {
  cast: CastMember[];
  directors?: CrewMember[];
  composers?: CrewMember[];
  writers?: CrewMember[];
  screenplayWriters?: CrewMember[];
  editors?: CrewMember[];
  cinematographers?: CrewMember[];
  productionDesigners?: CrewMember[];
  costumeDesigners?: CrewMember[];
  maxItems?: number;
}

function PersonCard({
  person,
  label,
  labelColor = "var(--primary)",
}: {
  person: { id: number; name: string; profile_path: string | null };
  label: string;
  labelColor?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const labelRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;

    // Re-check when collapsed
    if (isExpanded) return;
    const check = () => setNeedsTruncation(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [label, isExpanded]);

  return (
    <div className="flex-shrink-0 w-[96px]">
      <Link href={getPersonUrl(person.id)} className="group">
        <div className="aspect-[2/3] relative rounded-lg overflow-hidden mb-1.5 bg-[var(--surface-1)] poster-card-embossed">
          {person.profile_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
              alt={person.name}
              fill
              sizes="96px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={getTMDBBlurDataURL()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
              No Image
            </div>
          )}
        </div>
      </Link>
      <p className="mt-1 text-[10px] font-medium text-[var(--glass-text)]">{person.name}</p>
      <div
        role={needsTruncation || isExpanded ? "button" : undefined}
        tabIndex={needsTruncation || isExpanded ? 0 : undefined}
        onClick={() => (needsTruncation || isExpanded) && setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if ((needsTruncation || isExpanded) && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className={needsTruncation || isExpanded ? "cursor-pointer" : ""}
      >
        <p
          ref={labelRef}
          className={`text-[9px] font-medium ${!isExpanded ? "line-clamp-2" : ""}`}
          style={{
            color: labelColor,
            ...(needsTruncation && !isExpanded
              ? {
                  WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                  maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                }
              : {}),
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function ScrollableRow({ children }: { children: React.ReactNode }) {
  const scrollRef = useDragScroll<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScrollButtons();
    container.addEventListener("scroll", checkScrollButtons);
    window.addEventListener("resize", checkScrollButtons);

    return () => {
      container.removeEventListener("scroll", checkScrollButtons);
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [checkScrollButtons]);

  const scroll = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    let scrollAmount = container.clientWidth * 0.75;

    if (direction === "right") {
      scrollAmount = Math.min(scrollAmount, maxScroll - currentScroll);
    } else {
      scrollAmount = Math.min(scrollAmount, currentScroll);
    }

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <ScrollNavButton direction="left" onClick={() => scroll("left")} size="md" />
        </div>
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
          <ScrollNavButton direction="right" onClick={() => scroll("right")} size="md" />
        </div>
      )}
      <div className="carousel-trough">
        <div
          ref={(el) => {
            containerRef.current = el;
            if (scrollRef && typeof scrollRef === "object" && "current" in scrollRef) {
              (scrollRef as React.RefObject<HTMLDivElement | null>).current = el;
            }
          }}
          className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-x-contain px-4 py-2"
          data-swipe-ignore
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function CastCarousel({
  cast,
  directors = [],
  composers = [],
  writers = [],
  screenplayWriters = [],
  editors = [],
  cinematographers = [],
  productionDesigners = [],
  costumeDesigners = [],
  maxItems = 8,
}: CastCarouselProps) {
  // Deduplicate crew members — combine roles for the same person
  const roleEntries: { person: CrewMember; label: string }[] = [
    ...directors.map((p) => ({ person: p, label: "Director" })),
    ...writers.map((p) => ({ person: p, label: "Writer" })),
    ...screenplayWriters.map((p) => ({ person: p, label: "Screenplay" })),
    ...composers.map((p) => ({ person: p, label: "Composer" })),
    ...cinematographers.map((p) => ({ person: p, label: "Cinematography" })),
    ...editors.map((p) => ({ person: p, label: "Editor" })),
    ...productionDesigners.map((p) => ({ person: p, label: "Production Design" })),
    ...costumeDesigners.map((p) => ({ person: p, label: "Costume Design" })),
  ];

  const crewMap = new Map<number, { person: CrewMember; labels: string[] }>();
  for (const { person, label } of roleEntries) {
    const existing = crewMap.get(person.id);
    if (existing) {
      if (!existing.labels.includes(label)) {
        existing.labels.push(label);
      }
    } else {
      crewMap.set(person.id, { person, labels: [label] });
    }
  }
  const deduplicatedCrew = Array.from(crewMap.values());

  const hasCrewMembers = deduplicatedCrew.length > 0;
  const hasCast = cast && cast.length > 0;

  if (!hasCrewMembers && !hasCast) return null;

  return (
    <div className="space-y-4">
      {/* Cast Section */}
      {hasCast && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
            Cast
          </h2>
          <ScrollableRow>
            {cast.slice(0, maxItems).map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                label={person.character}
                labelColor="var(--glass-text-muted)"
              />
            ))}
          </ScrollableRow>
        </section>
      )}

      {/* Crew Section */}
      {hasCrewMembers && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
            Crew
          </h2>
          <ScrollableRow>
            {deduplicatedCrew.map(({ person, labels }) => (
              <PersonCard
                key={`crew-${person.id}`}
                person={person}
                label={labels.join(" / ")}
                labelColor="var(--glass-text-muted)"
              />
            ))}
          </ScrollableRow>
        </section>
      )}
    </div>
  );
}

export function CastCarouselSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <section className={className} aria-hidden="true">
      <Skeleton className="h-4 w-24 mb-3" />
      <div className="flex gap-3 px-4 py-2 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[96px]">
            <Skeleton className="aspect-[2/3] rounded-lg mb-1.5" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
