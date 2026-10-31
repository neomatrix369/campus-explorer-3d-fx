/**
 * Natural Acoustic Soundscape & Soft Tactile Audio Engine.
 * Uses filtered Brownian rain/breeze noise and warm damped felt-piano harmonics
 * (zero raw continuous oscillator drones or robotic pitch-slide beeps).
 */

export type SoundscapePreset = 'lofi-focus' | 'rain-library' | 'spatial-campus' | 'muted';

class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private currentPreset: SoundscapePreset = 'muted';
  private volume = 0.35;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
      this.setupNaturalAmbience();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupNaturalAmbience() {
    if (!this.ctx || !this.masterGain) return;

    // Warm Brownian/Pink Organic Rain & Courtyard Breeze Buffer (No continuous synth oscillators)
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const output = buffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 0.12;
      }
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = 480;
    this.noiseFilter.Q.value = 0.5;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.22;

    noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    noiseSource.start();
  }

  public setPreset(preset: SoundscapePreset) {
    this.currentPreset = preset;
    if (preset === 'muted') {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.18);
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseFilter || !this.noiseGain) return;

    this.masterGain.gain.setTargetAtTime(0.65, ctx.currentTime, 0.2);

    if (preset === 'lofi-focus') {
      this.noiseFilter.frequency.setTargetAtTime(420, ctx.currentTime, 0.2);
      this.noiseGain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.2);
      this.playAcousticChord([261.63, 329.63, 392.0, 493.88]); // Warm Cmaj7 felt chord
    } else if (preset === 'rain-library') {
      this.noiseFilter.frequency.setTargetAtTime(780, ctx.currentTime, 0.2);
      this.noiseGain.gain.setTargetAtTime(0.48, ctx.currentTime, 0.2);
      this.playAcousticChord([293.66, 349.23, 440.0, 523.25]); // Warm Dm7 rain chord
    } else if (preset === 'spatial-campus') {
      this.noiseFilter.frequency.setTargetAtTime(580, ctx.currentTime, 0.2);
      this.noiseGain.gain.setTargetAtTime(0.38, ctx.currentTime, 0.2);
      this.playAcousticChord([349.23, 440.0, 523.25, 659.25]); // Warm Fmaj7 spatial chord
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.currentPreset !== 'muted' && this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  public updateSpatialListener(
    _cameraX: number,
    _cameraZ: number,
    _targetX: number,
    _targetZ: number,
    _landmarkFreq: number
  ) {
    // No continuous sine wave drone — keeps audio natural and free of robotic tones
  }

  /**
   * Plays a warm felt-piano / marimba chord when switching soundscape presets.
   */
  public playAcousticChord(frequencies: number[]) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now + idx * 0.045);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
      gain.gain.linearRampToValueAtTime(0.055, now + idx * 0.045 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.6);
    });
  }

  /**
   * Plays a soft, warm felt-piano / wooden marimba acoustic note on interactive campus actions.
   */
  public playRadarPing(freq = 440) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.5, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(820, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const spatialAudio = new SpatialAudioEngine();

