export interface DirectionStep {
  type: 'direction';
  direction: 'left' | 'right';
  duration: number; // in milliseconds
}

export interface ShootStep {
  type: 'shoot';
  duration: number; // in milliseconds
}

export type Pattern = DirectionStep | ShootStep;

export type WeaponCategory = 'ar' | 'lmg' | 'smg' | 'pistol' | 'marksman' | 'sniper' | 'custom';

export interface Gun {
  id: string;
  name: string;
  // Map of pattern variants: e.g., { default: [...], charged: [...], 'non-charged': [...] }
  pattern: Record<string, Pattern[]>;
  category: WeaponCategory;
  image: React.ComponentType<React.SVGProps<SVGSVGElement>> | string; // public path to svg icon
  ammo?: 'light' | 'heavy' | 'energy' | 'shotgun' | 'sniper' | 'arrow' | 'care';
  remarks?: string[];
  reloadTimeSeconds?: number; // base reload duration for this weapon
}

export type PhaseId = 'start' | 'pattern' | 'end';

export interface AudioCue {
  /** Semantic cue type */
  type: 'start' | 'shoot' | 'direction' | 'end';
  /** When to play this cue, in milliseconds from cycle start */
  timestamp: number;
  /** Oscillator frequency for this cue */
  frequencyHz: number;
  /** Cue length in seconds */
  lengthSec: number;
  /** Optional amplitude (0..1), defaults to 1.0 */
  amplitude?: number;
  /** Phase association for UI grouping */
  phase: PhaseId;
  /** Present only for direction cues */
  direction?: 'left' | 'right';
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
