import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { NoDataState } from './NoDataState';

export interface PieDatum {
  name: string;
  value: number;
}

interface PieTrendCardProps {
  title: string;
  data: PieDatum[];
  colorMap?: Record<string, string>;
}

const FALLBACK_COLORS = [
  'hsl(var(--primary))',
  '#4ECDC4',
  '#F9C74F',
  '#A78BFA',
  '#FF6B6B',
  '#45B7D1',
  '#F472B6',
  '#34D399',
  '#FBBF24',
  '#60A5FA',
  '#FB7185',
  '#A3E635',
];

export function PieTrendCard({ title, data, colorMap }: PieTrendCardProps) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const colored = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        color: colorMap?.[d.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
    [data, colorMap],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'record' : 'records'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <NoDataState />
        ) : (
          <div className="space-y-3">
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={colored}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={62}
                    paddingAngle={2}
                  >
                    {colored.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / total) * 100).toFixed(0)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5">
              {colored
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((d) => {
                  const pct = ((d.value / total) * 100).toFixed(0);
                  return (
                    <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {d.value} · {pct}%
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
