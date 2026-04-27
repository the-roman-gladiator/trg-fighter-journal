export const strategyColorClass: Record<string, string> = {
  Attacking: 'strategy-attacking',
  Defending: 'strategy-defending',
  Countering: 'strategy-countering',
  Intercepting: 'strategy-intercepting',
  Transiction: 'strategy-transitions',
  // Legacy spelling fallback (older data)
  Transitions: 'strategy-transitions',
  Control: 'strategy-control',
};

export function getStrategyClass(strategy: string): string {
  return strategyColorClass[strategy] || '';
}
