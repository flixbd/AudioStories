import React, { useEffect, useRef } from 'react';
import { StoryAct, StoryScene } from '../data/stories';
import { Play, Volume2, Mic, Music, BellRing, Edit3, Sparkles, RefreshCw } from 'lucide-react';

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
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll smooth follow
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSceneId]);

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

  return (
    <div className="border border-[#2C241E] bg-[#161210] rounded-xl overflow-hidden flex flex-col h-[640px]">
      {/* Teleprompter Top Controller */}
      <div className="p-3 sm:p-4 border-b border-[#2C241E] bg-[#14100E] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#D97706]" />
          <span className="font-serif text-sm font-semibold text-[#F5EFE6]">
            অডিও ড্রামা স্ক্রিপ্ট ও টেলিপ্রম্পটার (Interactive Script Reader)
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
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

      {/* Main Scrollable Script Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin scrollbar-thumb-[#2C241E]">
        {acts.map((act, actIdx) => {
          const isCurrentAct = actIdx === currentActIndex;
          return (
            <div key={act.actNumber} className="space-y-4">
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
                {act.scenes.map((scene) => {
                  const isActive = currentSceneId === scene.id;
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

                        <div className="flex items-center gap-2">
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
                            <span>সম্পাদনা / রি-জেনারেট</span>
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

