---
name: coach-hierarchy-system
description: Coach roles, MMA-sees-all discipline rule, hierarchy delegation toggle, and nomination chain
type: feature
---

## Coach levels (in `profiles.coach_level`)
- `head_coach` — full access, can nominate any level
- `main_coach` — can nominate L2 / L1 only when delegation is ON
- `level_2` — can nominate L1 only when delegation is ON
- `level_1` — cannot nominate

## Discipline access (MMA rule)
If a coach has `MMA` in `assigned_disciplines`, they can see ALL disciplines. Otherwise scoped to their assigned list. Head coaches and admins always see everything. Implemented in DB via `coach_can_access_discipline(_user_id, _discipline)` SECURITY DEFINER and in UI via `useCoachAccess()` hook.

## Delegation toggle
`profiles.hierarchy_delegation_enabled` (head coach only). Function `delegated_nominations_enabled()` returns true if any head coach has it on. Gates Main + L2 nominations server-side via the `coach_invitations` INSERT policy and `can_invite_coach_level()`. UI control: `<HierarchySettings />` rendered in Coach Dashboard → Coaches tab.

## Centralized hook
`src/hooks/useCoachAccess.tsx` exposes: `isHeadCoach`, `isMainCoach`, `isLevel2`, `isLevel1`, `accessibleDisciplines`, `assignableDisciplines`, `delegationEnabled`, `canNominate`, `allowedNominationLevels`, `canAccessDiscipline()`. Always use this hook for permission checks instead of reading `profile.coach_level` directly.
