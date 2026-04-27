export const strategyColorClass: Record<string, string> = {
  Attacking: 'strategy-attacking',
  Defending: 'strategy-defending',
  Countering: 'strategy-countering',
  Intercepting: 'strategy-intercepting',
  Transition: 'strategy-transitions',
  // Legacy spelling fallbacks (older saved data only — never use in new code)
  Transitions: 'strategy-transitions',
  Transiction: 'strategy-transitions',
  Control: 'strategy-control',
};

export function getStrategyClass(strategy: string): string {
  return strategyColorClass[strategy] || '';
}
