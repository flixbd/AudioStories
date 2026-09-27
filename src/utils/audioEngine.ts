/**
 * Real-time Atmospheric Web Audio Synthesizer & Bengali Speech Director
 * Designed for @BengaliClassicsByArnab Solo Versatile Performance
 */

import {
  getAudioFromStorage,
  saveAudioToStorage,
  getSceneCacheKey,
  getAllAudioKeysFromStorage,
} from './audioStorage';

export type AmbientMood =
  | 'dawn_mist'
  | 'monsoon_rain'
  | 'peaceful_village'
  | 'zamindar_court'
  | 'dusty_road'
  | 'calcutta_alley'
  | 'none';

export type SFXType =
  | 'bird_chirp'
  | 'water_ripple'
  | 'thunder'
  | 'tram_bell'
  | 'door_bang'
  | 'door_creak'
  | 'paper_tear'
  | 'flute_chord'
  | 'sitar_strum';

export interface VoiceCharacterConfig {
  pitch: number;
  rate: number;
  volume: number;
  label: string;
}

export const CHARACTER_VOICE_CONFIGS: Record<string, VoiceCharacterConfig> = {
  narrator: {
    pitch: 0.85,
    rate: 0.86,
    volume: 1.0,
    label: 'কথক (গম্ভীর ও অন্তর্মুখী)',
  },
  nishith: {
    pitch: 1.02,
    rate: 0.94,
    volume: 0.95,
    label: 'নিশীথ (ভাবুক ও প্রজ্ঞাপূর্ণ)',
  },
  nabanita: {
    pitch: 1.18,
    rate: 1.02,
    volume: 1.0,
    label: 'নবনীতা (হিমশীতল ও অনমনীয়)',
  },
  minati: {
    pitch: 1.25,
    rate: 0.90,
    volume: 0.95,
    label: 'মিনতি (স্নিগ্ধ ও মমতাভরা)',
  },
  nirmal: {
    pitch: 0.72,
    rate: 1.08,
    volume: 1.0,
    label: 'নির্মল (কর্কশ ও ক্রূর)',
  },
  proja: {
    pitch: 1.12,
    rate: 0.88,
    volume: 0.9,
    label: 'প্রজা (কাতর আর্তিভরা)',
  },
  other: {
    pitch: 0.90,
    rate: 0.90,
    volume: 0.95,
    label: 'অন্যান্য চরিত্র',
  },
};

export interface ActiveAmbientTrack {
  mood: AmbientMood;
  gainNode: GainNode;
  nodes: { stop: () => void }[];
  intervals: ReturnType<typeof setInterval>[];
  isFadingOut: boolean;
  fadeTimeoutId?: ReturnType<typeof setTimeout>;
}

class StoryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private warmFilter: BiquadFilterNode | null = null;

  // Active ambient soundscapes with cross-fade tracks
  private activeAmbientTracks: ActiveAmbientTrack[] = [];
  private currentAmbient: AmbientMood = 'none';
  public crossFadeDuration: number = 2.2; // 2.2s cinematic smooth cross-fade
  private ambientTransitionListeners: ((isCrossFading: boolean, mood: AmbientMood) => void)[] = [];

  // Volume state
  public masterVol: number = 0.85;
  public ambientVol: number = 0.45;
  public sfxVol: number = 0.75;
  public speechVol: number = 1.0;
  public vintageWarmth: boolean = true;

  // Speech Synthesis & AI Neural Audio
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private currentEnvelopeGain: GainNode | null = null;
  private speechGain: GainNode | null = null;
  private bengaliVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Mode: 'gemini_neural' (Highest fidelity natural pronunciation) or 'browser_native'
  public speechEngineMode: 'gemini_neural' | 'browser_native' = 'gemini_neural';
  public geminiVoicePersona: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr' = 'Fenrir';
  private audioCache = new Map<string, AudioBuffer>();

  // Rate-limiting / Quota resilience state
  public isRateLimited: boolean = false;
  public rateLimitExpiresAt: number = 0;
  public rateLimitReason: string = '';
  private rateLimitListeners: ((isLimited: boolean, remainingSec: number, reason: string) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => this.initVoices();
    }
  }

  public onRateLimitStatus(
    listener: (isLimited: boolean, remainingSec: number, reason: string) => void
  ) {
    this.rateLimitListeners.push(listener);
    return () => {
      this.rateLimitListeners = this.rateLimitListeners.filter((l) => l !== listener);
    };
  }

  private notifyRateLimit(isLimited: boolean, remainingSec: number, reason: string = '') {
    this.isRateLimited = isLimited;
    this.rateLimitReason = reason;
    this.rateLimitListeners.forEach((fn) => {
      try {
        fn(isLimited, remainingSec, reason);
      } catch (e) {
        // ignore
      }
    });
  }

  private initVoices() {
    if (typeof window === 'undefined') return;
    const voices = window.speechSynthesis.getVoices();
    // Prioritize Bengali voices: bn-BD, bn-IN, or containing 'bengali' or 'bangla'
    this.bengaliVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().includes('bn') ||
        v.name.toLowerCase().includes('bangla') ||
        v.name.toLowerCase().includes('bengali'),
    );

    if (this.bengaliVoices.length > 0) {
      this.selectedVoice = this.bengaliVoices[0];
    } else if (voices.length > 0) {
      // Fallback to Indian or neutral voice
      this.selectedVoice =
        voices.find((v) => v.lang.includes('IN') || v.lang.includes('en-IN')) || voices[0];
    }
  }

  public getAvailableVoices() {
    return {
      bengali: this.bengaliVoices,
      current: this.selectedVoice,
    };
  }

  public setVoice(voice: SpeechSynthesisVoice) {
    this.selectedVoice = voice;
  }

  public getAudioContext(): AudioContext {
    return this.getContext();
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.speechGain = this.ctx.createGain();

      // Vintage Warmth Studio Filter (emulates analog tube warmth & vintage ribbon mic)
      this.warmFilter = this.ctx.createBiquadFilter();
      this.warmFilter.type = 'lowpass';
      this.warmFilter.frequency.value = this.vintageWarmth ? 7500 : 20000;
      this.warmFilter.Q.value = 0.7;

      this.ambientGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.speechGain.connect(this.masterGain);

      this.masterGain.connect(this.warmFilter);
      this.warmFilter.connect(this.ctx.destination);

      this.updateGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public updateGains() {
    if (!this.masterGain || !this.ambientGain || !this.sfxGain || !this.warmFilter) return;
    this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx?.currentTime || 0);
    this.ambientGain.gain.setValueAtTime(this.ambientVol, this.ctx?.currentTime || 0);
    this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx?.currentTime || 0);
    if (this.speechGain) {
      this.speechGain.gain.setValueAtTime(this.speechVol, this.ctx?.currentTime || 0);
    }
    this.warmFilter.frequency.setValueAtTime(
      this.vintageWarmth ? 7500 : 20000,
      this.ctx?.currentTime || 0,
    );
  }

  public toggleVintageWarmth(enabled: boolean) {
    this.vintageWarmth = enabled;
    this.updateGains();
  }

  public onAmbientTransition(listener: (isCrossFading: boolean, mood: AmbientMood) => void) {
    this.ambientTransitionListeners.push(listener);
    return () => {
      this.ambientTransitionListeners = this.ambientTransitionListeners.filter((l) => l !== listener);
    };
  }

  public notifyAmbientTransition(isCrossFading: boolean, mood: AmbientMood) {
    this.ambientTransitionListeners.forEach((fn) => {
      try {
        fn(isCrossFading, mood);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public getCurrentAmbient(): AmbientMood {
    return this.currentAmbient;
  }

  public isAmbientCrossFading(): boolean {
    return this.activeAmbientTracks.some((t) => t.isFadingOut);
  }

  // --- AMBIENT SOUNDSCAPE SYNTHESIZERS WITH CROSS-FADE ---
  /**
   * Set ambient mood with equal-power / linear cross-fade effect.
   * Smoothly cross-fades old background atmosphere into new background atmosphere.
   */
  public setAmbient(mood: AmbientMood, customDuration?: number) {
    if (this.currentAmbient === mood) return;

    const duration = typeof customDuration === 'number' ? customDuration : this.crossFadeDuration;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // 1. Cross-fade out existing active tracks smoothly
    if (this.activeAmbientTracks.length > 0) {
      this.notifyAmbientTransition(true, mood);

      this.activeAmbientTracks.forEach((track) => {
        if (!track.isFadingOut) {
          track.isFadingOut = true;

          // Clear any periodic random SFX intervals immediately so cues don't fire during exit fade
          track.intervals.forEach((timer) => clearInterval(timer));
          track.intervals = [];

          // Smooth ramp down to silence
          track.gainNode.gain.cancelScheduledValues(now);
          const currentGain = Math.max(0.0001, track.gainNode.gain.value);
          track.gainNode.gain.setValueAtTime(currentGain, now);
          track.gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

          track.fadeTimeoutId = setTimeout(() => {
            track.nodes.forEach((n) => {
              try {
                n.stop();
              } catch (e) {}
            });
            try {
              track.gainNode.disconnect();
            } catch (e) {}
            this.activeAmbientTracks = this.activeAmbientTracks.filter((t) => t !== track);
            if (!this.isAmbientCrossFading()) {
              this.notifyAmbientTransition(false, this.currentAmbient);
            }
          }, Math.ceil((duration + 0.15) * 1000));
        }
      });
    }

    this.currentAmbient = mood;

    if (mood === 'none') {
      if (this.activeAmbientTracks.length === 0) {
        this.notifyAmbientTransition(false, 'none');
      }
      return;
    }

    // 2. Spawn incoming track GainNode starting at silence and smoothly ramping to 1.0
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.linearRampToValueAtTime(1.0, now + duration);
    trackGain.connect(this.ambientGain!);

    const newTrack: ActiveAmbientTrack = {
      mood,
      gainNode: trackGain,
      nodes: [],
      intervals: [],
      isFadingOut: false,
    };
    this.activeAmbientTracks.push(newTrack);

    // End cross-fade indicator after duration
    setTimeout(() => {
      if (this.currentAmbient === mood && !newTrack.isFadingOut && !this.isAmbientCrossFading()) {
        this.notifyAmbientTransition(false, mood);
      }
    }, Math.ceil(duration * 1000));

    // 3. Initialize sound generators routed to this track's gain node
    switch (mood) {
      case 'dawn_mist':
        this.startDawnMist(ctx, trackGain, newTrack);
        break;
      case 'monsoon_rain':
        this.startMonsoonRain(ctx, trackGain, newTrack);
        break;
      case 'peaceful_village':
        this.startVillageDawn(ctx, trackGain, newTrack);
        break;
      case 'zamindar_court':
        this.startZamindarCourt(ctx, trackGain, newTrack);
        break;
      case 'dusty_road':
        this.startDustyRoad(ctx, trackGain, newTrack);
        break;
      case 'calcutta_alley':
        this.startCalcuttaAlley(ctx, trackGain, newTrack);
        break;
    }
  }

  public stopAmbient(immediate: boolean = false, customDuration?: number) {
    if (immediate) {
      this.activeAmbientTracks.forEach((track) => {
        if (track.fadeTimeoutId) clearTimeout(track.fadeTimeoutId);
        track.intervals.forEach((timer) => clearInterval(timer));
        track.nodes.forEach((node) => {
          try {
            node.stop();
          } catch (e) {}
        });
        try {
          track.gainNode.disconnect();
        } catch (e) {}
      });
      this.activeAmbientTracks = [];
      this.currentAmbient = 'none';
      this.notifyAmbientTransition(false, 'none');
    } else {
      this.setAmbient('none', customDuration ?? 1.5);
    }
  }

  /**
   * Dawn Mist: Soft morning wind through bamboo, low meditative tanpura drone, occasional gentle shimmer
   */
  private startDawnMist(ctx: AudioContext, targetGain: GainNode, track: ActiveAmbientTrack) {
    const now = ctx.currentTime;
    // Low Drone (Sa - Pa root chord: C2 ~65Hz and G2 ~98Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const droneGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(65.4, now); // C2
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(98.0, now); // G2

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(280, now);

    droneGain.gain.setValueAtTime(0.08, now);

    osc1.connect(lowpass);
    osc2.connect(lowpass);
    lowpass.connect(droneGain);
    droneGain.connect(targetGain);

    osc1.start();
    osc2.start();

    // Soft morning wind
    const wind = this.createPinkNoise(ctx, 400);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.04, now);
    wind.connect(windGain);
    windGain.connect(targetGain);

    // Periodic gentle bird chirp in the distance
    const birdInterval = setInterval(() => {
      if (!track.isFadingOut && this.currentAmbient === 'dawn_mist' && Math.random() > 0.4) {
        this.playSFX('bird_chirp');
      }
    }, 4500);
    track.intervals.push(birdInterval);

    track.nodes.push({
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          wind.disconnect();
          clearInterval(birdInterval);
        } catch (e) {}
      },
    });
  }

  /**
   * Monsoon Rain: Continuous rain with high/low filters & gentle rumblings
   */
  private startMonsoonRain(ctx: AudioContext, targetGain: GainNode, track: ActiveAmbientTrack) {
    const now = ctx.currentTime;
    const rain = this.createPinkNoise(ctx, 1200);
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.16, now);
    rain.connect(rainGain);
    rainGain.connect(targetGain);

    // Dramatic minor violin drone (D3 146.8Hz + F3 174.6Hz)
    const osc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(146.83, now);
    droneGain.gain.setValueAtTime(0.06, now);

    osc.connect(droneGain);
    droneGain.connect(targetGain);
    osc.start();

    const thunderInterval = setInterval(() => {
      if (!track.isFadingOut && this.currentAmbient === 'monsoon_rain' && Math.random() > 0.5) {
        this.playSFX('thunder');
      }
    }, 8000);
    track.intervals.push(thunderInterval);

    track.nodes.push({
      stop: () => {
        try {
          rain.disconnect();
          osc.stop();
          clearInterval(thunderInterval);
        } catch (e) {}
      },
    });
  }

  /**
   * Village Peace: Flute drone, soft morning breeze, crickets
   */
  private startVillageDawn(ctx: AudioContext, targetGain: GainNode, track: ActiveAmbientTrack) {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(130.81, now); // C3

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(196.0, now); // G3

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(targetGain);
    osc1.start();
    osc2.start();

    track.nodes.push({
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
        } catch (e) {}
      },
    });
  }

  /**
   * Zamindar Court: Heavy, suspenseful orchestral low drone
   */
  private startZamindarCourt(ctx: AudioContext, targetGain: GainNode, track: ActiveAmbientTrack) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55.0, now); // A1

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(targetGain);
    osc.start();

    track.nodes.push({
      stop: () => {
        try {
          osc.stop();
        } catch (e) {}
      },
    });
  }

  /**
   * Dusty Road: Desolate warm dry wind
   */
  private startDustyRoad(ctx: AudioContext, targetGain: GainNode, track: ActiveAmbientTrack) {
    const now = ctx.currentTime;
    const wind = this.createPinkNoise(ctx, 320);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    wind.connect(gain);
    gain.connect(targetGain);

    track.nodes.push({
      stop: () => {
        try {
          wind.disconnect();
        } catch (e) {}
      },
    });
  }

  /**
   * Calcutta Alley: Dark, narrow alleyway, distant echo
   */
  private startCalcuttaAlley(ctx: AudioContext, targetGain: GainNode, track: ActiveAmbientTrack) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(73.42, now); // D2

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);

    osc.connect(gain);
    gain.connect(targetGain);
    osc.start();

    track.nodes.push({
      stop: () => {
        try {
          osc.stop();
        } catch (e) {}
      },
    });
  }

  // --- SOUND EFFECTS (SFX) SYNTHESIZERS ---
  public playSFX(type: SFXType) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'bird_chirp': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(2100, now + 0.16);

        // Anti-pop smooth attack ramp
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'thunder': {
        const noise = this.createPinkNoise(ctx, 150);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

        noise.connect(gain);
        gain.connect(this.sfxGain!);
        setTimeout(() => noise.disconnect(), 2500);
        break;
      }

      case 'tram_bell': {
        // Double metallic ding
        [0, 0.22].forEach((offset) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(1420, now + offset);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(2140, now + offset);

          gain.gain.setValueAtTime(0.0001, now + offset);
          gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.sfxGain!);

          osc1.start(now + offset);
          osc2.start(now + offset);
          osc1.stop(now + offset + 0.65);
          osc2.stop(now + offset + 0.65);
        });
        break;
      }

      case 'door_bang': {
        // Heavy wooden door slam
        const osc = ctx.createOscillator();
        const noise = this.createPinkNoise(ctx, 350);
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        // Anti-pop smooth attack ramp
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        noise.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 0.5);
        setTimeout(() => noise.disconnect(), 600);
        break;
      }

      case 'door_creak': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.4);
        osc.frequency.linearRampToValueAtTime(290, now + 0.9);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 1.0);
        break;
      }

      case 'paper_tear': {
        const noise = this.createPinkNoise(ctx, 3000);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noise.connect(gain);
        gain.connect(this.sfxGain!);
        setTimeout(() => noise.disconnect(), 550);
        break;
      }

      case 'flute_chord': {
        // Haunting Indian classical bamboo flute motif (Bhairavi / Todi feel)
        const notes = [440, 523.25, 587.33, 659.25]; // A4, C5, D5, E5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + i * 0.28;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          // subtle vibrato
          const vibrato = ctx.createOscillator();
          const vibGain = ctx.createGain();
          vibrato.frequency.setValueAtTime(5.5, startTime);
          vibGain.gain.setValueAtTime(4, startTime);
          vibrato.connect(vibGain);
          vibGain.connect(osc.frequency);
          vibrato.start(startTime);
          vibrato.stop(startTime + 0.8);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.09, startTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

          osc.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(startTime);
          osc.stop(startTime + 0.95);
        });
        break;
      }

      case 'sitar_strum': {
        // Plucked acoustic string with metallic sympathetic harmonics
        const frequencies = [130.81, 196.0, 261.63, 392.0, 523.25];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.05;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2200, startTime);
          filter.frequency.exponentialRampToValueAtTime(400, startTime + 1.2);

          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.6);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(startTime);
          osc.stop(startTime + 1.7);
        });
        break;
      }

      default:
        break;
    }
  }

  private createPinkNoise(ctx: AudioContext, filterFreq: number = 800) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

    noiseSource.connect(filter);
    noiseSource.start();
    return filter;
  }

  // --- SOLO STORYTELLER SPEECH SYNTHESIS (GEMINI NEURAL AI - ARNAB VOICE) ---
  public async speakScene(
    text: string,
    characterKey: string,
    customSpeedMultiplier: number = 1.0,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    },
    meta?: {
      emotion?: string;
      speaker?: string;
    }
  ) {
    this.stopSpeech();

    // Guaranteed: Gemini Neural (Arnab Voice - Pure Shuddho Bangla)
    if (this.speechEngineMode === 'gemini_neural') {
      try {
        const played = await this.speakWithGeminiNeural(text, characterKey, callbacks, meta);
        if (played) {
          if (this.isRateLimited) {
            this.notifyRateLimit(false, 0, '');
          }
          return;
        }
      } catch (err) {
        console.warn('Gemini Neural playback error:', err);
      }

      // Strict enforcement: Never fall back to robotic English-accented browser speech.
      // Inform listener/caller so playback waits or retries in authentic Arnab voice.
      callbacks?.onError?.(new Error('আর্নব ভয়েস প্রস্তুত হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...'));
      return;
    }

    // Browser Native Speech (Only used if explicitly selected by user in advanced settings)
    this.speakWithBrowserNative(text, characterKey, customSpeedMultiplier, callbacks);
  }

  private async speakWithGeminiNeural(
    text: string,
    characterKey: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    },
    meta?: {
      emotion?: string;
      speaker?: string;
    }
  ): Promise<boolean> {
    const ctx = this.getContext();
    const cacheKey = getSceneCacheKey(this.geminiVoicePersona, characterKey, text);

    let audioBuffer = this.audioCache.get(cacheKey);

    // 1. If not in memory, check browser persistent storage (IndexedDB)
    if (!audioBuffer) {
      const stored = await getAudioFromStorage(cacheKey);
      if (stored && stored.audioBase64) {
        audioBuffer = this.decodePcmToBuffer(ctx, stored.audioBase64, stored.sampleRate || 24000);
        this.audioCache.set(cacheKey, audioBuffer);
      }
    }

    // 2. If not in storage, fetch from server API
    if (!audioBuffer) {
      try {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName: this.geminiVoicePersona,
            characterKey,
            emotion: meta?.emotion || 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
            speaker: meta?.speaker || 'কথক',
          }),
        });

        const data = await res.json().catch(() => null);

        // Check if rate limited or quota exhausted
        if (!res.ok || data?.rateLimited) {
          const retrySec = data?.retryAfterSeconds || 60;
          this.rateLimitExpiresAt = Date.now() + retrySec * 1000;
          this.notifyRateLimit(
            true,
            retrySec,
            data?.error || `Gemini TTS কোটা বিরতি (${retrySec} সেকেন্ড)।`
          );
          return false;
        }

        if (!data?.success || !data?.audioBase64) {
          return false;
        }

        // Decode base64 PCM 24000Hz (16-bit little-endian) to AudioBuffer with anti-noise smoothing
        audioBuffer = this.decodePcmToBuffer(ctx, data.audioBase64, data.sampleRate || 24000);
        this.audioCache.set(cacheKey, audioBuffer);

        // Persist to browser IndexedDB so it's never lost on refresh
        saveAudioToStorage({
          key: cacheKey,
          voicePersona: this.geminiVoicePersona,
          characterKey,
          textSnippet: text.slice(0, 60),
          audioBase64: data.audioBase64,
          sampleRate: data.sampleRate || 24000,
          createdAt: Date.now(),
        }).catch((err) => console.warn('Failed to cache speech in IndexedDB:', err));
      } catch (networkErr) {
        return false;
      }
    }

    if (!audioBuffer) return false;

    // 3. Play buffer through Web Audio node graph with anti-pop / click-free envelope
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const envelopeGain = ctx.createGain();
    const now = ctx.currentTime;

    // 20ms soft attack ramp to eliminate starting pop/click
    envelopeGain.gain.setValueAtTime(0.0001, now);
    envelopeGain.gain.linearRampToValueAtTime(1.0, now + 0.02);

    // Schedule 35ms soft release ramp before end of buffer to eliminate ending cutoff pop
    const fadeOutStart = Math.max(0.02, audioBuffer.duration - 0.035);
    envelopeGain.gain.setValueAtTime(1.0, now + fadeOutStart);
    envelopeGain.gain.linearRampToValueAtTime(0.0001, now + audioBuffer.duration);

    source.connect(envelopeGain);
    envelopeGain.connect(this.speechGain || this.masterGain!);

    this.currentAudioSource = source;
    this.currentEnvelopeGain = envelopeGain;

    source.onended = () => {
      if (this.currentAudioSource === source) {
        this.currentAudioSource = null;
        this.currentEnvelopeGain = null;
        try {
          source.disconnect();
          envelopeGain.disconnect();
        } catch (e) {}
        callbacks?.onEnd?.();
      }
    };

    callbacks?.onStart?.();
    source.start(0);
    return true;
  }

  // Preload upcoming scene line into cache to prevent gaps between dialogues
  public async preloadLine(
    text: string,
    characterKey: string,
    meta?: { emotion?: string; speaker?: string }
  ) {
    if (this.speechEngineMode !== 'gemini_neural' || !text) return;

    // Do not preload if in rate limit cooldown to conserve quota
    if (this.isRateLimited && Date.now() < this.rateLimitExpiresAt) return;

    const cacheKey = getSceneCacheKey(this.geminiVoicePersona, characterKey, text);
    if (this.audioCache.has(cacheKey)) return;

    // Check IndexedDB before network fetch
    const stored = await getAudioFromStorage(cacheKey);
    if (stored && stored.audioBase64) {
      const ctx = this.getContext();
      const buffer = this.decodePcmToBuffer(ctx, stored.audioBase64, stored.sampleRate || 24000);
      this.audioCache.set(cacheKey, buffer);
      return;
    }

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: this.geminiVoicePersona,
          characterKey,
          emotion: meta?.emotion || 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
          speaker: meta?.speaker || 'কথক',
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.rateLimited) {
          const retrySec = data.retryAfterSeconds || 60;
          this.rateLimitExpiresAt = Date.now() + retrySec * 1000;
          this.notifyRateLimit(true, retrySec, data.error || '');
          return;
        }
        if (data?.success && data?.audioBase64) {
          const ctx = this.getContext();
          const buffer = this.decodePcmToBuffer(ctx, data.audioBase64, data.sampleRate || 24000);
          this.audioCache.set(cacheKey, buffer);

          // Save to IndexedDB
          await saveAudioToStorage({
            key: cacheKey,
            voicePersona: this.geminiVoicePersona,
            characterKey,
            textSnippet: text.slice(0, 60),
            audioBase64: data.audioBase64,
            sampleRate: data.sampleRate || 24000,
            createdAt: Date.now(),
          });
        }
      }
    } catch (e) {
      // Background preload error can be safely ignored
    }
  }

  /**
   * Decode base64 16-bit PCM to AudioBuffer with DC-offset elimination and boundary de-clicking
   * Completely removes transition pops, clicks, or noises when shifting between scenes.
   */
  public decodePcmToBuffer(ctx: BaseAudioContext, base64Pcm: string, sampleRate: number): AudioBuffer {
    const binary = atob(base64Pcm);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert raw 16-bit PCM little endian into 32-bit float audio buffer
    const int16 = new Int16Array(bytes.buffer);
    const audioBuffer = ctx.createBuffer(1, int16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // 1. Calculate DC offset
    let sum = 0;
    for (let i = 0; i < int16.length; i++) {
      sum += int16[i];
    }
    const dcOffset = int16.length > 0 ? sum / int16.length / 32768.0 : 0;

    // 2. Normalize and subtract DC offset
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768.0 - dcOffset;
    }

    // 3. Micro raised-cosine (Hann) fade-in & fade-out on buffer boundaries (512 samples ~21ms at 24kHz)
    // Ensures starting and ending values meet exact zero with zero derivative, eliminating all pops
    const fadeLen = Math.min(512, Math.floor(channelData.length / 4));
    for (let i = 0; i < fadeLen; i++) {
      const ramp = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      channelData[i] *= ramp;
    }
    for (let i = 0; i < fadeLen; i++) {
      const idx = channelData.length - 1 - i;
      const ramp = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      channelData[idx] *= ramp;
    }

    return audioBuffer;
  }

  public getCachedAudio(cacheKey: string): AudioBuffer | undefined {
    return this.audioCache.get(cacheKey);
  }

  public setCachedAudio(cacheKey: string, buffer: AudioBuffer) {
    this.audioCache.set(cacheKey, buffer);
  }

  private speakWithBrowserNative(
    text: string,
    characterKey: string,
    customSpeedMultiplier: number = 1.0,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    },
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      callbacks?.onEnd?.();
      return;
    }

    // Clean and normalize text for expressive Bengali pronunciation
    const cleanedText = text
      .replace(/\.{3,}/g, '। ')
      .replace(/—/g, ' ')
      .trim();

    const charConfig = CHARACTER_VOICE_CONFIGS[characterKey] || CHARACTER_VOICE_CONFIGS.narrator;
    const utterance = new SpeechSynthesisUtterance(cleanedText || text);

    // Character-driven dynamic modulation
    utterance.pitch = charConfig.pitch;
    utterance.rate = charConfig.rate * customSpeedMultiplier;
    utterance.volume = charConfig.volume * this.speechVol * this.masterVol;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // Bengali language tag
    utterance.lang = 'bn-BD';

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        this.currentUtterance = null;
        callbacks?.onEnd?.();
      }
    };

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = finish;

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      callbacks?.onError?.(e);
      finish();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stopSpeech(immediate: boolean = false) {
    if (this.currentEnvelopeGain && this.ctx) {
      const now = this.ctx.currentTime;
      const oldGain = this.currentEnvelopeGain;
      const oldSource = this.currentAudioSource;
      this.currentEnvelopeGain = null;
      this.currentAudioSource = null;

      if (immediate) {
        try {
          oldSource?.stop();
          oldSource?.disconnect();
          oldGain.disconnect();
        } catch (e) {}
      } else {
        try {
          oldGain.gain.cancelScheduledValues(now);
          oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
          oldGain.gain.linearRampToValueAtTime(0.0001, now + 0.035); // 35ms soft anti-pop release
          setTimeout(() => {
            try {
              oldSource?.stop();
              oldSource?.disconnect();
              oldGain.disconnect();
            } catch (e) {}
          }, 40);
        } catch (e) {
          try {
            oldSource?.stop();
            oldSource?.disconnect();
            oldGain.disconnect();
          } catch (err) {}
        }
      }
    } else if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {}
      this.currentAudioSource = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Preload stored audio from browser IndexedDB for instant zero-latency playback
   */
  public async preloadFromStorage(): Promise<number> {
    const ctx = this.getContext();
    try {
      const keys = await getAllAudioKeysFromStorage();
      let loaded = 0;
      for (const key of keys) {
        if (!this.audioCache.has(key)) {
          const stored = await getAudioFromStorage(key);
          if (stored && stored.audioBase64) {
            const buffer = this.decodePcmToBuffer(ctx, stored.audioBase64, stored.sampleRate || 24000);
            this.audioCache.set(key, buffer);
            loaded++;
          }
        }
      }
      return loaded;
    } catch (e) {
      return 0;
    }
  }

  public pauseSpeech() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resumeSpeech() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }
}

export const storyAudio = new StoryAudioEngine();
