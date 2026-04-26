## Goal
Make coach invitations actually email the recipient (with the invite code, the inviter's name, the assigned level/disciplines, and a link to sign up + redeem). Today, no email is sent — the app only generates a code for you to copy/paste manually.

## Why no email arrived
- The project has **no email domain configured** in Lovable Cloud.
- There is **no edge function** that sends invitation emails.
- `CoachInvitations.tsx` only inserts a row into `coach_invitations` and displays the code in the UI.

## What I'll build

### 1. Email infrastructure (one-time setup)
- Set up an email sender domain (you'll be prompted to enter the domain you want emails to come from, e.g. `notify.yourdomain.com`).
- Provision Lovable's built-in email queue and infrastructure (no external API key, no Resend account needed).

### 2. Transactional email template — `coach-invitation`
Branded React Email template matching the TRG dark theme (Cinzel header, Primary #B11226, white body background as required for emails). Content:
- "You've been invited to join [Academy] as a [Coach Level]"
- Inviter's name
- Assigned disciplines
- The invite code (large, monospace, copy-friendly)
- Button: "Accept invitation" → links to your published app's `/auth` (then they redeem the code from their profile)
- Expiry date

### 3. Wire up sending in `CoachInvitations.tsx`
After the `coach_invitations` row is successfully inserted, call `supabase.functions.invoke('send-transactional-email', ...)` with:
- `templateName: 'coach-invitation'`
- `recipientEmail`: the invited email
- `idempotencyKey`: `coach-invite-${invitation.id}` (so retries don't double-send)
- `templateData`: `{ inviterName, coachLevel, disciplines, inviteCode, expiresAt, acceptUrl }`

Update the success toast from "Share code with X" → "Invitation emailed to X" and keep the on-screen code as a fallback (in case email is delayed or lands in spam).

### 4. Optional polish
- Add a "Resend email" button next to each pending invitation in the Sent Invitations list (re-invokes the edge function with the same idempotency key prefix + `-resend-N`).

## Files I'll create / modify
- **New**: `supabase/functions/send-transactional-email/` (scaffolded automatically)
- **New**: `supabase/functions/_shared/transactional-email-templates/coach-invitation.tsx`
- **New**: `supabase/functions/_shared/transactional-email-templates/registry.ts` (scaffolded)
- **New**: `supabase/functions/handle-email-unsubscribe/` + `handle-email-suppression/` (scaffolded)
- **New**: `/unsubscribe` page in the app (required for compliance)
- **Modified**: `src/components/coach/CoachInvitations.tsx` — invoke the edge function after insert; update toast copy

## What you'll need to do
- Provide the sender domain you own (e.g. `trg.tech` or similar) when prompted, and add the NS records Lovable gives you at your domain registrar. DNS propagation can take up to 72h, but I can scaffold and deploy everything immediately — emails just start flowing once DNS verifies.

## What I will NOT do
- Will not use Resend, SendGrid, or any third-party email service (Lovable's built-in system handles this end-to-end).
- Will not change the existing manual code-sharing fallback — it stays as a backup.
- Will not change any RLS or coach hierarchy logic.

## Quick alternative if you don't want to set up a domain right now
I can instead just relabel the UI honestly ("Copy this code and send it to the coach yourself") and remove the misleading "Sent Invitations" / email-implying language — no infrastructure work needed. Let me know which path you prefer.