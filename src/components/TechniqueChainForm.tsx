import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Discipline, MartialArtsDiscipline, TacticalGoal, TechniqueChain, isMartialArt } from '@/types/training';
import {
  martialArtsDisciplines,
  tacticalGoals,
  getSubTypes,
  getStartingActions,
  getDefenderReactions,
  getContinuationFinishes,
} from '@/config/dropdownOptions';

interface TechniqueChainFormProps {
  defaultDiscipline: Discipline;
  technique?: TechniqueChain;
  onSave: (technique: Partial<TechniqueChain>) => void;
  onCancel: () => void;
}

export function TechniqueChainForm({
  defaultDiscipline,
  technique,
  onSave,
  onCancel,
}: TechniqueChainFormProps) {
  const initialDiscipline: MartialArtsDiscipline = technique?.discipline || (isMartialArt(defaultDiscipline) ? defaultDiscipline : 'MMA');
  const [discipline, setDiscipline] = useState<MartialArtsDiscipline>(initialDiscipline);
  const [subType, setSubType] = useState(technique?.sub_type || '');
  const [tacticalGoal, setTacticalGoal] = useState<TacticalGoal>(technique?.tactical_goal || 'Attacking');
  const [startingAction, setStartingAction] = useState(technique?.starting_action || '');
  const [defenderReaction, setDefenderReaction] = useState(technique?.defender_reaction || '');
  const [continuationFinish, setContinuationFinish] = useState(technique?.continuation_finish || '');
  const [customNotes, setCustomNotes] = useState(technique?.custom_notes || '');

  const subTypes = getSubTypes(discipline);
  const startingActions = getStartingActions(discipline, subType);
  const defenderReactions = getDefenderReactions(discipline, subType);
  const continuationFinishes = getContinuationFinishes(discipline, subType);

  useEffect(() => {
    setSubType('');
    setStartingAction('');
    setDefenderReaction('');
    setContinuationFinish('');
  }, [discipline]);

  useEffect(() => {
    setStartingAction('');
    setDefenderReaction('');
    setContinuationFinish('');
  }, [subType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      discipline,
      sub_type: subType,
      tactical_goal: tacticalGoal,
      starting_action: startingAction,
      defender_reaction: defenderReaction,
      continuation_finish: continuationFinish,
      custom_notes: customNotes || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Technique / Combo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Discipline</Label>
            <Select value={discipline} onValueChange={(v: string) => setDiscipline(v as MartialArtsDiscipline)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {martialArtsDisciplines.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subTypes.length > 0 && (
            <div>
              <Label>Sub-Type</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger><SelectValue placeholder="Select sub-type" /></SelectTrigger>
                <SelectContent>
                  {subTypes.map((st) => (<SelectItem key={st} value={st}>{st}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Tactical Goal</Label>
            <Select value={tacticalGoal} onValueChange={(v: string) => setTacticalGoal(v as TacticalGoal)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tacticalGoals.map((tg) => (<SelectItem key={tg} value={tg}>{tg}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {subType && (
            <>
              <div>
                <Label>Starting Action</Label>
                <Select value={startingAction} onValueChange={setStartingAction}>
                  <SelectTrigger><SelectValue placeholder="Select starting action" /></SelectTrigger>
                  <SelectContent>
                    {startingActions.map((sa) => (<SelectItem key={sa} value={sa}>{sa}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Defender Reaction</Label>
                <Select value={defenderReaction} onValueChange={setDefenderReaction}>
                  <SelectTrigger><SelectValue placeholder="Select defender reaction" /></SelectTrigger>
                  <SelectContent>
                    {defenderReactions.map((dr) => (<SelectItem key={dr} value={dr}>{dr}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Continuation / Finish</Label>
                <Select value={continuationFinish} onValueChange={setContinuationFinish}>
                  <SelectTrigger><SelectValue placeholder="Select continuation/finish" /></SelectTrigger>
                  <SelectContent>
                    {continuationFinishes.map((cf) => (<SelectItem key={cf} value={cf}>{cf}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label>Custom Notes (optional)</Label>
            <Textarea value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={3} placeholder="Additional notes..." />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={!subType || !startingAction || !defenderReaction || !continuationFinish}>Add Technique</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
