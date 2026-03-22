import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CardioType } from '@/types/training';
import { cardioTypes } from '@/config/dropdownOptions';

interface CardioActivityFormProps {
  cardioActivityName: string;
  setCardioActivityName: (v: string) => void;
  cardioType: CardioType | '';
  setCardioType: (v: CardioType) => void;
  durationSeconds: number | null;
  setDurationSeconds: (v: number | null) => void;
  distanceMeters: number | null;
  setDistanceMeters: (v: number | null) => void;
  calories: number | null;
  setCalories: (v: number | null) => void;
  avgPace: number | null;
  setAvgPace: (v: number | null) => void;
  avgHeartRate: number | null;
  setAvgHeartRate: (v: number | null) => void;
  maxHeartRate: number | null;
  setMaxHeartRate: (v: number | null) => void;
}

function formatDuration(totalSeconds: number | null): { hours: string; minutes: string; seconds: string } {
  if (!totalSeconds) return { hours: '', minutes: '', seconds: '' };
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { hours: h > 0 ? String(h) : '', minutes: String(m), seconds: String(s) };
}

function parseDuration(hours: string, minutes: string, seconds: string): number | null {
  const h = parseInt(hours) || 0;
  const m = parseInt(minutes) || 0;
  const s = parseInt(seconds) || 0;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

export function CardioActivityForm(props: CardioActivityFormProps) {
  const dur = formatDuration(props.durationSeconds);

  const handleDurationChange = (field: 'hours' | 'minutes' | 'seconds', value: string) => {
    const updated = { ...dur, [field]: value };
    props.setDurationSeconds(parseDuration(updated.hours, updated.minutes, updated.seconds));
  };

  const numChange = (setter: (v: number | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value === '' ? null : Number(e.target.value));
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label>Activity Name</Label>
          <Input value={props.cardioActivityName} onChange={e => props.setCardioActivityName(e.target.value)} placeholder="e.g., Morning Run" />
        </div>

        <div>
          <Label>Cardio Type</Label>
          <Select value={props.cardioType} onValueChange={(v: CardioType) => props.setCardioType(v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {cardioTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Duration</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Input type="number" min="0" placeholder="Hours" value={dur.hours} onChange={e => handleDurationChange('hours', e.target.value)} />
            </div>
            <div>
              <Input type="number" min="0" max="59" placeholder="Min" value={dur.minutes} onChange={e => handleDurationChange('minutes', e.target.value)} />
            </div>
            <div>
              <Input type="number" min="0" max="59" placeholder="Sec" value={dur.seconds} onChange={e => handleDurationChange('seconds', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Distance (meters)</Label>
            <Input type="number" min="0" value={props.distanceMeters ?? ''} onChange={numChange(props.setDistanceMeters)} placeholder="e.g., 5000" />
          </div>
          <div>
            <Label>Calories</Label>
            <Input type="number" min="0" value={props.calories ?? ''} onChange={numChange(props.setCalories)} placeholder="kcal" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Avg Pace (sec/km)</Label>
            <Input type="number" min="0" value={props.avgPace ?? ''} onChange={numChange(props.setAvgPace)} placeholder="e.g., 330" />
          </div>
          <div>
            <Label>Avg Heart Rate</Label>
            <Input type="number" min="0" value={props.avgHeartRate ?? ''} onChange={numChange(props.setAvgHeartRate)} placeholder="bpm" />
          </div>
        </div>

        <div>
          <Label>Max Heart Rate</Label>
          <Input type="number" min="0" value={props.maxHeartRate ?? ''} onChange={numChange(props.setMaxHeartRate)} placeholder="bpm" />
        </div>
      </CardContent>
    </Card>
  );
}
