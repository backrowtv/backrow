import Image from "next/image";
import Link from "next/link";
import { ArrowRight, UsersThree, FilmSlate } from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { ClubJsonLd } from "@/components/seo/JsonLd";

type ActiveFestivalTeaser = {
  theme: string | null;
  slug: string | null;
  status: string | null;
  phase: string | null;
  posterUrl: string | null;
};

type ClubForLanding = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  theme_color: string | null;
  picture_url: string | null;
};

// Anonymous-visitor landing for a PUBLIC club. Renders the JSON-LD schema
// and a tactile information layout so crawlers and new visitors see
// something meaningful without full dashboard access. Sign-in CTA redirects
// back to the club URL after auth.
//
// Private clubs should never render this — the page body redirects anons
// away from private clubs before reaching this component.
export function PublicClubLanding({
  club,
  clubUrlSlug,
  memberCount,
  activeFestival,
  posterStrip,
}: {
  club: ClubForLanding;
  clubUrlSlug: string;
  memberCount: number;
  activeFestival: ActiveFestivalTeaser | null;
  posterStrip: string[];
}) {
  const signInHref = `/sign-in?redirectTo=${encodeURIComponent(`/club/${clubUrlSlug}`)}`;
  const signUpHref = `/sign-up?redirectTo=${encodeURIComponent(`/club/${clubUrlSlug}`)}`;
  const accent = club.theme_color ?? "var(--primary)";

  const activeFestivalHref =
    activeFestival?.slug && `/club/${clubUrlSlug}/festival/${activeFestival.slug}`;

  return (
    <>
      <ClubJsonLd
        club={{
          name: club.name,
          slug: club.slug ?? clubUrlSlug,
          description: club.description,
          picture_url: club.picture_url,
        }}
      />
      <Section>
        <Container size="md">
          <div className="flex flex-col items-center text-center gap-6 py-12 sm:py-16">
            <div className="h-1 w-16 rounded-full" style={{ background: accent }} aria-hidden />
            <Heading level={1} className="text-3xl sm:text-4xl">
              {club.name}
            </Heading>
            {club.description ? (
              <Text className="max-w-xl text-[var(--text-secondary)]">{club.description}</Text>
            ) : (
              <Text className="max-w-xl text-[var(--text-secondary)]">
                A movie club on BackRow.
              </Text>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild>
                <Link href={signInHref}>
                  Sign in to view <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={signUpHref}>Create a BackRow account</Link>
              </Button>
            </div>
          </div>

          {(memberCount > 0 || activeFestival) && (
            <div className="border-t border-[var(--border)]">
              <dl className="divide-y divide-[var(--border)]">
                {memberCount > 0 && (
                  <div className="flex items-center justify-between py-4 text-sm">
                    <dt className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <UsersThree className="h-4 w-4" aria-hidden />
                      Members
                    </dt>
                    <dd className="text-[var(--text-primary)] font-medium tabular-nums">
                      {memberCount.toLocaleString()}
                    </dd>
                  </div>
                )}
                {activeFestival?.theme && (
                  <div className="flex items-center justify-between gap-4 py-4 text-sm">
                    <dt className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <FilmSlate className="h-4 w-4" aria-hidden />
                      Active festival
                    </dt>
                    <dd className="text-right">
                      {activeFestivalHref ? (
                        <Link
                          href={activeFestivalHref}
                          className="text-[var(--text-primary)] font-medium hover:underline"
                        >
                          {activeFestival.theme}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-primary)] font-medium">
                          {activeFestival.theme}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {posterStrip.length > 0 && (
            <div className="border-t border-[var(--border)] pt-6 pb-10">
              <Text className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Recent picks
              </Text>
              <div className="flex gap-3 overflow-x-auto">
                {posterStrip.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative flex-shrink-0 aspect-[2/3] w-24 sm:w-28 rounded-md overflow-hidden ring-1 ring-[var(--border)]"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 96px, 112px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pb-12">
            <Text className="text-xs text-[var(--text-muted)]">
              BackRow is a social platform for movie clubs and themed film festivals.
            </Text>
          </div>
        </Container>
      </Section>
    </>
  );
}
