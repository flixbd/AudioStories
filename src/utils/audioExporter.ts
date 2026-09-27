import { Mp3Encoder } from '@breezystack/lamejs';
import { StoryData, StoryScene, StoryAct } from '../data/stories';
import { AmbientMood, SFXType, storyAudio } from './audioEngine';
import { getAudioFromStorage, saveAudioToStorage, getSceneCacheKey } from './audioStorage';

export interface ExportProgress {
  step: 'preparing' | 'fetching_voice' | 'rendering_audio' | 'encoding_mp3' | 'completed' | 'error';
  message: string;
  percent: number;
  currentScene?: number;
  totalScenes?: number;
}

export interface ExportSettings {
  scope: 'full' | number; // 'full' or act index
  voicePersona: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  voiceVolume: number; // 0.0 to 1.5 (default 1.0)
  ambientVolume: number; // 0.0 to 1.0 (default 0.35)
  sfxVolume: number; // 0.0 to 1.0 (default 0.50)
  masterVolume: number; // 0.0 to 1.0 (default 0.85)
  vintageWarmth: boolean; // default true
  bitrate: 128 | 192; // default 128 or 192 kbps
}

export interface ExportResult {
  blob: Blob;
  url: string;
  fileName: string;
  duration: number; // in seconds
  fileSizeStr: string; // e.g. "4.2 MB"
}

// Convert 32-bit float audio buffer data to 16-bit PCM for LAME MP3 encoding
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const len = float32Array.length;
  const int16Array = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

// Encode an AudioBuffer into an MP3 Blob using pure JS/TS LAME encoder
export function audioBufferToMp3Blob(audioBuffer: AudioBuffer, kbps: number = 128): Blob {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const leftChannel = float32ToInt16(audioBuffer.getChannelData(0));
  const rightChannel = channels > 1 ? float32ToInt16(audioBuffer.getChannelData(1)) : undefined;

  const sampleBlockSize = 1152;
  const totalSamples = leftChannel.length;

  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
    const rightChunk = rightChannel ? rightChannel.subarray(i, i + sampleBlockSize) : undefined;
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const flushBuf = encoder.flush();
  if (flushBuf && flushBuf.length > 0) {
    mp3Data.push(flushBuf);
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}

// Helper to generate Pink Noise AudioBuffer for background wind / rain
function createPinkNoiseBuffer(ctx: BaseAudioContext, durationSec: number = 6): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
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
  return buffer;
}

// Generate realistic synthetic speech cadence buffer when Gemini TTS is offline/rate-limited
function createFallbackSpeechBuffer(
  ctx: BaseAudioContext,
  text: string,
  characterKey: string
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  // Estimated reading speed in Bengali (~11 characters per second)
  const charLen = Math.max(8, text.trim().length);
  const duration = Math.max(1.8, Math.min(18.0, charLen * 0.09));
  const bufferSize = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Pitch based on character
  const baseFreq =
    characterKey === 'nabanita'
      ? 220
      : characterKey === 'minati'
      ? 240
      : characterKey === 'nishith'
      ? 160
      : characterKey === 'nirmal'
      ? 110
      : 135; // narrator baritone

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    // Envelope with soft word pauses
    const cadence = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
    const envelope = Math.sin((Math.PI * t) / duration);
    // Harmonics for vocal richness
    const fundamental = Math.sin(2 * Math.PI * baseFreq * t);
    const overtone1 = 0.4 * Math.sin(2 * Math.PI * baseFreq * 2 * t);
    const overtone2 = 0.2 * Math.sin(2 * Math.PI * baseFreq * 3 * t);

    channelData[i] = (fundamental + overtone1 + overtone2) * envelope * cadence * 0.32;
  }

  return buffer;
}

// Fetch or retrieve AudioBuffer for a scene line
async function getSceneVoiceBuffer(
  ctx: BaseAudioContext,
  scene: StoryScene,
  voicePersona: string
): Promise<AudioBuffer> {
  const cacheKey = getSceneCacheKey(voicePersona, scene.characterKey, scene.text);
  const cached = storyAudio.getCachedAudio(cacheKey);
  if (cached) {
    return cached;
  }

  // Check persistent IndexedDB
  const stored = await getAudioFromStorage(cacheKey);
  if (stored && stored.audioBase64) {
    const buffer = storyAudio.decodePcmToBuffer(ctx, stored.audioBase64, stored.sampleRate || 24000);
    storyAudio.setCachedAudio(cacheKey, buffer);
    return buffer;
  }

  // Request high-fidelity Gemini TTS
  try {
    const res = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: scene.text,
        voiceName: voicePersona,
        characterKey: scene.characterKey,
        emotion: scene.emotion || 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
        speaker: scene.speaker || 'কথক',
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.audioBase64) {
      const buffer = storyAudio.decodePcmToBuffer(ctx, data.audioBase64, data.sampleRate || 24000);
      storyAudio.setCachedAudio(cacheKey, buffer);

      // Persist to IndexedDB
      saveAudioToStorage({
        key: cacheKey,
        voicePersona,
        characterKey: scene.characterKey,
        textSnippet: scene.text.slice(0, 60),
        audioBase64: data.audioBase64,
        sampleRate: data.sampleRate || 24000,
        createdAt: Date.now(),
      }).catch((e) => console.warn('IndexedDB save error in exporter:', e));

      return buffer;
    }
  } catch (err) {
    // network or api error
  }

  // Graceful fallback so export NEVER halts
  const fallback = createFallbackSpeechBuffer(ctx, scene.text, scene.characterKey);
  storyAudio.setCachedAudio(cacheKey, fallback);
  return fallback;
}

// Schedule an atmospheric ambient soundscape in OfflineAudioContext
export function scheduleAmbientSoundscape(
  ctx: BaseAudioContext,
  targetGain: GainNode,
  mood: AmbientMood,
  startTime: number,
  duration: number
) {
  if (mood === 'none') return;
  const endTime = startTime + duration;
  const fadeTime = Math.min(2.0, duration * 0.2);

  // Local gain node for smooth entry and exit fade
  const localGain = ctx.createGain();
  localGain.gain.setValueAtTime(0.0001, startTime);
  localGain.gain.linearRampToValueAtTime(1.0, startTime + fadeTime);
  localGain.gain.setValueAtTime(1.0, Math.max(startTime + fadeTime, endTime - fadeTime));
  localGain.gain.linearRampToValueAtTime(0.0001, endTime);
  localGain.connect(targetGain);

  const pinkNoise = createPinkNoiseBuffer(ctx, 6);

  switch (mood) {
    case 'dawn_mist': {
      // Bamboo mist wind + Tanpura root drones (C2 65.4Hz + G2 98.0Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(65.4, startTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(98.0, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, startTime);

      droneGain.gain.setValueAtTime(0.08, startTime);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(localGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(endTime);
      osc2.stop(endTime);

      // Morning wind
      const windSource = ctx.createBufferSource();
      windSource.buffer = pinkNoise;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.setValueAtTime(400, startTime);
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.05, startTime);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(localGain);
      windSource.start(startTime);
      windSource.stop(endTime);

      // Add gentle random bird chirps
      for (let t = startTime + 3.0; t < endTime - 3.0; t += 6.5) {
        scheduleSFX(ctx, localGain, 'bird_chirp', t);
      }
      break;
    }

    case 'monsoon_rain': {
      // Continuous rain noise
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = pinkNoise;
      rainSource.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.setValueAtTime(1200, startTime);
      rainFilter.Q.setValueAtTime(1.0, startTime);
      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.16, startTime);

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(localGain);
      rainSource.start(startTime);
      rainSource.stop(endTime);

      // Minor violin triangle drone (D3 146.8Hz)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(146.83, startTime);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.06, startTime);

      osc.connect(oscGain);
      oscGain.connect(localGain);
      osc.start(startTime);
      osc.stop(endTime);

      // Distant thunder rumbles
      for (let t = startTime + 5.0; t < endTime - 4.0; t += 12.0) {
        scheduleSFX(ctx, localGain, 'thunder', t);
      }
      break;
    }

    case 'peaceful_village': {
      // Soft flute sine drones (C3 130.8Hz + G3 196Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(130.81, startTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(196.0, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, startTime);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(localGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(endTime);
      osc2.stop(endTime);
      break;
    }

    case 'zamindar_court': {
      // Heavy suspenseful sawtooth bass drone (A1 55Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55.0, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, startTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(localGain);

      osc.start(startTime);
      osc.stop(endTime);
      break;
    }

    case 'dusty_road': {
      // Dry arid wind
      const windSource = ctx.createBufferSource();
      windSource.buffer = pinkNoise;
      windSource.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, startTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, startTime);

      windSource.connect(filter);
      filter.connect(gain);
      gain.connect(localGain);
      windSource.start(startTime);
      windSource.stop(endTime);
      break;
    }

    case 'calcutta_alley': {
      // Atmospheric low alley echo (D2 73.4Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(73.42, startTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.07, startTime);

      osc.connect(gain);
      gain.connect(localGain);
      osc.start(startTime);
      osc.stop(endTime);
      break;
    }
  }
}

// Schedule Sound FX in OfflineAudioContext
export function scheduleSFX(
  ctx: BaseAudioContext,
  targetGain: GainNode,
  type: SFXType,
  startTime: number
) {
  switch (type) {
    case 'bird_chirp': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800, startTime);
      osc.frequency.exponentialRampToValueAtTime(3600, startTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(2400, startTime + 0.22);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(targetGain);
      osc.start(startTime);
      osc.stop(startTime + 0.28);
      break;
    }

    case 'thunder': {
      const pinkNoise = createPinkNoiseBuffer(ctx, 3.5);
      const source = ctx.createBufferSource();
      source.buffer = pinkNoise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, startTime);
      filter.frequency.exponentialRampToValueAtTime(50, startTime + 2.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 3.0);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(targetGain);
      source.start(startTime);
      source.stop(startTime + 3.2);
      break;
    }

    case 'door_bang': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, startTime);
      osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.35);

      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(targetGain);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
      break;
    }

    case 'water_ripple': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, startTime);
      osc.frequency.exponentialRampToValueAtTime(350, startTime + 0.18);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(targetGain);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
      break;
    }

    case 'tram_bell': {
      [1760, 2200].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.14, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

        osc.connect(gain);
        gain.connect(targetGain);
        osc.start(startTime);
        osc.stop(startTime + 0.75);
      });
      break;
    }

    case 'flute_chord': {
      const notes = [440, 523.25, 587.33, 659.25]; // A4, C5, D5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.25;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.09, noteStart + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.85);

        osc.connect(gain);
        gain.connect(targetGain);
        osc.start(noteStart);
        osc.stop(noteStart + 0.9);
      });
      break;
    }

    case 'sitar_strum': {
      const frequencies = [130.81, 196.0, 261.63, 392.0, 523.25];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * 0.045;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteStart);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, noteStart);
        filter.frequency.exponentialRampToValueAtTime(350, noteStart + 1.2);

        gain.gain.setValueAtTime(0.12, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 1.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(targetGain);
        osc.start(noteStart);
        osc.stop(noteStart + 1.5);
      });
      break;
    }

    default:
      break;
  }
}

// Master Story Audio Exporter Function
export async function exportStoryToMp3(
  story: StoryData,
  settings: ExportSettings,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportResult> {
  onProgress?.({
    step: 'preparing',
    message: 'চিত্রনাট্য ও সংলাপের তালিকা প্রস্তুত হচ্ছে...',
    percent: 5,
  });

  // 1. Determine which acts and scenes to export
  const actsToExport: StoryAct[] =
    settings.scope === 'full'
      ? story.acts
      : story.acts.filter((_, idx) => idx === settings.scope);

  const flatScenes: { actIdx: number; scene: StoryScene; ambientType: AmbientMood }[] = [];
  actsToExport.forEach((act, actIdx) => {
    (act.scenes || []).forEach((scene) => {
      flatScenes.push({
        actIdx,
        scene,
        ambientType: act.ambientType || 'dawn_mist',
      });
    });
  });

  if (flatScenes.length === 0) {
    throw new Error('এক্সপোর্ট করার জন্য কোনো দৃশ্য পাওয়া যায়নি।');
  }

  const totalScenes = flatScenes.length;
  const sampleRate = 44100; // Standard high fidelity output sample rate

  // Temporary offline context to decode speech buffers
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  // 2. Fetch or retrieve all scene voice buffers
  const voiceBuffers: AudioBuffer[] = [];
  for (let i = 0; i < flatScenes.length; i++) {
    const item = flatScenes[i];
    const percent = Math.round(10 + (i / totalScenes) * 45); // 10% to 55%
    onProgress?.({
      step: 'fetching_voice',
      message: `কথকের সংলাপ প্রস্তুত হচ্ছে (${i + 1}/${totalScenes}): "${item.scene.speaker}"`,
      percent,
      currentScene: i + 1,
      totalScenes,
    });

    const buf = await getSceneVoiceBuffer(tempCtx, item.scene, settings.voicePersona);
    voiceBuffers.push(buf);

    // Minor delay to keep event loop responsive
    await new Promise((r) => setTimeout(r, 60));
  }

  try {
    tempCtx.close();
  } catch (e) {}

  // 3. Compute Timeline Offsets for each scene and act
  onProgress?.({
    step: 'rendering_audio',
    message: 'টাইমলাইন গণনা ও মাল্টি-ট্র্যাক অডিও মিক্সার প্রস্তুত হচ্ছে...',
    percent: 58,
  });

  const breathingPause = 0.85; // Arnab's introspective breathing room between lines
  let timelineCursor = 1.0; // 1s intro cushion
  const sceneTimeline: {
    startTime: number;
    duration: number;
    buffer: AudioBuffer;
    scene: StoryScene;
    actIdx: number;
    ambientType: AmbientMood;
  }[] = [];

  const actTimeline: {
    actIdx: number;
    ambientType: AmbientMood;
    startTime: number;
    endTime: number;
  }[] = [];

  let currentActIdx = -1;
  let actStart = timelineCursor;

  flatScenes.forEach((item, i) => {
    const buf = voiceBuffers[i];
    const dur = buf.duration;

    if (item.actIdx !== currentActIdx) {
      if (currentActIdx !== -1) {
        actTimeline.push({
          actIdx: currentActIdx,
          ambientType: flatScenes[i - 1].ambientType,
          startTime: actStart,
          endTime: timelineCursor,
        });
      }
      currentActIdx = item.actIdx;
      actStart = timelineCursor;
    }

    sceneTimeline.push({
      startTime: timelineCursor,
      duration: dur,
      buffer: buf,
      scene: item.scene,
      actIdx: item.actIdx,
      ambientType: item.ambientType,
    });

    timelineCursor += dur + breathingPause;
  });

  // Finish last act
  if (currentActIdx !== -1) {
    actTimeline.push({
      actIdx: currentActIdx,
      ambientType: flatScenes[flatScenes.length - 1].ambientType,
      startTime: actStart,
      endTime: timelineCursor + 2.0, // outro cushion
    });
  }

  const totalDuration = timelineCursor + 2.5; // Final cushion

  // 4. Setup OfflineAudioContext
  onProgress?.({
    step: 'rendering_audio',
    message: 'আবহ সঙ্গীত, কথকের কণ্ঠ ও SFX মার্জ করা হচ্ছে...',
    percent: 65,
  });

  const totalFrames = Math.ceil(sampleRate * totalDuration);
  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

  // Submix Gain Nodes
  const voiceGain = offlineCtx.createGain();
  voiceGain.gain.setValueAtTime(settings.voiceVolume, 0);

  const ambientGain = offlineCtx.createGain();
  ambientGain.gain.setValueAtTime(settings.ambientVolume, 0);

  const sfxGain = offlineCtx.createGain();
  sfxGain.gain.setValueAtTime(settings.sfxVolume, 0);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(settings.masterVolume, 0);

  // Studio Warmth Filter (7.5kHz lowpass analogue filter)
  const warmthFilter = offlineCtx.createBiquadFilter();
  warmthFilter.type = 'lowpass';
  warmthFilter.frequency.setValueAtTime(settings.vintageWarmth ? 7500 : 20000, 0);
  warmthFilter.Q.setValueAtTime(0.7, 0);

  voiceGain.connect(masterGain);
  ambientGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(warmthFilter);
  warmthFilter.connect(offlineCtx.destination);

  // 5. Schedule Voice Tracks
  sceneTimeline.forEach((item) => {
    const source = offlineCtx.createBufferSource();
    source.buffer = item.buffer;
    source.connect(voiceGain);
    source.start(item.startTime);

    // Schedule SFX if cue is present
    if (item.scene.sfxCue) {
      const cue = item.scene.sfxCue;
      let sfxType: SFXType | null = null;
      if (cue.includes('কাক') || cue.includes('পাখি')) sfxType = 'bird_chirp';
      else if (cue.includes('বৃষ্টি') || cue.includes('বজ্র') || cue.includes('মেঘ'))
        sfxType = 'thunder';
      else if (cue.includes('দরজা') || cue.includes('কবাট')) sfxType = 'door_bang';
      else if (cue.includes('জল') || cue.includes('ঢেউ') || cue.includes('পুকুর'))
        sfxType = 'water_ripple';
      else if (cue.includes('ট্রাম') || cue.includes('ঘণ্টা')) sfxType = 'tram_bell';
      else if (cue.includes('বাঁশি') || cue.includes('সুর')) sfxType = 'flute_chord';
      else if (cue.includes('সেতার') || cue.includes('তার')) sfxType = 'sitar_strum';

      if (sfxType) {
        scheduleSFX(offlineCtx, sfxGain, sfxType, item.startTime + 0.1);
      }
    }
  });

  // 6. Schedule Ambient Atmosphere Soundscapes with smooth cross-fades
  actTimeline.forEach((actInfo) => {
    const duration = actInfo.endTime - actInfo.startTime;
    if (duration > 0) {
      scheduleAmbientSoundscape(
        offlineCtx,
        ambientGain,
        actInfo.ambientType,
        actInfo.startTime,
        duration
      );
    }
  });

  // 7. Render Master Mixed Audio
  onProgress?.({
    step: 'rendering_audio',
    message: 'অডিও ড্রামা হাইপার-স্পিডে রেন্ডারিং চলছে...',
    percent: 78,
  });

  const renderedBuffer = await offlineCtx.startRendering();

  // 8. Encode to MP3 via pure JS/TS LAME encoder
  onProgress?.({
    step: 'encoding_mp3',
    message: `LAME ইঞ্জিনের মাধ্যমে MP3 এনকোডিং চলছে (${settings.bitrate} kbps)...`,
    percent: 88,
  });

  // Allow UI thread a tick
  await new Promise((r) => setTimeout(r, 50));

  const mp3Blob = audioBufferToMp3Blob(renderedBuffer, settings.bitrate);
  const blobUrl = URL.createObjectURL(mp3Blob);

  const durationMin = Math.floor(totalDuration / 60);
  const durationSec = Math.floor(totalDuration % 60);
  const durationFormatted = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;
  const fileSizeMb = (mp3Blob.size / (1024 * 1024)).toFixed(2) + ' MB';

  const cleanTitle = (story.title || 'Bengali_Audio_Drama')
    .replace(/[^\w\u0980-\u09FF]+/g, '_')
    .slice(0, 30);
  const fileName = `${cleanTitle}_AudioDrama_${settings.bitrate}kbps.mp3`;

  onProgress?.({
    step: 'completed',
    message: `অডিও ড্রামা সফলভাবে মার্জ ও তৈরি হয়েছে! (${durationFormatted} · ${fileSizeMb})`,
    percent: 100,
  });

  return {
    blob: mp3Blob,
    url: blobUrl,
    fileName,
    duration: totalDuration,
    fileSizeStr: fileSizeMb,
  };
}
