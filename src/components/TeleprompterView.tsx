import React, { useState, useEffect, useRef } from 'react';
import { StoryAct, StoryScene } from '../data/stories';
import {
  Play,
  Pause,
  Volume2,
  Mic,
  Music,
  BellRing,
  Edit3,
  Sparkles,
  Eye,
  CheckCircle2,
  Loader2,
  HardDrive,
  Trash2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { BackgroundQueueState } from '../utils/backgroundAudioQueue';
import { getSceneCacheKey } from '../utils/audioStorage';

interface TeleprompterViewProps {
  acts: StoryAct[];
  currentActIndex: number;
  currentSceneId: string;
  isPlaying: boolean;
  onSelectScene: (actIdx: number, scene: StoryScene) => void;
  playbackSpeed: number;
  onChangeSpeed: (spd: number) => void;
  fontSize: 'standard' | 'large';
  onToggleFontSize: () => void;
  onEditScene: (actIdx: number, scene: StoryScene) => void;
  onEditAct: (actIdx: number, act: StoryAct) => void;

  // Audio persistence & background queue props
  voicePersona: string;
  cachedSceneKeys: Set<string>;
  generatingSceneId?: string | null;
  onGenerateSceneAudio?: (actIdx: number, scene: StoryScene) => void;
  backgroundQueueState?: BackgroundQueueState;
  onStartBackgroundGen?: () => void;
  onPauseBackgroundGen?: () => void;
  onResumeBackgroundGen?: () => void;
  onClearAudioCache?: () => void;
  cachedStats?: { count: number; estimatedMb: number };
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  acts,
  currentActIndex,
  currentSceneId,
  isPlaying,
  onSelectScene,
  playbackSpeed,
  onChangeSpeed,
  fontSize,
  onToggleFontSize,
  onEditScene,
  onEditAct,
  voicePersona,
  cachedSceneKeys,
  generatingSceneId,
  onGenerateSceneAudio,
  backgroundQueueState,
  onStartBackgroundGen,
  onPauseBackgroundGen,
  onResumeBackgroundGen,
  onClearAudioCache,
  cachedStats,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showQueueDetails, setShowQueueDetails] = useState<boolean>(true);

  // Automatically scroll the active line into the exact vertical center of the viewport as audio playback progresses
  useEffect(() => {
    if (!autoScrollEnabled) return;

    const scrollActiveIntoCenter = () => {
      const container = viewportRef.current;
      const target = activeLineRef.current;
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const offset =
        targetRect.top -
        containerRect.top -
        containerRect.height / 2 +
        targetRect.height / 2;

      const newScrollTop = container.scrollTop + offset;

      container.scrollTo({
        top: Math.max(0, newScrollTop),
        behavior: 'smooth',
      });
    };

    const rafId = requestAnimationFrame(() => {
      scrollActiveIntoCenter();
    });

    return () => cancelAnimationFrame(rafId);
  }, [currentSceneId, currentActIndex, isPlaying, fontSize, autoScrollEnabled]);

  const getSpeakerColor = (characterKey: StoryScene['characterKey']) => {
    switch (characterKey) {
      case 'narrator':
        return 'text-[#D97706] border-[#D97706]/30 bg-[#251A14]';
      case 'nishith':
        return 'text-[#60A5FA] border-[#60A5FA]/30 bg-[#141C25]';
      case 'nabanita':
        return 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#261E14]';
      case 'minati':
        return 'text-[#34D399] border-[#34D399]/30 bg-[#12231A]';
      case 'nirmal':
        return 'text-[#F87171] border-[#F87171]/30 bg-[#261515]';
      case 'proja':
        return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#221A11]';
      default:
        return 'text-[#A89F91] border-[#2C241E] bg-[#161210]';
    }
  };

  // Calculate story total scenes
  let totalStoryScenes = 0;
  acts.forEach((a) => {
    totalStoryScenes += a.scenes?.length || 0;
  });

  const completedCount = backgroundQueueState?.completedScenes ?? cachedStats?.count ?? 0;
  const progressPercent = totalStoryScenes > 0 ? Math.min(100, Math.round((completedCount / totalStoryScenes) * 100)) : 0;
  const isQueueRunning = backgroundQueueState?.status === 'running';
  const isCoolingDown = backgroundQueueState?.status === 'cooling_down';
  const isPaused = backgroundQueueState?.status === 'paused';
  const isCompleted = backgroundQueueState?.status === 'completed' || (totalStoryScenes > 0 && completedCount >= totalStoryScenes);

  return (
    <div className="border border-[#2C241E] bg-[#161210] rounded-xl overflow-hidden flex flex-col h-[700px]">
      {/* Teleprompter Top Controller */}
      <div className="p-3 sm:p-4 border-b border-[#2C241E] bg-[#14100E] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#D97706]" />
          <span className="font-serif text-sm font-semibold text-[#F5EFE6]">
            অডিও ড্রামা স্ক্রিপ্ট ও টেলিপ্রম্পটার (Interactive Script Reader)
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          {/* Background Queue Collapse Toggle */}
          <button
            onClick={() => setShowQueueDetails(!showQueueDetails)}
            className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1.5 transition-colors ${
              showQueueDetails
                ? 'border-[#D97706]/40 bg-[#251A14] text-[#D97706]'
                : 'border-[#2C241E] bg-[#1A1411] text-[#A89F91] hover:text-[#F5EFE6]'
            }`}
            title="ধারাবাহিক ব্যাকগ্রাউন্ড অডিও জেনারেটর প্যানেল প্রদর্শন বা আড়াল করুন"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>অডিও ব্যাকগ্রাউন্ড প্যানেল</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#161210] text-[#E0D5C1]">
              {completedCount}/{totalStoryScenes}
            </span>
          </button>

          {/* Auto-scroll Center Follow Toggle */}
          <button
            onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
            className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1.5 transition-colors ${
              autoScrollEnabled
                ? 'border-[#D97706]/40 bg-[#251A14] text-[#D97706]'
                : 'border-[#2C241E] bg-[#1A1411] text-[#7C7265]'
            }`}
            title="চলমান সংলাপ স্বয়ংক্রিয়ভাবে স্ক্রিনের কেন্দ্রে আনা (Auto Center)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">অটো-সেন্টার</span>
            <span className="text-[10px]">{autoScrollEnabled ? 'অন' : 'অফ'}</span>
          </button>

          {/* Font Size Toggle */}
          <button
            onClick={onToggleFontSize}
            className="px-2.5 py-1 rounded border border-[#2C241E] bg-[#1A1411] text-[#A89F91] hover:text-[#F5EFE6] transition-colors"
          >
            অক্ষর: {fontSize === 'large' ? 'বড়' : 'স্বাভাবিক'}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 border border-[#2C241E] bg-[#1A1411] p-0.5 rounded">
            {[0.8, 0.9, 1.0, 1.1].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-[#D97706] text-[#120F0D] font-semibold'
                    : 'text-[#8C8275] hover:text-[#E0D5C1]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Background Sequential Audio Generator & Persistence Banner */}
      {showQueueDetails && (
        <div className="border-b border-[#2C241E] bg-gradient-to-r from-[#1A130E] via-[#1F1711] to-[#161210] p-3 sm:p-4 text-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  isQueueRunning
                    ? 'bg-[#D97706]/20 border-[#D97706]/50 text-[#D97706] animate-pulse'
                    : isCoolingDown
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                    : isCompleted
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#221812] border-[#2C241E] text-[#A89F91]'
                }`}
              >
                {isQueueRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D97706]" />
                ) : isCoolingDown ? (
                  <Clock className="w-4 h-4 text-amber-400 animate-bounce" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <HardDrive className="w-4 h-4 text-[#D97706]" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif font-bold text-[#FDFBF7] text-xs sm:text-sm">
                    ধারাবাহিক ব্যাকগ্রাউন্ড অডিও জেনারেশন (অটো-সেভ)
                  </span>
                  {isQueueRunning && (
                    <span className="px-2 py-0.5 rounded-full bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/40 text-[10px] animate-pulse font-sans">
                      তৈরি হচ্ছে...
                    </span>
                  )}
                  {isCoolingDown && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/40 text-[10px] font-sans">
                      কোটা বিরতি: {backgroundQueueState?.cooldownSeconds} সে.
                    </span>
                  )}
                  {isCompleted && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-sans">
                      ১০০% সংরক্ষিত
                    </span>
                  )}
                </div>
                <p className="text-[#A89F91] text-[11px] mt-0.5 leading-relaxed">
                  {backgroundQueueState?.message ||
                    'যে যে পার্টের অডিও তৈরি হবে, ব্রাউজার তা স্বয়ংক্রিয়ভাবে সেভ রাখবে যেন পেজ রিফ্রেশ করলেও মুছে না যায়।'}
                </p>
              </div>
            </div>

            {/* Queue Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {isQueueRunning ? (
                <button
                  onClick={onPauseBackgroundGen}
                  className="px-3 py-1.5 rounded-lg bg-[#251A14] border border-[#D97706]/50 text-[#F59E0B] hover:bg-[#302117] flex items-center gap-1.5 font-medium transition-all"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>স্থগিত রাখুন</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={onResumeBackgroundGen}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#120F0D] hover:opacity-95 flex items-center gap-1.5 font-bold transition-all shadow-md shadow-[#D97706]/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>পুনরায় চালান</span>
                </button>
              ) : !isCompleted ? (
                <button
                  onClick={onStartBackgroundGen}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#120F0D] hover:opacity-95 flex items-center gap-1.5 font-bold transition-all shadow-md shadow-[#D97706]/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ধারাবাহিক জেনারেশন শুরু</span>
                </button>
              ) : (
                <button
                  onClick={onStartBackgroundGen}
                  className="px-3 py-1.5 rounded-lg border border-[#2C241E] bg-[#161210] text-[#A89F91] hover:text-[#F5EFE6] flex items-center gap-1.5 transition-all text-[11px]"
                  title="প্রয়োজনে সবকটি অডিও পুনরায় ব্যাকগ্রাউন্ডে যাচাই করুন"
                >
                  <Sparkles className="w-3 h-3 text-[#D97706]" />
                  <span>পুনরায় যাচাই</span>
                </button>
              )}

              {onClearAudioCache && completedCount > 0 && (
                <button
                  onClick={onClearAudioCache}
                  className="p-1.5 rounded-lg border border-[#2C241E] hover:border-red-500/40 text-[#8C8275] hover:text-red-400 bg-[#161210] transition-colors"
                  title="ব্রাউজারে সংরক্ষিত ক্যাশ অডিও পরিষ্কার করুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Subtext */}
          <div className="mt-2.5 pt-2 border-t border-[#261E18]/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#A89F91]">
              <span className="flex items-center gap-1.5">
                <span className="text-[#C2B7A3] font-medium">ব্রাউজার সংরক্ষণ অগ্রগতি:</span>
                <span className="text-[#F5EFE6] font-semibold">
                  {completedCount} / {totalStoryScenes} দৃশ্য
                </span>
                {cachedStats?.estimatedMb ? (
                  <span className="text-[10px] text-[#786F62]">
                    (~{cachedStats.estimatedMb} MB স্টোরেজ)
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-[#D97706] font-semibold">{progressPercent}%</span>
            </div>

            <div className="w-full bg-[#120F0D] rounded-full h-1.5 overflow-hidden border border-[#2A2019]">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-[#D97706] to-[#F59E0B]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Scrollable Script Viewport */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin scrollbar-thumb-[#2C241E]"
      >
        {(acts || []).map((act, actIdx) => {
          const isCurrentAct = actIdx === currentActIndex;
          return (
            <div key={act?.actNumber || actIdx + 1} className="space-y-4">
              {/* Act Header Box with Edit button */}
              <div
                className={`p-4 rounded-lg border transition-all ${
                  isCurrentAct
                    ? 'border-[#B45309]/60 bg-[#1D1612]'
                    : 'border-[#2C241E] bg-[#14100E]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-[#FDFBF7]">
                      {act.actTitle}
                    </h3>
                    {isCurrentAct && (
                      <span className="text-[11px] font-sans text-[#D97706] font-medium tracking-wide">
                        চলমান অধ্যায়
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onEditAct(actIdx, act)}
                    className="px-2 py-1 text-[11px] font-sans rounded border border-[#2C241E] bg-[#161210] hover:bg-[#251B14] hover:border-[#D97706]/40 text-[#C2B7A3] hover:text-[#F5EFE6] transition-colors flex items-center gap-1.5"
                    title="এই পর্বের শিরোনাম, শব্দ ও আবহ সম্পাদনা করুন"
                  >
                    <Edit3 className="w-3 h-3 text-[#D97706]" />
                    <span>পর্ব সম্পাদনা ও আবহ পুনর্নির্মাণ</span>
                  </button>
                </div>

                {/* SFX and BGM Instructions */}
                <div className="space-y-1.5 text-xs text-[#A89F91] border-t border-[#2C241E] pt-2 mt-2">
                  <div className="flex items-start gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-[#C2B7A3]">SFX:</strong> {act.sfx}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Music className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-[#C2B7A3]">BGM:</strong> {act.bgm}
                    </span>
                  </div>
                  <div className="text-[11px] italic text-[#8C8275] pl-5">
                    কথকের বাচনভঙ্গি নির্দেশ: {act.narratorTone}
                  </div>
                </div>
              </div>

              {/* Act Scenes List */}
              <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-[#241D17]">
                {(act?.scenes || []).map((scene) => {
                  const isActive = currentSceneId === scene.id;
                  const sceneKey = getSceneCacheKey(voicePersona, scene.characterKey, scene.text);
                  const isCached = cachedSceneKeys.has(sceneKey);
                  const isGenerating = generatingSceneId === scene.id;

                  return (
                    <div
                      key={scene.id}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => onSelectScene(actIdx, scene)}
                      className={`group cursor-pointer rounded-lg p-3.5 sm:p-4 border transition-all duration-200 relative ${
                        isActive
                          ? 'border-[#D97706] bg-[#221812] shadow-lg shadow-[#D97706]/10 ring-1 ring-[#D97706]/30'
                          : 'border-transparent hover:border-[#2C241E] hover:bg-[#1A1411]'
                      }`}
                    >
                      {/* Character & Emotion Cue Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-serif font-medium rounded border ${getSpeakerColor(
                              scene.characterKey,
                            )}`}
                          >
                            {scene.speaker}
                          </span>
                          <span className="text-xs text-[#8C8275] italic">
                            ({scene.emotion})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Saved / Cached in Browser Indicator Badge */}
                          {isCached ? (
                            <span
                              className="px-2 py-0.5 text-[10px] rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-sans flex items-center gap-1 shadow-sm"
                              title="এই পার্টের অডিও ব্রাউজার মেমোরিতে স্থায়ীভাবে সেভ করা রয়েছে (রিফ্রেশ করলেও থাকবে)"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>অডিও সংরক্ষিত</span>
                            </span>
                          ) : isGenerating ? (
                            <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-950/70 border border-amber-500/40 text-amber-300 font-sans flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                              <span>অডিও তৈরি হচ্ছে...</span>
                            </span>
                          ) : onGenerateSceneAudio ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onGenerateSceneAudio(actIdx, scene);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[10px] rounded bg-[#201813] border border-[#2C241E] hover:border-[#D97706]/50 text-[#C2B7A3] hover:text-[#F5EFE6] flex items-center gap-1"
                              title="এই বাক্যটির অডিও এখনি তৈরি করে ব্রাউজারে সেভ করুন"
                            >
                              <Volume2 className="w-2.5 h-2.5 text-[#D97706]" />
                              <span>অডিও বানান</span>
                            </button>
                          ) : null}

                          {isActive && isPlaying && (
                            <span className="flex items-center gap-1.5 text-xs text-[#D97706] font-medium mr-1">
                              <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                              <span>পড়ছেন...</span>
                            </span>
                          )}

                          {/* Quick Edit & Regenerate Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditScene(actIdx, scene);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[11px] rounded bg-[#201813] border border-[#2C241E] hover:border-[#D97706]/50 text-[#C2B7A3] hover:text-[#F5EFE6] flex items-center gap-1"
                            title="এই বাক্যটি সম্পাদনা করুন বা আর্নব স্টাইলে পুনর্লিখন করুন"
                          >
                            <Edit3 className="w-3 h-3 text-[#D97706]" />
                            <span>সম্পাদনা</span>
                          </button>
                        </div>
                      </div>

                      {/* Dialogue / Narrative Text */}
                      <p
                        className={`font-serif leading-relaxed transition-colors ${
                          fontSize === 'large' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                        } ${
                          isActive
                            ? 'text-[#FDFBF7] font-medium'
                            : 'text-[#D5C9B3] group-hover:text-[#F5EFE6]'
                        }`}
                      >
                        {scene.text}
                      </p>

                      {/* Inline SFX Cue */}
                      {scene.sfxCue && (
                        <div className="mt-2 text-xs text-[#E0A96D] bg-[#2C1F15]/60 px-2.5 py-1 rounded inline-block border border-[#B45309]/20 font-sans">
                          🎵 {scene.sfxCue}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
