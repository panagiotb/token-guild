export interface AudioSettings { muted: boolean; volume: number }

export function validateAudioSettings(settings: AudioSettings): AudioSettings {
  if (typeof settings.muted !== 'boolean' || !Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1) throw new Error('Invalid audio settings');
  return { muted: settings.muted, volume: settings.volume };
}

export class AudioManager {
  private readonly contextFactory: () => AudioContext;
  private context?: AudioContext;
  private settings: AudioSettings;

  public constructor(settings: AudioSettings, contextFactory: () => AudioContext = () => new AudioContext()) {
    this.settings = validateAudioSettings(settings);
    this.contextFactory = contextFactory;
  }

  public setSettings(settings: AudioSettings): void { this.settings = validateAudioSettings(settings); }
  public getSettings(): AudioSettings { return { ...this.settings }; }

  public playTone(frequency: number, durationMs: number): void {
    if (this.settings.muted || !Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(durationMs) || durationMs <= 0) return;
    try {
      this.context ??= this.contextFactory();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(this.settings.volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + durationMs / 1000);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(); oscillator.stop(this.context.currentTime + durationMs / 1000);
    } catch {
      // Audio is an enhancement; a blocked browser audio context must not break gameplay.
    }
  }
}
