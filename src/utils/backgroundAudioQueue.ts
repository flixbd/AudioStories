/**
 * Background Sequential Audio Generator Queue
 * Continuously and sequentially generates audio for every scene/part of the story in the background.
 * Automatically saves each completed audio segment to browser IndexedDB storage so refreshes don't lose it.
 * Gracefully handles rate limits and quota cooldowns with automated countdown and auto-resume.
 */

import { StoryData, StoryScene } from '../data/stories';
import { storyAudio } from './audioEngine';
import {
  getSceneCacheKey,
  hasAudioInStorage,
  saveAudioToStorage,
  getAudioFromStorage,
} from './audioStorage';

export interface BackgroundQueueState {
  status: 'idle' | 'running' | 'paused' | 'cooling_down' | 'completed';
  storyId: string;
  voicePersona: string;
  totalScenes: number;
  completedScenes: number;
  currentActTitle: string;
  currentSpeaker: string;
  currentTextSnippet: string;
  cooldownSeconds: number;
  message: string;
  lastError?: string | null;
}

export type BackgroundQueueListener = (state: BackgroundQueueState) => void;

class BackgroundAudioQueueManager {
  private activeStory: StoryData | null = null;
  private voicePersona: string = 'Fenrir';
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private shouldAbort: boolean = false;

  private state: BackgroundQueueState = {
    status: 'idle',
    storyId: '',
    voicePersona: 'Fenrir',
    totalScenes: 0,
    completedScenes: 0,
    currentActTitle: '',
    currentSpeaker: '',
    currentTextSnippet: '',
    cooldownSeconds: 0,
    message: 'ব্যাকগ্রাউন্ড অডিও জেনারেটর প্রস্তুত',
    lastError: null,
  };

  private listeners: Set<BackgroundQueueListener> = new Set();
  private cooldownInterval: any = null;

  public subscribe(listener: BackgroundQueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): BackgroundQueueState {
    return { ...this.state };
  }

  private updateState(partial: Partial<BackgroundQueueState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => {
      try {
        fn(this.getState());
      } catch (err) {
        console.error('Background queue listener error:', err);
      }
    });
  }

  /**
   * Start or resume background generation for a story
   */
  public async start(story: StoryData, voicePersona: string = 'Fenrir') {
    this.activeStory = story;
    this.voicePersona = voicePersona;
    this.isPaused = false;
    this.shouldAbort = false;

    if (this.isProcessing) {
      return;
    }

    this.processQueue();
  }

  /**
   * Pause generation
   */
  public pause() {
    this.isPaused = true;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.updateState({
      status: 'paused',
      message: 'ব্যাকগ্রাউন্ড অডিও জেনারেশন সাময়িক স্থগিত রয়েছে',
    });
  }

  /**
   * Resume generation
   */
  public resume() {
    if (!this.activeStory) return;
    this.isPaused = false;
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Stop generation
   */
  public stop() {
    this.shouldAbort = true;
    this.isPaused = false;
    this.isProcessing = false;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.updateState({
      status: 'idle',
      message: 'ব্যাকগ্রাউন্ড অডিও জেনারেশন বন্ধ করা হয়েছে',
    });
  }

  /**
   * Generate audio for a single targeted scene immediately
   */
  public async generateScene(
    story: StoryData,
    actIdx: number,
    scene: StoryScene,
    voicePersona: string = this.voicePersona
  ): Promise<boolean> {
    const cacheKey = getSceneCacheKey(voicePersona, scene.characterKey, scene.text);
    // 1. Check if already in memory
    if (storyAudio.getCachedAudio(cacheKey)) {
      return true;
    }
    // 2. Check IndexedDB
    const stored = await getAudioFromStorage(cacheKey);
    if (stored) {
      const ctx = storyAudio.getAudioContext();
      const buffer = storyAudio.decodePcmToBuffer(ctx, stored.audioBase64, stored.sampleRate);
      storyAudio.setCachedAudio(cacheKey, buffer);
      return true;
    }

    // 3. Generate from API
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
        const ctx = storyAudio.getAudioContext();
        const buffer = storyAudio.decodePcmToBuffer(ctx, data.audioBase64, data.sampleRate || 24000);
        storyAudio.setCachedAudio(cacheKey, buffer);

        // Commit to IndexedDB for permanence
        await saveAudioToStorage({
          key: cacheKey,
          storyId: story.id,
          sceneId: scene.id,
          actNumber: actIdx + 1,
          voicePersona,
          characterKey: scene.characterKey,
          textSnippet: scene.text.slice(0, 60),
          audioBase64: data.audioBase64,
          sampleRate: data.sampleRate || 24000,
          createdAt: Date.now(),
        });
        return true;
      }
    } catch (e) {
      console.warn('Single scene generate error:', e);
    }
    return false;
  }

  /**
   * Main sequential processing loop
   */
  private async processQueue() {
    if (!this.activeStory) return;
    this.isProcessing = true;

    // Collect all scenes flat
    const flatList: {
      actIdx: number;
      actTitle: string;
      scene: StoryScene;
      sceneIdx: number;
    }[] = [];

    (this.activeStory.acts || []).forEach((act, actIdx) => {
      (act.scenes || []).forEach((sc, sceneIdx) => {
        flatList.push({
          actIdx,
          actTitle: act.actTitle,
          scene: sc,
          sceneIdx,
        });
      });
    });

    const total = flatList.length;
    this.updateState({
      storyId: this.activeStory.id,
      voicePersona: this.voicePersona,
      totalScenes: total,
      status: 'running',
    });

    for (let i = 0; i < flatList.length; i++) {
      if (this.shouldAbort) {
        break;
      }

      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 400));
        if (this.shouldAbort) break;
      }

      if (this.shouldAbort) break;

      const item = flatList[i];
      const cacheKey = getSceneCacheKey(this.voicePersona, item.scene.characterKey, item.scene.text);

      // Check if already in memory
      let isAlreadyCached = !!storyAudio.getCachedAudio(cacheKey);

      // If not in memory, check IndexedDB
      if (!isAlreadyCached) {
        const stored = await getAudioFromStorage(cacheKey);
        if (stored) {
          const ctx = storyAudio.getAudioContext();
          const buffer = storyAudio.decodePcmToBuffer(ctx, stored.audioBase64, stored.sampleRate);
          storyAudio.setCachedAudio(cacheKey, buffer);
          isAlreadyCached = true;
        }
      }

      if (isAlreadyCached) {
        // Count how many are completed so far
        let completedCount = 0;
        for (const f of flatList) {
          const k = getSceneCacheKey(this.voicePersona, f.scene.characterKey, f.scene.text);
          if (storyAudio.getCachedAudio(k)) {
            completedCount++;
          }
        }
        this.updateState({
          completedScenes: completedCount,
          currentActTitle: item.actTitle,
          currentSpeaker: item.scene.speaker,
          currentTextSnippet: item.scene.text.slice(0, 50),
          message: `সংরক্ষিত রয়েছে: ${completedCount}/${total} দৃশ্য প্রস্তুত`,
        });
        continue;
      }

      // Not cached: need to generate via API
      this.updateState({
        status: 'running',
        currentActTitle: item.actTitle,
        currentSpeaker: item.scene.speaker,
        currentTextSnippet: item.scene.text.slice(0, 50),
        message: `জেনারেট হচ্ছে: ${item.actTitle} - ${item.scene.speaker} (${i + 1}/${total})`,
      });

      let success = false;
      let attempt = 0;

      while (!success && attempt < 3 && !this.shouldAbort && !this.isPaused) {
        attempt++;
        try {
          const res = await fetch('/api/tts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: item.scene.text,
              voiceName: this.voicePersona,
              characterKey: item.scene.characterKey,
              emotion: item.scene.emotion || 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
              speaker: item.scene.speaker || 'কথক',
            }),
          });

          const data = await res.json().catch(() => null);

          // Rate limit handling
          if (!res.ok || data?.rateLimited) {
            const retrySec = data?.retryAfterSeconds || 60;
            this.handleCooldown(retrySec);
            // Wait for cooldown to expire
            while (this.state.status === 'cooling_down' && !this.shouldAbort && !this.isPaused) {
              await new Promise((r) => setTimeout(r, 1000));
            }
            continue;
          }

          if (data?.success && data?.audioBase64) {
            const ctx = storyAudio.getAudioContext();
            const buffer = storyAudio.decodePcmToBuffer(ctx, data.audioBase64, data.sampleRate || 24000);
            storyAudio.setCachedAudio(cacheKey, buffer);

            // Save immediately to browser IndexedDB
            await saveAudioToStorage({
              key: cacheKey,
              storyId: this.activeStory.id,
              sceneId: item.scene.id,
              actNumber: item.actIdx + 1,
              voicePersona: this.voicePersona,
              characterKey: item.scene.characterKey,
              textSnippet: item.scene.text.slice(0, 60),
              audioBase64: data.audioBase64,
              sampleRate: data.sampleRate || 24000,
              createdAt: Date.now(),
            });

            success = true;
          } else {
            // General failure, wait a little before retry
            await new Promise((r) => setTimeout(r, 1200));
          }
        } catch (fetchErr) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      // Re-count completed scenes
      let completedCount = 0;
      for (const f of flatList) {
        const k = getSceneCacheKey(this.voicePersona, f.scene.characterKey, f.scene.text);
        if (storyAudio.getCachedAudio(k)) {
          completedCount++;
        }
      }

      this.updateState({
        completedScenes: completedCount,
        message: `সংরক্ষিত হয়েছে: ${completedCount}/${total} দৃশ্য প্রস্তুত`,
      });

      // Polite breathing delay between items (400ms) to avoid aggressive bursting
      await new Promise((r) => setTimeout(r, 400));
    }

    this.isProcessing = false;
    let finalCompleted = 0;
    for (const f of flatList) {
      const k = getSceneCacheKey(this.voicePersona, f.scene.characterKey, f.scene.text);
      if (storyAudio.getCachedAudio(k)) {
        finalCompleted++;
      }
    }

    if (!this.shouldAbort && finalCompleted >= total) {
      this.updateState({
        status: 'completed',
        completedScenes: total,
        message: `গল্পের সমস্ত দৃশ্য (${total}/${total}) ব্রাউজারে সফলভাবে সংরক্ষিত হয়েছে!`,
      });
    } else if (!this.shouldAbort) {
      this.updateState({
        status: 'idle',
        message: `জেনারেট সম্পন্ন: ${finalCompleted}/${total} সংরক্ষিত।`,
      });
    }
  }

  private handleCooldown(retrySec: number) {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }

    let remaining = retrySec;
    this.updateState({
      status: 'cooling_down',
      cooldownSeconds: remaining,
      message: `কোটা বিরতি: ${remaining} সেকেন্ড পর স্বয়ংক্রিয়ভাবে পুনরায় শুরু হবে...`,
    });

    this.cooldownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
        this.updateState({
          status: 'running',
          cooldownSeconds: 0,
          message: 'পুনরায় ব্যাকগ্রাউন্ড অডিও জেনারেশন শুরু হচ্ছে...',
        });
      } else {
        this.updateState({
          cooldownSeconds: remaining,
          message: `কোটা বিরতি: ${remaining} সেকেন্ড পর স্বয়ংক্রিয়ভাবে পুনরায় শুরু হবে...`,
        });
      }
    }, 1000);
  }
}

export const backgroundAudioQueue = new BackgroundAudioQueueManager();
