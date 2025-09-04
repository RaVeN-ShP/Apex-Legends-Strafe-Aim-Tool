export interface StrafePattern {
  direction: 'left' | 'right';
  duration: number; // in milliseconds
}

export type WeaponCategory = 'ar' | 'lmg' | 'smg' | 'pistol' | 'marksman' | 'sniper';

export interface Gun {
  id: string;
  name: string;
  strafePattern: StrafePattern[];
  category: WeaponCategory;
  image: string; // public path to svg icon
}

export type PhaseId = 'start' | 'pattern' | 'end';

export interface AudioCue {
  direction: 'left' | 'right';
  timestamp: number; // when to play this cue
  phase: PhaseId;
}

export interface Phase {
  id: PhaseId;
  name: string;
  startTime: number;
  endTime: number;
  cues: AudioCue[];
}

export interface Timeline {
  phases: Phase[];
  totalDurationMs: number;
}
