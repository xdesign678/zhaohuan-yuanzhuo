import jsfxr from 'jsfxr';

export type SfxrSound = 'hit' | 'pickup' | 'levelUp' | 'reaction' | 'gameOver';
export type SfxrParams = Record<string, number | boolean>;

const PRESETS: Record<SfxrSound, SfxrParams> = {
  hit: {
    oldParams: true,
    wave_type: 3,
    p_env_attack: 0,
    p_env_sustain: 0.05,
    p_env_punch: 0.18,
    p_env_decay: 0.12,
    p_base_freq: 0.18,
    p_freq_ramp: -0.22,
    p_lpf_freq: 0.82,
    sound_vol: 0.2,
    sample_rate: 22050,
    sample_size: 8
  },
  pickup: {
    oldParams: true,
    wave_type: 1,
    p_env_attack: 0,
    p_env_sustain: 0.04,
    p_env_punch: 0.25,
    p_env_decay: 0.18,
    p_base_freq: 0.48,
    p_arp_mod: 0.22,
    p_arp_speed: 0.48,
    p_lpf_freq: 0.9,
    sound_vol: 0.18,
    sample_rate: 22050,
    sample_size: 8
  },
  levelUp: {
    oldParams: true,
    wave_type: 0,
    p_env_attack: 0,
    p_env_sustain: 0.18,
    p_env_punch: 0.42,
    p_env_decay: 0.28,
    p_base_freq: 0.42,
    p_arp_mod: 0.48,
    p_arp_speed: 0.36,
    p_lpf_freq: 0.96,
    sound_vol: 0.24,
    sample_rate: 22050,
    sample_size: 8
  },
  reaction: {
    oldParams: true,
    wave_type: 2,
    p_env_attack: 0,
    p_env_sustain: 0.15,
    p_env_punch: 0.38,
    p_env_decay: 0.24,
    p_base_freq: 0.62,
    p_freq_ramp: -0.18,
    p_vib_strength: 0.16,
    p_vib_speed: 0.44,
    p_lpf_freq: 0.92,
    sound_vol: 0.25,
    sample_rate: 22050,
    sample_size: 8
  },
  gameOver: {
    oldParams: true,
    wave_type: 1,
    p_env_attack: 0,
    p_env_sustain: 0.28,
    p_env_punch: 0.08,
    p_env_decay: 0.52,
    p_base_freq: 0.24,
    p_freq_ramp: -0.35,
    p_lpf_freq: 0.72,
    p_hpf_freq: 0.05,
    sound_vol: 0.24,
    sample_rate: 22050,
    sample_size: 8
  }
};

export function getSfxrParams(sound: SfxrSound): SfxrParams {
  return { ...PRESETS[sound] };
}

export function createSfxrDataUri(sound: SfxrSound): string {
  const wave = jsfxr.sfxr.toWave(getSfxrParams(sound));
  return wave.dataURI;
}

export class SfxrAudio {
  private readonly cache = new Map<SfxrSound, HTMLAudioElement>();
  private unlocked = false;

  public unlock(): void {
    if (typeof Audio === 'undefined') {
      return;
    }

    this.unlocked = true;
    for (const sound of Object.keys(PRESETS) as SfxrSound[]) {
      this.getAudio(sound).load();
    }
  }

  public play(sound: SfxrSound): void {
    if (!this.unlocked || typeof Audio === 'undefined') {
      return;
    }

    const audio = this.getAudio(sound);
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  private getAudio(sound: SfxrSound): HTMLAudioElement {
    const cached = this.cache.get(sound);
    if (cached) {
      return cached;
    }

    const audio = new Audio(createSfxrDataUri(sound));
    audio.preload = 'auto';
    this.cache.set(sound, audio);
    return audio;
  }
}
