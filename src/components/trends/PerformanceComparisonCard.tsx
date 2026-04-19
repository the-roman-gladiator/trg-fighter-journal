import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from 'recharts';
import { NoDataState } from './NoDataState';
import { LineChart as LineIcon } from 'lucide-react';

type SessionRow = Record<string, any>;

export interface ComparisonOption {
  value: string;
  label: string;
  fieldA: string;
  fieldB: string;
  labelA: string;
  labelB: string;
}

export const COMPARISON_OPTIONS: ComparisonOption[] = [
  {
    value: 'before_emotion_vs_after_emotion',
    label: 'Emotion Before vs Emotion After',
    fieldA: 'before_emotion',
    fieldB: 'after_emotion',
    labelA: 'Before',
    labelB: 'After',
  },
  {
    value: 'before_emotion_vs_before_mindset',
    label: 'Emotion Before vs Mindset Before',
    fieldA: 'before_emotion',
    fieldB: 'before_mindset',
    labelA: 'Emotion',
    labelB: 'Mindset',
  },
  {
    value: 'before_emotion_vs_after_mindset',
    label: 'Emotion Before vs Mindset After',
    fieldA: 'before_emotion',
    fieldB: 'after_mindset',
    labelA: 'Emotion (B)',
    labelB: 'Mindset (A)',
  },
  {
    value: 'after_emotion_vs_before_mindset',
    label: 'Emotion After vs Mindset Before',
    fieldA: 'after_emotion',
    fieldB: 'before_mindset',
    labelA: 'Emotion (A)',
    labelB: 'Mindset (B)',
  },
  {
    value: 'after_emotion_vs_after_mindset',
    label: 'Emotion After vs Mindset After',
    fieldA: 'after_emotion',
    fieldB: 'after_mindset',
    labelA: 'Emotion',
    labelB: 'Mindset',
  },
  {
    value: 'before_mindset_vs_after_mindset',
    label: 'Mindset Before vs Mindset After',
    fieldA: 'before_mindset',
    fieldB: 'after_mindset',
    labelA: 'Before',
    labelB: 'After',
  },
  {
    value: 'physical_effort_vs_mental_effort',
    label: 'Physical Effort vs Mental Effort',
    fieldA: 'physical_effort_level',
    fieldB: 'mental_effort_level',
    labelA: 'Physical',
    labelB: 'Mental',
  },
];

const EFFORT_ORDER = ['Easy', 'Light', 'Moderate', 'Hard', 'Max'];
const EFFORT_FIELDS = new Set(['physical_effort_level', 'mental_effort_level']);

interface PerformanceComparisonCardProps {
  sessions: SessionRow[];
}

export function PerformanceComparisonCard({ sessions }: PerformanceComparisonCardProps) {
  const [selected, setSelected] = useState(COMPARISON_OPTIONS[0].value);
  const option = COMPARISON_OPTIONS.find((o) => o.value === selected)!;

  const { chartData, validCount, isNumeric } = useMemo(() => {
    const valid = sessions.filter(
      (s) => s[option.fieldA] != null && s[option.fieldA] !== '' && s[option.fieldB] != null && s[option.fieldB] !== '',
    );
    const numeric = EFFORT_FIELDS.has(option.fieldA) && EFFORT_FIELDS.has(option.fieldB);

    if (numeric) {
      // Average effort comparison: single grouped row
      const toScore = (v: string) => Math.max(0, EFFORT_ORDER.indexOf(v) + 1);
      const avg = (key: string) =>
        valid.reduce((sum, s) => sum + toScore(s[key]), 0) / (valid.length || 1);
      return {
        chartData: [
          { category: 'Average Level', [option.labelA]: +avg(option.fieldA).toFixed(2), [option.labelB]: +avg(option.fieldB).toFixed(2) },
        ],
        validCount: valid.length,
        isNumeric: true,
      };
    }

    // Categorical: count occurrences for each category across both fields
    const categories = new Set<string>();
    valid.forEach((s) => {
      categories.add(String(s[option.fieldA]));
      categories.add(String(s[option.fieldB]));
    });
    const data = Array.from(categories).map((cat) => {
      const a = valid.filter((s) => s[option.fieldA] === cat).length;
      const b = valid.filter((s) => s[option.fieldB] === cat).length;
      return { category: cat, [option.labelA]: a, [option.labelB]: b };
    });
    data.sort(
      (x, y) =>
        (Number(y[option.labelA]) + Number(y[option.labelB])) -
        (Number(x[option.labelA]) + Number(x[option.labelB])),
    );
    return { chartData: data, validCount: valid.length, isNumeric: false };
  }, [sessions, option]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <LineIcon className="h-4 w-4 text-primary" />
          My Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select a comparison" />
          </SelectTrigger>
          <SelectContent>
            {COMPARISON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {validCount === 0 ? (
          <NoDataState message="Not enough data to compare for this period." />
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              Based on <span className="font-semibold text-foreground">{validCount}</span> valid{' '}
              {validCount === 1 ? 'session' : 'sessions'}
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval={0}
                    angle={chartData.length > 4 ? -25 : 0}
                    textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                    height={chartData.length > 4 ? 60 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={isNumeric}
                    domain={isNumeric ? [0, 5] : undefined}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                  <Bar dataKey={option.labelA} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={option.labelB} fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
