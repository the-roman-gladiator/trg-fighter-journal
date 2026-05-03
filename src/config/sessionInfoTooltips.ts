export interface SessionInfoEntry {
  boxId: string;
  shortAnswer: string;
  detailedExplanation: string;
}

export const sessionInfoTooltips: Record<string, SessionInfoEntry> = {
  'core-info': {
    boxId: 'core-info',
    shortAnswer:
      'Quick snapshot of the session — discipline, tactic, technique, intensity and how you felt.',
    detailedExplanation:
      'These are the headline facts of your training session. Discipline tells you what art you trained, tactic frames the strategic intent, and technique pinpoints what you drilled. Intensity (1–10) and feeling capture the physical and mental load so you can spot trends across weeks.',
  },
  'movement-chain': {
    boxId: 'movement-chain',
    shortAnspwer: '',
    shortAnswer:
      'The 1st–2nd–3rd action sequence: what you did, what your opponent did, and your follow-up.',
    detailedExplanation:
      'Movement chains break a moment of sparring or drilling into three beats so the pattern is reusable. Logging them consistently builds your personal playbook and helps coaches see exactly where a sequence works — or breaks down.',
  },
  notes: {
    boxId: 'notes',
    shortAnswer: 'Free-form thoughts, cues, mistakes, or anything you want to remember later.',
    detailedExplanation:
      'Use notes for the details that don\'t fit a structured field — coaching cues, what your partner did, how a technique felt, or reminders for next session. These become gold when you review your journal weeks or months later.',
  },
  video: {
    boxId: 'video',
    shortAnswer: 'A link to footage of this session for review.',
    detailedExplanation:
      'Attach a video URL (YouTube, Vimeo, Drive, etc.) so you can re-watch and analyse. Pairing notes with footage is the fastest way to spot habits and accelerate learning.',
  },
  tags: {
    boxId: 'tags',
    shortAnswer: 'Auto-generated and custom labels that make this session searchable.',
    detailedExplanation:
      'Tags are pulled from your discipline, tactic, technique and notes, plus anything you add manually. They power filtering on the dashboard and trends pages, so the more accurate the tags, the better your insights.',
  },
};
