## Goal
Make `trg.tech25@gmail.com` a full **developer account** with unrestricted visibility across every part of the app (sessions, fighter notes, AI notes, subscriptions, support tickets, archives, motivations, coach data, all profiles, etc.).

## Current state of the account
Confirmed via DB query — `trg.tech25@gmail.com` (id `6599542f-54e2-4b27-847c-83264d1042e9`) currently has:
- ✅ `coach_level = head_coach`
- ✅ All 6 disciplines assigned (MMA, Muay Thai, K1, Wrestling, Grappling, BJJ)
- ✅ `approval_status = approved`
- ❌ **Missing the `admin` role** in `user_roles` (only has `coach`)

The `admin` role is what unlocks the “see everything” RLS policies across the database — without it, the account is just a head coach and is blocked from many tables.

## What admin unlocks (existing RLS already in place)
The codebase already has admin-only policies on these tables — adding the role will instantly grant access:
- `ai_fighter_notes` — view/edit all AI notes from every user
- `subscriptions` — manage all subscriptions
- `support_tickets` — view & update all tickets
- `technique_archive` — view all users’ personal archives
- `technique_library` — manage the master library
- `motivations_library` — manage daily motivation entries
- `user_roles` — manage roles for other users
- `workout_templates` — manage all templates
- `is_pro_user()` returns true → unlocks every Pro-gated feature
- `useSubscription` hook already returns `isPro: true` and `isAdmin: true` automatically

## What still won’t be visible after adding admin (gaps to close)
A few tables only have **head_coach** policies, not admin policies. Since the account is also head_coach those are already covered, but a few tables only let users see their own rows with no override at all:
- `training_sessions` — head coaches can only see sessions where `make_fighter_note = true`. To truly see everything, we need an admin SELECT policy.
- `fighter_sessions`, `coach_sessions`, `daily_reflections`, `pathway_nodes`, `pathway_edges`, `notification_settings`, `assigned_programs`, `athlete_plan_assignments`, etc. — owner-only, no admin override.

To make this a real **developer** account, I’ll add admin-override SELECT policies to those tables too.

## Implementation steps

### 1. Add the `admin` role to the account (data change)
Insert into `user_roles`:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('6599542f-54e2-4b27-847c-83264d1042e9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. Add admin-override SELECT policies (schema migration)
For each table below, add a policy: `USING (has_role(auth.uid(), 'admin'))`.
- `training_sessions`
- `fighter_sessions`
- `coach_sessions`
- `daily_reflections`
- `pathway_nodes`
- `pathway_edges`
- `technique_chains`
- `session_tags`
- `strength_workout_exercises`
- `strength_workout_sets`
- `assigned_programs`
- `assigned_program_sessions`
- `athlete_plan_assignments`
- `athlete_plan_session_progress`
- `body_composition_classifications`
- `notification_settings`
- `fighter_profiles` (already has head_coach SELECT, admin override added for symmetry)
- `coach_invitations`
- `profiles` (admins can view all profiles — currently only own + head-coach-of-fighter-applicants)

All policies use the existing `has_role(_user_id, _role)` security-definer function — no recursion risk.

### 3. No frontend changes required
- `useSubscription` already detects admin and returns `isPro = true` + `isAdmin = true`.
- No UI is hidden behind explicit `isAdmin` checks beyond what RLS already controls.

## Result
After this change, signing in as `trg.tech25@gmail.com` will:
- Keep all existing head-coach powers (invite coaches, approve fighters, manage hierarchy)
- Unlock every Pro/admin gated feature automatically
- Allow read access to **every** user’s sessions, notes, pathways, reflections, plans, support tickets, AI notes, archives, and profiles — true developer visibility
- Other users remain unaffected — only this account gains the elevated access

## Files / changes
- 1 SQL migration to add the admin-override SELECT policies on the listed tables
- 1 data insert to grant the `admin` role to the account
- No code/UI files need editing