/**
 * Discipline-aware tactic system.
 *
 * Single source of truth for which tactic categories are allowed per discipline.
 * Use `getAllowedTactics(discipline)` everywhere a tactic dropdown is rendered
 * so that, for example, K1 never offers "Control".
 */

import { strategies } from '@/config/dropdownOptions';
import type { Strategy } from '@/types/training';

export const ALL_TACTICS: readonly Strategy[] = strategies;

/**
 * Discipline → allowed tactics. Keep the order stable so dropdowns are predictable.
 *
 * Rules (per coaching brief):
 *  - MMA, Wrestling, Grappling, BJJ → all six tactics
 *  - Muay Thai → all six (Control is "limited" in real grappling sense
 *    but still useful for clinch/cage/wrist control vocabulary)
 *  - K1 → no Control (no long-term opponent control allowed in ruleset)
 */
const DISCIPLINE_TACTICS: Record<string, readonly Strategy[]> = {
  MMA: ALL_TACTICS,
  'Muay Thai': ALL_TACTICS,
  K1: ALL_TACTICS.filter((t) => t !== 'Control'),
  Wrestling: ALL_TACTICS,
  Grappling: ALL_TACTICS,
  BJJ: ALL_TACTICS,
  Boxing: ALL_TACTICS.filter((t) => t !== 'Control'),
};

export function getAllowedTactics(discipline?: string | null): readonly Strategy[] {
  if (!discipline) return ALL_TACTICS;
  return DISCIPLINE_TACTICS[discipline] ?? ALL_TACTICS;
}

export function isTacticAllowed(discipline: string | null | undefined, tactic: string): boolean {
  return getAllowedTactics(discipline).includes(tactic as Strategy);
}
