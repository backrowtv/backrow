import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Heading, Text } from "@/components/ui/typography";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Envelope } from "@phosphor-icons/react/dist/ssr";
import { ResendConfirmationButton } from "./ResendConfirmationButton";
import { isValidRedirect } from "@/lib/auth/redirect";

interface PageProps {
  searchParams: Promise<{ email?: string; next?: string }>;
}

export default function SignUpConfirmPage(props: PageProps) {
  return (
    <Suspense fallback={null}>
      <SignUpConfirmPageContent {...props} />
    </Suspense>
  );
}

async function SignUpConfirmPageContent({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  const email = params.email || "";
  const next = params.next && isValidRedirect(params.next) ? params.next : null;

  const startOverHref = next ? `/sign-up?redirectTo=${encodeURIComponent(next)}` : "/sign-up";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
            >
              <Envelope weight="duotone" className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <Heading level={1} className="text-xl">
              Check your email
            </Heading>
            <Text size="sm" muted className="mt-2">
              {email ? (
                <>
                  We sent a confirmation link to{" "}
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{email}</span>.
                </>
              ) : (
                "We sent you a confirmation link."
              )}{" "}
              Click it to finish signing up{next ? " and return to what you were doing" : ""}.
            </Text>
          </CardHeader>
          <CardContent className="space-y-4">
            {email && <ResendConfirmationButton email={email} next={next} />}
            <div className="text-center">
              <Link
                href={startOverHref}
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Wrong email? Start over
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Didn't get it? Check your spam folder, or use resend above.
          </p>
        </div>
      </div>
    </div>
  );
}
