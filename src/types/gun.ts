export interface StrafePattern {
  direction: 'left' | 'right';
  duration: number; // in milliseconds
}

export type WeaponCategory = 'ar' | 'lmg' | 'smg' | 'pistol' | 'marksman' | 'sniper' | 'custom';

export interface Gun {
  id: string;
  name: string;
  strafePattern: StrafePattern[];
  category: WeaponCategory;
  image: string; // public path to svg icon
  ammo?: 'light' | 'heavy' | 'energy' | 'shotgun' | 'sniper' | 'arrow' | 'care';
  remarks?: string[];
  reloadTimeSeconds?: number; // base reload duration for this weapon
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
