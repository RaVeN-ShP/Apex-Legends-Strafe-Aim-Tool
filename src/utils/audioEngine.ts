import { AudioCue, Timeline } from '@/types/gun';

export class AudioEngine {
  ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private toneOsc: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;
  baseStartSec = 0;
  scheduledUntilSec = 0;
  private schedulerId: number | null = null;

  private ensureContext() {
    if (!this.ctx) {
      const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctx ? new Ctx() : null;
    }
  }

  async resume() {
    this.ensureContext();
    try { await this.ctx!.resume(); } catch {}
  }

  setVolume(volume: number) {
    const v = Math.max(0.0001, Math.min(1, volume));
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      const gainParam = this.masterGain.gain;
      try {
        // Smooth, short linear ramp to avoid zipper noise when slider moves quickly
        const current = gainParam.value;
        gainParam.cancelScheduledValues(now);
        gainParam.setValueAtTime(current, now);
        gainParam.linearRampToValueAtTime(v, now + 0.05);
      } catch {
        try { gainParam.setValueAtTime(v, now); } catch {}
      }
    }
  }

  getVolume(): number {
    if (this.ctx && this.masterGain) {
      try { return this.masterGain.gain.value; } catch {}
    }
    return 0;
  }

  private ensureGraph(initialVolume: number) {
    if (!this.ctx) return;
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, initialVolume)), this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (!this.toneOsc || !this.toneGain) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      osc.connect(gain);
      try {
        const compressor = this.ctx.createDynamicsCompressor();
        gain.connect(compressor);
        compressor.connect(this.masterGain!);
      } catch {
        gain.connect(this.masterGain!);
      }
      const startAt = this.ctx.currentTime + 0.01;
      osc.start(startAt);
      this.toneOsc = osc;
      this.toneGain = gain;
    }
  }

  private scheduleCueAt(whenSec: number, cue: AudioCue) {
    if (!this.ctx || !this.toneOsc || !this.toneGain) return;
    const epsilon = 0.0005;
    const cutTime = Math.max(0, whenSec - epsilon);
    try {
      this.toneGain.gain.cancelScheduledValues(cutTime);
      this.toneGain.gain.setValueAtTime(0.0001, cutTime);
    } catch {}

    const frequency = cue.frequencyHz;
    const duration = cue.lengthSec;
    const amplitude = Math.max(0, Math.min(1, cue.amplitude ?? 1.0));
    const attack = 0.005;

    try {
      this.toneOsc.frequency.cancelScheduledValues(whenSec);
      const now = this.ctx.currentTime;
      this.toneOsc.frequency.setValueAtTime(frequency, Math.max(whenSec, now));
    } catch {
      this.toneOsc.frequency.setValueAtTime(frequency, whenSec);
    }
    try {
      this.toneGain.gain.cancelScheduledValues(whenSec);
      const now = this.ctx.currentTime;
      const startAt = Math.max(whenSec, now);
      this.toneGain.gain.setValueAtTime(0.0001, startAt);
      this.toneGain.gain.linearRampToValueAtTime(amplitude, startAt + attack);
    } catch {
      this.toneGain.gain.setValueAtTime(amplitude, whenSec + attack);
    }
    try {
      const now = this.ctx.currentTime;
      const startAt = Math.max(whenSec, now);
      this.toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    } catch {}
  }

  private scheduleWindowForTimeline(timeline: Timeline, fromSec: number, toSec: number) {
    if (!this.ctx) return;
    if (!timeline.phases.length) return;
    const totalDurationSec = Math.max(0.001, timeline.totalDurationMs / 1000);
    const startCycle = Math.max(0, Math.floor((fromSec - this.baseStartSec) / totalDurationSec));
    const endCycle = Math.max(startCycle, Math.floor((toSec - this.baseStartSec) / totalDurationSec));
    for (let cy = startCycle; cy <= endCycle; cy++) {
      const cycleStart = this.baseStartSec + cy * totalDurationSec;
      for (const phase of timeline.phases) {
        for (const cue of phase.cues) {
          const cueTime = cycleStart + cue.timestamp / 1000;
          if (cueTime >= fromSec && cueTime < toSec) {
            this.scheduleCueAt(cueTime, cue);
          }
        }
      }
    }
    this.scheduledUntilSec = Math.max(this.scheduledUntilSec, toSec);
  }

  start(timeline: Timeline, volume: number, horizonSec = 10): number {
    this.ensureContext();
    if (!this.ctx) return 0;
    this.resume();
    // iOS unlock: one-sample silent buffer
    try {
      if (this.ctx.state === 'running') {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.ctx.destination);
        const when = this.ctx.currentTime + 0.001;
        src.start(when);
        src.stop(when + 0.001);
      }
    } catch {}

    this.ensureGraph(volume);
    const headroom = 0.05;
    this.baseStartSec = this.ctx.currentTime + headroom;
    this.scheduledUntilSec = this.baseStartSec;
    this.scheduleWindowForTimeline(timeline, this.baseStartSec, this.baseStartSec + horizonSec);

    if (this.schedulerId) window.clearInterval(this.schedulerId);
    this.schedulerId = window.setInterval(() => {
      if (!this.ctx) return;
      const nowSec = this.ctx.currentTime;
      const targetSec = nowSec + horizonSec;
      if (this.scheduledUntilSec < targetSec) {
        this.scheduleWindowForTimeline(timeline, this.scheduledUntilSec, targetSec);
      }
    }, 1000);

    return this.baseStartSec;
  }

  stop() {
    if (this.schedulerId) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.toneGain) {
        try {
          this.toneGain.gain.cancelScheduledValues(now);
          this.toneGain.gain.setTargetAtTime(0.0001, now, 0.01);
        } catch {}
      }
      if (this.masterGain) {
        try { this.masterGain.gain.cancelScheduledValues(now); } catch {}
      }
      if (this.toneOsc) {
        try { this.toneOsc.stop(now + 0.02); } catch {}
        try { this.toneOsc.disconnect(); } catch {}
        this.toneOsc = null;
      }
      if (this.toneGain) {
        try { this.toneGain.disconnect(); } catch {}
        this.toneGain = null;
      }
      if (this.masterGain) {
        try { this.masterGain.disconnect(); } catch {}
        this.masterGain = null;
      }
    }
  }
}


