import React, { useState, useEffect } from 'react';
import { Volume2, CloudRain, Sunrise, Wind, Building2, Bell, Radio, Sparkles, Compass, Sliders } from 'lucide-react';
import { AmbientMood, SFXType, storyAudio } from '../utils/audioEngine';

interface AtmosphereBoardProps {
  currentAmbient: AmbientMood;
  onSelectAmbient: (mood: AmbientMood) => void;
  onTriggerSFX: (type: SFXType) => void;
  vintageWarmth: boolean;
  onToggleVintageWarmth: (val: boolean) => void;
}

export const AtmosphereBoard: React.FC<AtmosphereBoardProps> = ({
  currentAmbient,
  onSelectAmbient,
  onTriggerSFX,
  vintageWarmth,
  onToggleVintageWarmth,
}) => {
  const [isCrossFading, setIsCrossFading] = useState(false);
  const [transitioningTo, setTransitioningTo] = useState<AmbientMood | null>(null);
  const [crossFadeDuration, setCrossFadeDuration] = useState<number>(storyAudio.crossFadeDuration);

  useEffect(() => {
    const unsubscribe = storyAudio.onAmbientTransition((fading, mood) => {
      setIsCrossFading(fading);
      setTransitioningTo(fading ? mood : null);
    });
    return unsubscribe;
  }, []);

  const handleDurationChange = (dur: number) => {
    setCrossFadeDuration(dur);
    storyAudio.crossFadeDuration = dur;
  };

  const ambientPresets: { id: AmbientMood; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dawn_mist',
      label: 'ভোরের কুহেলিকা',
      icon: <Sunrise className="w-4 h-4 text-amber-400" />,
      desc: 'বাঁশপাতার খসখস ও ধীর তানপুরা',
    },
    {
      id: 'monsoon_rain',
      label: 'শ্রাবণের বৃষ্টি',
      icon: <CloudRain className="w-4 h-4 text-blue-400" />,
      desc: 'মুষলধারে বৃষ্টি ও দূরবর্তী মেঘ',
    },
    {
      id: 'peaceful_village',
      label: 'পল্লীর সকাল',
      icon: <Wind className="w-4 h-4 text-emerald-400" />,
      desc: 'শান্ত পুকুরঘাট ও স্নিগ্ধ বাঁশি',
    },
    {
      id: 'zamindar_court',
      label: 'জমিদার দরবার',
      icon: <Building2 className="w-4 h-4 text-purple-400" />,
      desc: 'গম্ভীর ঐশ্বর্য ও ভারী তানপুরা',
    },
    {
      id: 'dusty_road',
      label: 'ধূলিমলিন পথ',
      icon: <Compass className="w-4 h-4 text-amber-500" />,
      desc: 'অনাবৃত প্রান্তর ও তপ্ত বাতাস',
    },
    {
      id: 'calcutta_alley',
      label: 'কলকাতার অলিগলি',
      icon: <Building2 className="w-4 h-4 text-stone-400" />,
      desc: 'স্যাঁতসেঁতে গলি ও ট্রামের সুর',
    },
  ];

  const sfxList: { id: SFXType; label: string }[] = [
    { id: 'bird_chirp', label: 'পাখির করুণ ডাক' },
    { id: 'thunder', label: 'বিজলি ও মেঘের ডাক' },
    { id: 'tram_bell', label: 'ট্রামলাইনের ঘণ্টা' },
    { id: 'door_creak', label: 'পুরনো কবাটের ক্যাঁচক্যাঁচ' },
    { id: 'door_bang', label: 'সশব্দে দরজা বন্ধ (BANG!)' },
    { id: 'paper_tear', label: 'নোট কুটি-কুটি করে ছেঁড়া' },
    { id: 'flute_chord', label: 'বিষাদময় বাঁশি' },
    { id: 'sitar_strum', label: 'সেতারের সুর' },
  ];

  return (
    <div className="border border-[#2C241E] bg-[#161210] rounded-lg p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2C241E]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#D97706]" />
          <h3 className="font-serif text-sm font-semibold text-[#F5EFE6]">
            আবহ ও ধ্বনি পরিকল্পনা (Soundscapes & SFX)
          </h3>
        </div>
        <button
          onClick={() => onToggleVintageWarmth(!vintageWarmth)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1.5 ${
            vintageWarmth
              ? 'border-[#B45309]/50 bg-[#B45309]/20 text-[#F59E0B]'
              : 'border-[#2C241E] bg-[#120F0D] text-[#8C8275]'
          }`}
          title="ভিন্টেজ অ্যানালগ স্টুডিও রিবন মাইক্রোফোন ও টিউব ওয়ার্মথ ফিল্টার"
        >
          <Sparkles className="w-3 h-3" />
          <span>অ্যানালগ টেপ ওয়ার্মথ: {vintageWarmth ? 'অন' : 'অফ'}</span>
        </button>
      </div>

      {/* Ambient Mood Presets & Cross-fade Info */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-[#8C8275] font-sans flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#D97706]" />
            <span>প্রকৃতির সজীব আবহ (Ambient Soundscapes)</span>
          </div>

          {/* Cross-fade Status Badge */}
          {isCrossFading ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#F59E0B] bg-[#B45309]/20 border border-[#B45309]/50 px-2 py-0.5 rounded-full animate-pulse font-sans">
              <Sparkles className="w-3 h-3 text-[#F59E0B]" />
              <span>স্মুথ ক্রস-ফেড রূপান্তর চলছে...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[#8C8275]">
              <span className="text-[#A89F91]">ক্রস-ফেড:</span>
              <button
                type="button"
                onClick={() => handleDurationChange(crossFadeDuration === 2.2 ? 3.5 : crossFadeDuration === 3.5 ? 1.5 : 2.2)}
                className="px-1.5 py-0.5 rounded bg-[#1F1915] border border-[#2C241E] hover:border-[#D97706]/40 text-[#E0D5C1] font-mono text-[10px] transition-colors"
                title="ক্লিক করে ক্রস-ফেড টাইমিং পরিবর্তন করুন"
              >
                {crossFadeDuration}s
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ambientPresets.map((item) => {
            const isActive = currentAmbient === item.id;
            const isFadingIn = isCrossFading && transitioningTo === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectAmbient(isActive ? 'none' : item.id)}
                className={`p-2.5 rounded text-left border transition-all relative overflow-hidden ${
                  isActive
                    ? 'border-[#D97706] bg-[#241A14] text-[#F5EFE6] shadow-sm ring-1 ring-[#D97706]/30'
                    : isFadingIn
                    ? 'border-[#D97706]/60 bg-[#241A14]/70 text-[#F5EFE6] animate-pulse'
                    : 'border-[#2C241E] bg-[#120F0D]/60 hover:bg-[#1C1713] text-[#A89F91]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {item.icon}
                    <span className="font-serif text-xs font-medium text-[#F5EFE6]">
                      {item.label}
                    </span>
                  </div>
                  {isActive && !isCrossFading && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                  {isFadingIn && (
                    <span className="text-[9px] text-amber-300 font-sans font-medium px-1 bg-amber-950/80 rounded border border-amber-600/40">
                      ফেড-ইন
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#7C7265] leading-tight line-clamp-1">
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SFX Quick triggers */}
      <div>
        <div className="text-xs text-[#8C8275] mb-2 font-sans flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-[#D97706]" />
          <span>নাট্য মুহূর্তের শব্দ সংকেত (Instant SFX Cues)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sfxList.map((sfx) => (
            <button
              key={sfx.id}
              onClick={() => onTriggerSFX(sfx.id)}
              className="px-2.5 py-1 text-xs rounded border border-[#2C241E] bg-[#120F0D] hover:bg-[#201A16] hover:border-[#D97706]/40 text-[#C2B7A3] transition-colors"
            >
              {sfx.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
