import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Discipline, TacticalGoal, TechniqueChain } from '@/types/training';
import {
  disciplines,
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
  const [discipline, setDiscipline] = useState<Discipline>(technique?.discipline || defaultDiscipline);
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

    const techniqueData: Partial<TechniqueChain> = {
      discipline,
      sub_type: subType,
      tactical_goal: tacticalGoal,
      starting_action: startingAction,
      defender_reaction: defenderReaction,
      continuation_finish: continuationFinish,
      custom_notes: customNotes || null,
    };

    onSave(techniqueData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Technique / Combo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="discipline">Discipline</Label>
            <Select value={discipline} onValueChange={(value: any) => setDiscipline(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {disciplines.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subTypes.length > 0 && (
            <div>
              <Label htmlFor="subType">Sub-Type</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-type" />
                </SelectTrigger>
                <SelectContent>
                  {subTypes.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="tacticalGoal">Tactical Goal</Label>
            <Select value={tacticalGoal} onValueChange={(value: any) => setTacticalGoal(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tacticalGoals.map((tg) => (
                  <SelectItem key={tg} value={tg}>
                    {tg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subType && (
            <>
              <div>
                <Label htmlFor="startingAction">Starting Action</Label>
                <Select value={startingAction} onValueChange={setStartingAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select starting action" />
                  </SelectTrigger>
                  <SelectContent>
                    {startingActions.map((sa) => (
                      <SelectItem key={sa} value={sa}>
                        {sa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="defenderReaction">Defender Reaction</Label>
                <Select value={defenderReaction} onValueChange={setDefenderReaction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select defender reaction" />
                  </SelectTrigger>
                  <SelectContent>
                    {defenderReactions.map((dr) => (
                      <SelectItem key={dr} value={dr}>
                        {dr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="continuationFinish">Continuation / Finish</Label>
                <Select value={continuationFinish} onValueChange={setContinuationFinish}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select continuation/finish" />
                  </SelectTrigger>
                  <SelectContent>
                    {continuationFinishes.map((cf) => (
                      <SelectItem key={cf} value={cf}>
                        {cf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="customNotes">Custom Notes (optional)</Label>
            <Textarea
              id="customNotes"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this technique..."
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={!subType || !startingAction || !defenderReaction || !continuationFinish}
            >
              Save Technique
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
