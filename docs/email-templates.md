# Email Templates

How BackRow's transactional emails are authored, branded, and shipped — and the **dual source-of-truth** landmine that catches everyone the first time.

## Two delivery paths

| System emails                                                                                                      | Source-of-truth                                                                                                 | Sent by                             |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Supabase auth emails** (confirm-signup, magic-link, reset-password, change-email, invite-user, reauthentication) | Repo HTML in `src/lib/email/templates/supabase-auth/*.html` **+** Supabase Dashboard (manual paste — see below) | Supabase auth                       |
| **App emails** (welcome, club invite, notification digests, etc.)                                                  | React Email components under `src/lib/email/templates/components/*`                                             | Resend, via `src/lib/email/send.ts` |

The two systems share one design language and one wordmark, but they ship by different mechanisms. Don't mix them up.

## ⚠️ Dual source-of-truth: Supabase auth templates

Editing `src/lib/email/templates/supabase-auth/*.html` does **not** change what users receive. Supabase serves the copy stored in **Supabase Dashboard → Authentication → Email Templates**, not the file in the repo.

After every edit to one of those 6 HTML files:

1. Open Supabase Dashboard → Authentication → Email Templates.
2. Find the matching template (Confirm Signup / Magic Link / Reset Password / Change Email / Invite User / Reauthentication).
3. Paste the rendered HTML from the repo file into the dashboard editor.
4. Save.

The repo copy is the source-of-truth that engineering reviews; the dashboard copy is what users see. They drift constantly when this paste step gets skipped — symptoms include "we updated the template last week but my new test email still shows the old wordmark" or "the magic-link template still has the OTP block we deleted three weeks ago."

**There is no automation for this.** If/when we add a Supabase Management API call to push template HTML on merge, this section gets deleted.

## Branding: the wordmark

Both systems render the BackRow wordmark from `https://backrow.tv/wordmark.png` — a static, pre-rendered PNG committed to the repo at `public/wordmark.png`.

Why static and not the dynamic `/api/brand/wordmark` route? Because:

- Gmail and Outlook proxy `<img src>` through their own image servers, cache aggressively, and re-fetch unpredictably. A dynamic route gives them a function invocation per refresh and a cache-bust nightmare.
- Server-to-server fetches from a Vercel function to its own origin's static asset get blocked by preview deployment protection.
- `@vercel/og`'s build-time prerender baked a 500 once when the function self-fetched a font that wasn't yet live.

Static PNG → none of those problems.

### Regenerating the wordmark PNG

When the Righteous font or wordmark color changes:

```bash
bun run wordmark:render        # runs scripts/render-wordmark.mjs
git add public/wordmark.png
git commit -m "chore(wordmark): regenerate PNG"
```

The script reads `public/fonts/Righteous-Regular.ttf` and writes a 600×160 transparent PNG via the same `ImageResponse` machinery the API route uses. `BRAND_PRIMARY` is hardcoded to `#6B9B6B` to match `og-template.tsx`.

### Why TTF, not WOFF2

`@vercel/og`'s underlying Satori renderer rejects WOFF2 with `Unsupported OpenType signature wOF2` and silently falls back to a sans-serif. Both the dynamic route (`src/lib/seo/og-fonts.ts`) and the script load the TTF directly. Don't replace the TTF with a WOFF2 to save bytes — the PNG is rendered at build time, never re-fetched per request.

## Templates inventory

### Supabase auth (manual paste required)

```
src/lib/email/templates/supabase-auth/
├── change-email.html
├── confirm-signup.html
├── invite-user.html
├── magic-link.html
├── reauthentication.html
└── reset-password.html
```

Each is a complete, inlined HTML email with the wordmark `<img>` at the top, the action button, and footer links. None contain a one-time code (the app never had UI to consume OTPs — magic-link flows go through `exchangeCodeForSession` on the URL token).

### App emails (auto-deploy on merge)

```
src/lib/email/templates/components/
├── backrow-layout.tsx     # shared shell — wordmark, footer, social links
├── welcome.tsx
├── club-invite.tsx
├── notification-digest.tsx
└── ...
```

Authored with React Email; previewed via `bun run dev:email` (port 3001); rendered at send time by `src/lib/email/send.ts`. No manual paste step — `git push` ships them.

## Updating templates: checklist

When changing **any** Supabase auth template:

- [ ] Edit the `.html` file in `src/lib/email/templates/supabase-auth/`.
- [ ] Open the file in a browser to spot-check rendering.
- [ ] Paste the HTML into Supabase Dashboard → Authentication → Email Templates → matching template → Save.
- [ ] Send yourself a real email through the affected flow (e.g., trigger a password reset on your own account) to confirm the dashboard copy is what's serving.

When changing the wordmark or its font:

- [ ] Replace `public/fonts/Righteous-Regular.ttf` with the new font.
- [ ] Run `bun run wordmark:render`.
- [ ] Commit the regenerated `public/wordmark.png` along with the font swap.
- [ ] No template edits required — all templates already reference `/wordmark.png` and pick up the change automatically.

## Common failures

- **"Email shows sans-serif, not Righteous."** Email image proxies have cached an old PNG. Confirm `public/wordmark.png` was regenerated after the font change. Cache-busting query strings (`?v=2`) on email image URLs do **not** bust Gmail's proxy reliably; the right fix is to update the static PNG and wait out the proxy.
- **"I edited an auth template last week but the email I just got still shows the old version."** Almost always: the dashboard paste step was skipped. Fix by pasting now.
- **"The dynamic `/api/brand/wordmark` route returns a 500 in build but renders fine in dev."** `@vercel/og` doesn't support WOFF2; check `og-fonts.ts` is reading a TTF.
