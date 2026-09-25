import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Check, Loader2, BookOpen, Music, BellRing } from 'lucide-react';
import { StoryAct, StoryScene } from '../data/stories';

export interface SceneEditTarget {
  type: 'scene';
  actIndex: number;
  scene: StoryScene;
}

export interface ActEditTarget {
  type: 'act';
  actIndex: number;
  act: StoryAct;
}

export interface IntroEditTarget {
  type: 'intro';
  text: string;
}

export type EditTarget = SceneEditTarget | ActEditTarget | IntroEditTarget;

interface SceneEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: EditTarget | null;
  storyTitle: string;
  author: string;
  onSaveScene: (actIndex: number, sceneId: string, updated: Partial<StoryScene>) => void;
  onSaveAct: (actIndex: number, updated: Partial<StoryAct>) => void;
  onSaveIntro: (newIntro: string) => void;
}

export const SceneEditModal: React.FC<SceneEditModalProps> = ({
  isOpen,
  onClose,
  target,
  storyTitle,
  author,
  onSaveScene,
  onSaveAct,
  onSaveIntro,
}) => {
  if (!isOpen || !target) return null;

  // Local state initialized depending on target
  const [textVal, setTextVal] = useState<string>(() => {
    if (target.type === 'scene') return target.scene.text;
    if (target.type === 'intro') return target.text;
    return target.act.actTitle;
  });

  const [emotionVal, setEmotionVal] = useState<string>(() => {
    if (target.type === 'scene') return target.scene.emotion;
    return '';
  });

  const [speakerVal, setSpeakerVal] = useState<string>(() => {
    if (target.type === 'scene') return target.scene.speaker;
    return '';
  });

  const [sfxCueVal, setSfxCueVal] = useState<string>(() => {
    if (target.type === 'scene') return target.scene.sfxCue || '';
    if (target.type === 'act') return target.act.sfx;
    return '';
  });

  const [bgmVal, setBgmVal] = useState<string>(() => {
    if (target.type === 'act') return target.act.bgm;
    return '';
  });

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regenSuccessNotice, setRegenSuccessNotice] = useState<string | null>(null);

  // Handle AI Regeneration using Arnab style
  const handleRegenerate = async (mode: 'metaphor' | 'intense' | 'poetic' | 'custom') => {
    setIsRegenerating(true);
    setRegenSuccessNotice(null);

    let instruction = customPrompt;
    if (mode === 'metaphor') {
      instruction = 'প্রকৃতির বিষাদময় উপমা (যেমন: ভোরের কুয়াশা, ঝরা পাতা, ভাঙা কবাট, বর্ষার জল) আরও নিবিড়ভাবে যুক্ত করে হৃদয়গ্রাহী করে পুনর্লিখন করুন।';
    } else if (mode === 'intense') {
      instruction = 'নাটকীয় দ্বন্দ্ব, চরিত্রের তীব্র মনস্তাত্ত্বিক টানাপোড়েন ও অনমনীয়তা আরও ফুটিয়ে তুলুন।';
    } else if (mode === 'poetic') {
      instruction = 'আর্নবের নিজস্ব অন্তর্মুখী, ধীর ও কাব্যিক বাচনভঙ্গিতে রূপান্তর করুন।';
    }

    try {
      const payload: any = {
        storyTitle,
        author,
        currentText: textVal,
        contextPrompt: instruction,
      };

      if (target.type === 'scene') {
        payload.type = 'scene';
        payload.speaker = speakerVal;
        payload.emotion = emotionVal;
      } else if (target.type === 'act') {
        payload.type = 'act_narrative';
        payload.actTitle = textVal;
      } else {
        payload.type = 'philosophical_intro';
      }

      const res = await fetch('/api/stories/regenerate-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.result) {
        if (target.type === 'scene') {
          if (data.result.text) setTextVal(data.result.text);
          if (data.result.emotion) setEmotionVal(data.result.emotion);
          if (data.result.sfxCue) setSfxCueVal(data.result.sfxCue);
        } else if (target.type === 'intro') {
          if (data.result.text) setTextVal(data.result.text);
        } else if (target.type === 'act') {
          if (data.result.actTitle) setTextVal(data.result.actTitle);
          if (data.result.sfx) setSfxCueVal(data.result.sfx);
          if (data.result.bgm) setBgmVal(data.result.bgm);
        }
        setRegenSuccessNotice('আর্নব স্টাইলে সফলভাবে পুনর্নির্মিত হয়েছে!');
        setTimeout(() => setRegenSuccessNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = () => {
    if (target.type === 'scene') {
      onSaveScene(target.actIndex, target.scene.id, {
        text: textVal,
        emotion: emotionVal,
        speaker: speakerVal,
        sfxCue: sfxCueVal,
      });
    } else if (target.type === 'intro') {
      onSaveIntro(textVal);
    } else if (target.type === 'act') {
      onSaveAct(target.actIndex, {
        actTitle: textVal,
        sfx: sfxCueVal,
        bgm: bgmVal,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161210] border border-[#2C241E] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#D97706]" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#FDFBF7]">
                {target.type === 'scene'
                  ? 'সংলাপ ও বাচনভঙ্গি সম্পাদনা ও পুনর্নির্মাণ'
                  : target.type === 'intro'
                  ? 'গল্পের দার্শনিক সূচনা সম্পাদনা'
                  : 'অধ্যায় ও আবহ পরিকল্পনা সম্পাদনা'}
              </h2>
              <p className="text-xs text-[#8C8275]">
                Bengali Classics by Arnab শৈলীতে কাস্টমাইজ বা এআই দ্বারা পুনর্লিখন করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8C8275] hover:text-[#FDFBF7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Quick Regenerate Presets */}
          <div className="p-3.5 rounded-lg border border-[#B45309]/30 bg-[#1D1612] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#D97706] font-semibold">
              <span className="flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                আর্নব স্টাইলে দ্রুত পুনর্নির্মাণ (One-Click AI Regenerate):
              </span>
              {regenSuccessNotice && (
                <span className="text-emerald-400 font-sans text-[11px] animate-pulse">
                  {regenSuccessNotice}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => handleRegenerate('metaphor')}
                className="p-2 rounded border border-[#2C241E] bg-[#120F0D] hover:bg-[#251B14] hover:border-[#D97706]/40 text-left text-xs transition-colors"
              >
                <div className="font-serif font-bold text-[#FDFBF7]">প্রকৃতির উপমা যোগ</div>
                <div className="text-[10px] text-[#8C8275] truncate">কুয়াশা, বৃষ্টি, শিশিরের মেলবন্ধন</div>
              </button>

              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => handleRegenerate('intense')}
                className="p-2 rounded border border-[#2C241E] bg-[#120F0D] hover:bg-[#251B14] hover:border-[#D97706]/40 text-left text-xs transition-colors"
              >
                <div className="font-serif font-bold text-[#FDFBF7]">নাটকীয় তীব্রতা বৃদ্ধি</div>
                <div className="text-[10px] text-[#8C8275] truncate">দ্বন্দ্ব ও মনস্তাত্ত্বিক সংঘাত</div>
              </button>

              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => handleRegenerate('poetic')}
                className="p-2 rounded border border-[#2C241E] bg-[#120F0D] hover:bg-[#251B14] hover:border-[#D97706]/40 text-left text-xs transition-colors"
              >
                <div className="font-serif font-bold text-[#FDFBF7]">কাব্যিক ও অন্তর্মুখী</div>
                <div className="text-[10px] text-[#8C8275] truncate">ধীর, সংবেদনশীল সুর</div>
              </button>
            </div>

            {/* Custom Regenerate Prompt Input */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="যেমন: 'নবনীতার স্বরে আরও বেশি তাচ্ছিল্য ও বরফশীতল ভাব দিন'..."
                className="flex-1 px-3 py-1.5 rounded border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
              />
              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => handleRegenerate('custom')}
                className="px-3 py-1.5 rounded bg-[#D97706] hover:bg-[#F59E0B] text-[#120F0D] text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors"
              >
                {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>রি-জেনারেট</span>
              </button>
            </div>
          </div>

          {/* Form Fields for Manual Editing */}
          {target.type === 'scene' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1">
                  চরিত্র / কথক:
                </label>
                <input
                  type="text"
                  value={speakerVal}
                  onChange={(e) => setSpeakerVal(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1">
                  কণ্ঠের আবেগ ও ভঙ্গি (Acting Emotion):
                </label>
                <input
                  type="text"
                  value={emotionVal}
                  onChange={(e) => setEmotionVal(e.target.value)}
                  placeholder="যেমন: হিমশীতল ও উপহাস ব্যঞ্জক গলায়"
                  className="w-full px-3 py-2 rounded border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>
            </div>
          )}

          {/* Text Area for Dialogue / Narrative */}
          <div className="space-y-1.5">
            <label className="text-xs font-sans text-[#A89F91] block">
              {target.type === 'scene'
                ? 'সংলাপ / বর্ণনার বাক্য (Edit Dialogue Text):'
                : target.type === 'intro'
                ? 'দার্শনিক সূচনা (Intro Text):'
                : 'অধ্যায়ের শিরোনাম:'}
            </label>
            <textarea
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              rows={target.type === 'scene' ? 4 : 3}
              className="w-full p-3 rounded-lg border border-[#2C241E] bg-[#120F0D] text-[#FDFBF7] font-serif text-sm leading-relaxed focus:outline-none focus:border-[#D97706] resize-none"
            />
          </div>

          {/* SFX / BGM Fields */}
          {target.type === 'scene' && (
            <div>
              <label className="text-xs font-sans text-[#A89F91] block mb-1">
                তাৎক্ষণিক শব্দ সংকেত (Optional SFX Cue):
              </label>
              <input
                type="text"
                value={sfxCueVal}
                onChange={(e) => setSfxCueVal(e.target.value)}
                placeholder="যেমন: বৃষ্টির শব্দ আরও তীব্র হয়, বিজলির বিকট চমক"
                className="w-full px-3 py-2 rounded border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
              />
            </div>
          )}

          {target.type === 'act' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-amber-500" />
                  প্রকৃতির সজীব শব্দসজ্জা (SFX Plan):
                </label>
                <input
                  type="text"
                  value={sfxCueVal}
                  onChange={(e) => setSfxCueVal(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  বাদ্যযন্ত্র ও আবহ সুর (BGM Mood):
                </label>
                <input
                  type="text"
                  value={bgmVal}
                  onChange={(e) => setBgmVal(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-[#2C241E] text-xs text-[#A89F91] hover:text-[#FDFBF7]"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[#D97706] hover:bg-[#F59E0B] text-[#120F0D] font-sans font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>সংরক্ষণ করুন (Save Changes)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
