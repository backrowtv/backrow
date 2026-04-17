import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { ClubJsonLd } from "@/components/seo/JsonLd";

// Anonymous-visitor landing for a PUBLIC club. Renders the JSON-LD schema and
// a minimal information card so crawlers and new visitors see something
// meaningful without full dashboard access. Sign-in CTA redirects back to the
// club URL after auth.
//
// Private clubs should never render this — the page body redirects anons away
// from private clubs before reaching this component.
export function PublicClubLanding({
  club,
  clubUrlSlug,
}: {
  club: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    theme_color: string | null;
    picture_url: string | null;
  };
  clubUrlSlug: string;
}) {
  const signInHref = `/sign-in?redirectTo=${encodeURIComponent(`/club/${clubUrlSlug}`)}`;
  const signUpHref = `/sign-up?redirectTo=${encodeURIComponent(`/club/${clubUrlSlug}`)}`;
  const accent = club.theme_color ?? "var(--primary)";

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
          <div className="flex flex-col items-center text-center gap-6 py-12 sm:py-20">
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
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild>
                <Link href={signInHref}>
                  Sign in to view <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={signUpHref}>Create a BackRow account</Link>
              </Button>
            </div>
            <Text className="text-xs text-[var(--text-muted)] pt-8">
              BackRow is a social platform for movie clubs and themed film festivals.
            </Text>
          </div>
        </Container>
      </Section>
    </>
  );
}
