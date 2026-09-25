import React from 'react';
import { StoryData } from '../data/stories';
import { Play, Pause, RotateCcw, Volume2, Mic, HardDrive, Sparkles } from 'lucide-react';

interface StoryHeroProps {
  story: StoryData;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  currentActIndex: number;
  onEditIntro?: () => void;
  onOpenDrive?: () => void;
  speechEngineMode?: 'gemini_neural' | 'browser_native';
  onChangeSpeechEngineMode?: (mode: 'gemini_neural' | 'browser_native') => void;
  isRateLimited?: boolean;
  rateLimitCooldownSec?: number;
  onOpenVoiceStudio?: () => void;
}

export const StoryHero: React.FC<StoryHeroProps> = ({
  story,
  isPlaying,
  onTogglePlay,
  onRestart,
  currentActIndex,
  onEditIntro,
  onOpenDrive,
  speechEngineMode = 'gemini_neural',
  onChangeSpeechEngineMode,
  isRateLimited = false,
  rateLimitCooldownSec = 0,
  onOpenVoiceStudio,
}) => {
  return (
    <div className="relative rounded-xl border border-[#2C241E] bg-[#161210] overflow-hidden">
      {/* Background Hero Banner with soft dark scrim */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        <img
          src={story.heroImage}
          alt={story.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-60 contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161210] via-[#161210]/60 to-transparent" />

        {/* Floating Top Info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-sans text-[#E0D5C1] bg-[#120F0D]/80 backdrop-blur-md px-3 py-1.5 rounded border border-[#2C241E]">
            <span className="text-[#D97706] font-medium">মূল রচনা: {story.originalAuthor}</span>
            <span aria-hidden="true" className="text-[#594F45]">·</span>
            <span>{story.durationEst}</span>
            <span aria-hidden="true" className="text-[#594F45]">·</span>
            <span>৬ পর্বের পূর্ণাঙ্গ অডিও ড্রামা</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#E0D5C1] bg-[#120F0D]/80 backdrop-blur-md px-3 py-1.5 rounded border border-[#2C241E]">
            <Mic className="w-3.5 h-3.5 text-[#D97706]" />
            <span>@BengaliClassicsByArnab শৈলী</span>
          </div>
        </div>

        {/* Hero Title & Philosophical Subtitle */}
        <div className="absolute bottom-6 left-6 right-6 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#FDFBF7] tracking-tight mb-2 drop-shadow-md">
            {story.title}
          </h1>
          <div className="flex items-start gap-2 group">
            <p className="text-sm sm:text-base font-serif italic text-[#C2B7A3] leading-relaxed drop-shadow line-clamp-2">
              “{story.philosophicalOpening}”
            </p>
            {onEditIntro && (
              <button
                type="button"
                onClick={onEditIntro}
                className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[11px] rounded bg-[#1C1511]/90 border border-[#B45309]/50 text-[#F5EFE6] shrink-0 flex items-center gap-1 mt-1"
                title="দার্শনিক সূচনা সম্পাদনা বা আর্নব স্টাইলে রি-জেনারেট করুন"
              >
                <span>সূচনা এডিট</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quota Notification Banner if Gemini Rate Limited */}
      {isRateLimited && (
        <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-lg border border-amber-600/40 bg-gradient-to-r from-amber-950/40 to-[#18120E] flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              Gemini AI অডিও ফ্রি-টিয়ার কোটা বিরতি চলছে (বাকি {rateLimitCooldownSec} সে.) — গল্প থেমে নেই, নিরবচ্ছিন্নভাবে ব্রাউজারের বাংলা কণ্ঠে পাঠ চলমান রয়েছে।
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-900/60 border border-amber-500/40 text-amber-300">
              {rateLimitCooldownSec}s অপেক্ষা
            </span>
            <button
              type="button"
              onClick={() => onChangeSpeechEngineMode?.('browser_native')}
              className="text-[11px] underline hover:text-[#FFF] text-amber-300"
            >
              ব্রাউজার মোডে থাকুন
            </button>
          </div>
        </div>
      )}

      {/* Story Meta & Quick Actions Bar */}
      <div className="p-4 sm:p-6 border-t border-[#2C241E] bg-[#14100E] flex flex-wrap items-center justify-between gap-4">
        {/* Story Theme & Act Progress */}
        <div className="space-y-1">
          <div className="text-xs text-[#8C8275] font-sans">
            <span>গল্পের মূলসুর:</span>{' '}
            <span className="text-[#C2B7A3] font-medium">{story.theme}</span>
          </div>
          <div className="text-xs font-serif text-[#D97706]">
            চলমান: {story.acts[currentActIndex]?.actTitle || 'পর্ব সমাপ্ত'}
          </div>
        </div>

        {/* Master Play Controls & Drive Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Voice Mode Switcher */}
          {onChangeSpeechEngineMode && (
            <div className="flex items-center p-0.5 rounded-lg border border-[#2C241E] bg-[#1A1411]">
              <button
                type="button"
                onClick={() => onChangeSpeechEngineMode('gemini_neural')}
                className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1 transition-all ${
                  speechEngineMode === 'gemini_neural'
                    ? isRateLimited
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                      : 'bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/40 font-medium'
                    : 'text-[#8C8275] hover:text-[#C2B7A3]'
                }`}
                title="Gemini AI নিউরাল বাচনভঙ্গি (অনবদ্য সাহিত্যিক কণ্ঠ)"
              >
                <Sparkles className="w-3 h-3 text-[#D97706]" />
                <span className="hidden sm:inline">এআই কণ্ঠ</span>
                <span className="sm:hidden">AI</span>
                {isRateLimited && rateLimitCooldownSec > 0 && (
                  <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-200 font-mono">
                    {rateLimitCooldownSec}s
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onChangeSpeechEngineMode('browser_native')}
                className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1 transition-all ${
                  speechEngineMode === 'browser_native'
                    ? 'bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/40 font-medium'
                    : 'text-[#8C8275] hover:text-[#C2B7A3]'
                }`}
                title="ডিভাইসের লোকাল বাংলা ভয়েস রিডার"
              >
                <Volume2 className="w-3 h-3 text-[#A89F91]" />
                <span className="hidden sm:inline">ব্রাউজার কণ্ঠ</span>
                <span className="sm:hidden">Local</span>
              </button>
            </div>
          )}

          {onOpenDrive && (
            <button
              onClick={onOpenDrive}
              className="p-2.5 rounded-lg border border-[#2C241E] bg-[#1A1411] hover:bg-[#261E1A] text-[#C2B7A3] hover:text-[#F5EFE6] transition-colors flex items-center gap-1.5 text-xs font-sans"
              title="গুগল ড্রাইভে সংরক্ষণ ও লাইব্রেরি"
            >
              <HardDrive className="w-4 h-4 text-[#D97706]" />
              <span className="hidden md:inline">ড্রাইভে সংরক্ষণ</span>
            </button>
          )}

          <button
            onClick={onRestart}
            className="p-2.5 rounded-lg border border-[#2C241E] bg-[#1A1411] hover:bg-[#261E1A] text-[#A89F91] hover:text-[#F5EFE6] transition-colors"
            title="গল্পের শুরুতে ফিরে যান"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="px-4 sm:px-5 py-2.5 rounded-lg bg-[#D97706] hover:bg-[#F59E0B] text-[#120F0D] font-sans font-semibold text-sm transition-all shadow-md flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>স্থগিত (Pause)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>শুনুন গল্প (Play)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

