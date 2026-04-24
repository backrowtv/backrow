# Supabase Auth Email Templates

These are **BackRow-themed HTML emails for Supabase's built-in Auth flows**. They are not sent from our Node code — Supabase renders them server-side and sends via its own SMTP.

## Why these exist

The default Supabase auth templates are unbranded. Our custom transactional emails (welcome, club invite, notifications) already match the BackRow palette via React Email, but Supabase Auth doesn't run React Email — it uses its own Go templating on static HTML. These files are the themed HTML to paste into the Supabase dashboard.

## How to apply

1. Open the Supabase dashboard: `https://supabase.com/dashboard/project/nxpeptgrhbveqphwwowj`
2. Go to **Auth → Email Templates**
3. For each template below, open the editor, paste the matching file's contents verbatim, and save.

| Supabase template    | File                    |
| -------------------- | ----------------------- |
| Confirm signup       | `confirm-signup.html`   |
| Invite user          | `invite-user.html`      |
| Magic Link           | `magic-link.html`       |
| Change Email Address | `change-email.html`     |
| Reset Password       | `reset-password.html`   |
| Reauthentication     | `reauthentication.html` |

## Palette

Matches `src/lib/email/templates/components/backrow-layout.tsx` exactly:

- Primary sage-green: `#6B9B6B`
- Header background: `#1a1a1a`
- Container background: `#ffffff`
- Body background: `#f5f5f5`
- Border: `#e5e5e5`
- Text (primary / muted / faint): `#1a1a1a` / `#666` / `#999`
- Righteous wordmark via Google Fonts CDN (`fonts.gstatic.com/s/righteous/...`), falls back to Arial

## Template variables

Supabase replaces these at send time — leave them untouched if you edit a template:

- `{{ .ConfirmationURL }}` — full action URL
- `{{ .Token }}` — 6-digit OTP code
- `{{ .SiteURL }}` — configured site URL (`backrow.tv`)
- `{{ .Email }}` — recipient address
- `{{ .NewEmail }}` — new address (change-email only)

## Verification

After pasting:

1. Trigger a fresh signup with a throwaway address → confirm signup email renders branded.
2. Request a password reset from `/sign-in` → reset password email renders branded.
3. If you use magic-link or invite flows, spot-check those too.

If a client strips the Google Fonts import (some corporate mail filters do), the wordmark falls back to Arial bold — still readable, just not Righteous.
