import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { strategies, tacticalGoals } from "@/config/dropdownOptions";
import { strategyColorClass } from "@/lib/strategyColors";

/**
 * The single source of truth for the app-wide tactic system.
 * Any new category must be added here AND wired up everywhere this test
 * inspects, otherwise the suite will fail.
 */
const REQUIRED_TACTICS = [
  "Attacking",
  "Defending",
  "Countering",
  "Intercepting",
  "Transition",
  "Control",
] as const;

const REQUIRED_SET = new Set<string>(REQUIRED_TACTICS);

function readSrc(relativePath: string): string {
  return readFileSync(resolve(__dirname, "..", relativePath), "utf-8");
}

function expectExactSet(actual: readonly string[], label: string) {
  const actualSet = new Set(actual);
  // Same size and same members as the required set.
  expect(actualSet.size, `${label} has duplicates`).toBe(actual.length);
  expect(actualSet.size, `${label} count mismatch`).toBe(REQUIRED_TACTICS.length);
  for (const t of REQUIRED_TACTICS) {
    expect(actualSet.has(t), `${label} missing "${t}"`).toBe(true);
  }
  for (const t of actualSet) {
    expect(REQUIRED_SET.has(t), `${label} contains unexpected value "${t}"`).toBe(true);
  }
}

describe("Tactic system — exactly 6 categories everywhere", () => {
  it("uses the canonical 'Transition' spelling (not 'Transitions' or 'Transiction')", () => {
    expect(REQUIRED_TACTICS).toContain("Transition");
    expect(REQUIRED_TACTICS as readonly string[]).not.toContain("Transitions");
    expect(REQUIRED_TACTICS as readonly string[]).not.toContain("Transiction");
  });

  it("keeps Transition and Control as separate categories", () => {
    expect(REQUIRED_SET.has("Transition")).toBe(true);
    expect(REQUIRED_SET.has("Control")).toBe(true);
    expect("Transition").not.toEqual("Control");
  });

  describe("config/dropdownOptions.ts", () => {
    it("exports `strategies` with exactly the 6 required tactics", () => {
      expectExactSet([...strategies], "strategies");
    });

    it("exports `tacticalGoals` with exactly the 6 required tactics", () => {
      expectExactSet([...tacticalGoals], "tacticalGoals");
    });
  });

  describe("Strategy / TacticalGoal TypeScript types", () => {
    it("Strategy union literal contains exactly the 6 required tactics", () => {
      const src = readSrc("types/training.ts");
      const match = src.match(/export type Strategy\s*=\s*([^;]+);/);
      expect(match, "Strategy type not found in types/training.ts").toBeTruthy();
      const values = (match![1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));
      expectExactSet(values, "Strategy type union");
    });

    it("TacticalGoal union literal contains exactly the 6 required tactics", () => {
      const src = readSrc("types/training.ts");
      const match = src.match(/export type TacticalGoal\s*=\s*([^;]+);/);
      expect(match, "TacticalGoal type not found in types/training.ts").toBeTruthy();
      const values = (match![1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));
      expectExactSet(values, "TacticalGoal type union");
    });
  });

  describe("Tactic-based chart color map (Trends page)", () => {
    it("STRATEGY_COLORS covers all 6 required tactics", () => {
      const src = readSrc("pages/Trends.tsx");
      const block = src.match(/STRATEGY_COLORS[^=]*=\s*{([\s\S]*?)};/);
      expect(block, "STRATEGY_COLORS not found in Trends.tsx").toBeTruthy();
      const keys = (block![1].match(/^\s*([A-Za-z]+)\s*:/gm) ?? []).map((k) =>
        k.replace(/[:\s]/g, ""),
      );
      // Every required tactic must have a colour.
      for (const t of REQUIRED_TACTICS) {
        expect(keys, `STRATEGY_COLORS missing colour for "${t}"`).toContain(t);
      }
    });
  });

  describe("Pathway map filter (MyPathway page)", () => {
    it("local strategies array contains exactly the 6 required tactics", () => {
      const src = readSrc("pages/MyPathway.tsx");
      const match = src.match(/const\s+strategies\s*=\s*\[([^\]]+)\]/);
      expect(match, "strategies array not found in MyPathway.tsx").toBeTruthy();
      const values = (match![1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));
      expectExactSet(values, "MyPathway strategies filter");
    });
  });

  describe("Strategy color class mapping (badges/charts)", () => {
    it("provides a CSS class for each of the 6 required tactics", () => {
      for (const t of REQUIRED_TACTICS) {
        expect(
          strategyColorClass[t],
          `strategyColorClass missing class for "${t}"`,
        ).toBeTruthy();
      }
    });
  });

  describe("Validation rules — Select dropdowns + form state", () => {
    it("TechniqueChainForm Tactical Goal dropdown is driven by `tacticalGoals` (all 6)", () => {
      const src = readSrc("components/TechniqueChainForm.tsx");
      // Must import the tacticalGoals array from the central config.
      expect(src).toMatch(/tacticalGoals/);
      // Must render every entry as a SelectItem (dynamic .map, not hard-coded).
      expect(src).toMatch(/tacticalGoals\.map/);
      // The TacticalGoal type drives setState — guarantees enum-only writes.
      expect(src).toMatch(/TacticalGoal/);
    });

    it("SessionForm Tactic dropdown is driven by `strategies` (all 6)", () => {
      const src = readSrc("components/SessionForm.tsx");
      expect(src).toMatch(/strategies/);
      expect(src).toMatch(/strategies\.map/);
      // Strategy type drives state, preventing arbitrary tactic values.
      expect(src).toMatch(/Strategy/);
    });
  });

  describe("Legacy spelling guard", () => {
    // Old data may still legitimately contain "Transitions"; we keep a
    // backwards-compat fallback in chart colours and badge classes ONLY.
    // No NEW dropdown / filter / type / config may use it.
    const FORBIDDEN_FILES = [
      "config/dropdownOptions.ts",
      "types/training.ts",
      "pages/MyPathway.tsx",
      "components/TechniqueChainForm.tsx",
      "components/SessionForm.tsx",
    ];

    for (const file of FORBIDDEN_FILES) {
      it(`${file} must not reference the legacy 'Transitions' spelling`, () => {
        const src = readSrc(file);
        expect(
          src.includes("'Transitions'") || src.includes('"Transitions"'),
          `${file} still contains legacy 'Transitions' spelling`,
        ).toBe(false);
      });
    }
  });
});
