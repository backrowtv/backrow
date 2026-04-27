# Production Readiness Audit

**Date:** April 6, 2026

---

## Must-Have Before Launch

| Item                      | Status      | What to do                                                          |
| ------------------------- | ----------- | ------------------------------------------------------------------- |
| **robots.txt**            | Missing     | Prevents search engines from crawling auth pages, API routes        |
| **sitemap.xml**           | Missing     | Search engines can't discover your public pages without it          |
| **Custom 404 page**       | Missing     | Users see generic Next.js 404 right now                             |
| **Privacy Policy page**   | Missing     | You have Terms + User Agreement but no dedicated `/privacy-policy`  |
| **Health check endpoint** | ✅ Resolved | `/api/health` ships in `src/app/api/health/route.ts`                |
| **Error monitoring**      | ✅ Resolved | `@sentry/nextjs` integrated; Sentry MCP plugin available for triage |

---

## Should-Have (Before or Shortly After Launch)

| Item                            | Status  | What to do                                                                           |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| **Cookie consent banner**       | Missing | Legally required in EU, good practice everywhere                                     |
| **Rate limiting on auth**       | Partial | TMDB search is rate-limited but not sign-in/sign-up (brute force risk)               |
| **Transactional email service** | Missing | Supabase handles auth emails only. No way to send invite emails, notifications, etc. |
| **CI/CD pipeline**              | Missing | No GitHub Actions — tests and linting only run via pre-commit hooks locally          |
| **Uptime monitoring**           | Missing | No way to know if the site goes down                                                 |
| **Abuse prevention**            | Weak    | No limits on how many nominations/ratings/messages a user can spam                   |

---

## Nice-to-Have (Polish)

| Item                        | Status        | What to do                                                                            |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| **JSON-LD structured data** | Missing       | Organization/Website schema for richer Google results                                 |
| **Analytics**               | Internal only | No GA4 or Plausible — can't see traffic, user behavior, drop-off                      |
| **Dynamic OG images**       | Partial       | Root OG image exists but individual pages (clubs, festivals) don't generate their own |
| **CSP nonces**              | N/A for now   | Uses `unsafe-inline` which is fine for Next.js, but worth revisiting later            |

---

## Already Solid

These were checked and require no action:

- **Security headers** — CSP, HSTS, X-Frame-Options, Permissions-Policy all set
- **Input sanitization** — DOMPurify + Zod validation throughout
- **SQL injection** — all parameterized, no raw queries
- **Auth** — correct `getUser()` usage, proper OAuth flow, email verification
- **File uploads** — size limits, type validation, unique filenames
- **RLS policies** — comprehensive across tables
- **Error responses** — no internal details leaked
- **Account deletion** — GDPR-ready cascading delete flow
- **Invite system** — cryptographic tokens, 7-day expiry, audit trail
- **Loading/error/empty states** — complete coverage
- **Accessibility** — skip links, ARIA, semantic HTML
- **Cron jobs** — secured with CRON_SECRET, proper scheduling
- **Database indexes** — 234+ indexes, well-documented
