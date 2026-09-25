import React, { useState } from 'react';
import { X, Mic, Volume2, Play, Check, Sliders, Sparkles, AudioWaveform } from 'lucide-react';
import { CHARACTER_VOICE_CONFIGS, storyAudio } from '../utils/audioEngine';

interface VoiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechEngineMode: 'gemini_neural' | 'browser_native';
  onChangeEngineMode: (mode: 'gemini_neural' | 'browser_native') => void;
  geminiVoicePersona: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
  onChangeVoicePersona: (persona: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr') => void;
}

export const VoiceStudioModal: React.FC<VoiceStudioModalProps> = ({
  isOpen,
  onClose,
  speechEngineMode,
  onChangeEngineMode,
  geminiVoicePersona,
  onChangeVoicePersona,
}) => {
  const [selectedChar, setSelectedChar] = useState<string>('narrator');
  const [testText, setTestText] = useState<string>('ভোর তখনও ভালো করে ফোটেনি... শীতের কুয়াশায় ঘাসের শিশির শুকোয়নি।');
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);

  if (!isOpen) return null;

  const charProfiles = [
    {
      key: 'narrator',
      name: 'কথক (আর্নব স্টাইল)',
      desc: 'প্রজ্ঞাপূর্ণ, গম্ভীর ও অন্তর্মুখী কণ্ঠ; দার্শনিক ভাবনার স্বগত উক্তি।',
      sample: 'মানুষের জীবনে সুখ বোধহয় এই পরিচিত জিনিসগুলোর মধ্যেই চুপ করে বসে থাকে। হারিয়ে ফেললে তবেই বোঝা যায় সে ছিল।',
    },
    {
      key: 'nishith',
      name: 'নিশীথ (তরুণ ও পরিণত)',
      desc: 'যৌবনে ব্যাকুল ও রোমান্টিক; পরিণত বয়সে সংযত ও আত্মবিশ্বাসী।',
      sample: 'নীতা, আর এক মুহূর্ত দেরি নয়... চলো, আজ রাতেই আমরা সব ছেড়ে দূরে কোথাও পালিয়ে যাই!',
    },
    {
      key: 'nabanita',
      name: 'নবনীতা (উদ্ধত ও অনমনীয়)',
      desc: 'প্রথমদিকে কঠোর ও উপহাসব্যঞ্জক; অন্তিমে ট্র্যাজিক অথচ ইস্পাতকঠিন অহংকার।',
      sample: 'আমার করুণা দরকার নেই নিশীথ! ভাবালুতার করুণায় তা ভিক্ষা হিসেবে গ্রহণ করার স্পৃহা আমার নেই!',
    },
    {
      key: 'minati',
      name: 'মিনতি (স্নিগ্ধ সহধর্মিণী)',
      desc: 'পরম মমতা, মিষ্টতা ও অল্পতেই পরম তৃপ্তির কণ্ঠ।',
      sample: 'মানুষের সুখ কি সোনার গহনায় থাকে গো? এই যে তুমি সুস্থ শরীরে ঘরে ফিরে আসো, এর চেয়ে বড় সম্পদ আর কী হতে পারে?',
    },
    {
      key: 'nirmal',
      name: 'ম্যানেজার নির্মল',
      desc: 'কর্কশ, ক্রূর ও নির্মম ক্ষমতার দম্ভ মিশ্রিত কর্তৃত্বব্যঞ্জক কণ্ঠ।',
      sample: 'চুপ কর চাষার দল! এই এস্টেটে জমিদারের হুকুম আর আমার কথাই আইন! যা আছে সব কেড়ে নে এদের কাছ থেকে!',
    },
    {
      key: 'proja',
      name: 'হরবিলাস প্রজা',
      desc: 'কাতর, কাঁদো কাঁদো ও সর্বহারা গ্রামীণ আর্তি।',
      sample: 'হুজুর! আমাগো এইটুকু মাত্র ভিটেজমি... এইটুকু কাইড়া নিলে আমরা না খাইয়া মইরা যামু হুজুর! একটু দয়া করেন!',
    },
  ];

  const personas: { id: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr'; name: string; tag: string }[] = [
    { id: 'Fenrir', name: 'Fenrir (ফেনরির)', tag: 'গম্ভীর, উদাত্ত ও পুরুষালী কথকের জন্য আদর্শ' },
    { id: 'Kore', name: 'Kore (কোরি)', tag: 'স্নিগ্ধ, মার্জিত ও সংবেদনশীল সাহিত্যিক কণ্ঠ' },
    { id: 'Puck', name: 'Puck (পাক)', tag: 'চটপটে, তরুণ ও আবেগপ্রবণ বাচনভঙ্গি' },
    { id: 'Charon', name: 'Charon (শ্যারন)', tag: 'ভারী, গম্ভীর ও দার্শনিক ট্র্যাজিক কণ্ঠ' },
    { id: 'Zephyr', name: 'Zephyr (জেফির)', tag: 'শান্ত, ধীর ও স্নিগ্ধ সুরেলা আবেশ' },
  ];

  const currentConfig = CHARACTER_VOICE_CONFIGS[selectedChar] || CHARACTER_VOICE_CONFIGS.narrator;

  const handleTestVoice = (sampleText?: string) => {
    const textToSpeak = sampleText || testText;
    setIsAuditioning(true);
    storyAudio.speakScene(
      textToSpeak,
      selectedChar,
      1.0,
      {
        onEnd: () => setIsAuditioning(false),
        onError: () => setIsAuditioning(false),
      },
      {
        emotion: charProfiles.find((c) => c.key === selectedChar)?.desc || 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
        speaker: charProfiles.find((c) => c.key === selectedChar)?.name || 'কথক',
      }
    );
  };

  const handleSelectChar = (key: string, sample: string) => {
    setSelectedChar(key);
    setTestText(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#161210] border border-[#2C241E] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#D97706]" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#FDFBF7]">
                বাংলা ভয়েস রিডার ও স্টোরিটেলার ইঞ্জিন (Voice Engine Studio)
              </h2>
              <p className="text-xs text-[#8C8275]">
                উন্নত বাংলা উচ্চারণ, খাঁটি বাচনভঙ্গি ও বহুভাষী স্বর রূপায়ণ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              storyAudio.stopSpeech();
              onClose();
            }}
            className="p-1 rounded text-[#8C8275] hover:text-[#FDFBF7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Engine Selector: Gemini Neural AI vs Browser */}
          <div className="p-3.5 rounded-lg border border-[#B45309]/40 bg-[#1F1712] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-bold text-[#FDFBF7] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                ভয়েস ইঞ্জিন মডেল নির্বাচন (Speech Model):
              </span>
              <span className="text-[11px] font-sans px-2 py-0.5 rounded bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/30">
                {speechEngineMode === 'gemini_neural' ? 'উচ্চ-মানের এআই নিউরাল কণ্ঠ' : 'ব্রাউজার স্পিচ'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeEngineMode('gemini_neural');
                  storyAudio.speechEngineMode = 'gemini_neural';
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  speechEngineMode === 'gemini_neural'
                    ? 'border-[#D97706] bg-[#2A1D15] text-[#FDFBF7] shadow-sm'
                    : 'border-[#2C241E] bg-[#120F0D] text-[#8C8275] hover:text-[#C2B7A3]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#F5EFE6]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  Gemini 3.8 Neural Voice (প্রস্তাবিত)
                </div>
                <div className="text-[11px] text-[#A89F91] mt-1 leading-tight">
                  স্বাভাবিক ও প্রাঞ্জল বাংলা উচ্চারণ, সঠিক ব্যাকরণিক বিরতি ও সাহিত্যিক নাট্যময় আবেগ।
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeEngineMode('browser_native');
                  storyAudio.speechEngineMode = 'browser_native';
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  speechEngineMode === 'browser_native'
                    ? 'border-[#D97706] bg-[#2A1D15] text-[#FDFBF7] shadow-sm'
                    : 'border-[#2C241E] bg-[#120F0D] text-[#8C8275] hover:text-[#C2B7A3]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#F5EFE6]">
                  <Volume2 className="w-3.5 h-3.5 text-[#A89F91]" />
                  Browser Native TTS (ডিফল্ট ব্রাউজার)
                </div>
                <div className="text-[11px] text-[#A89F91] mt-1 leading-tight">
                  আপনার ডিভাইসে ইনস্টল করা লোকাল বাংলা কণ্ঠ (কম্পিউটারাইজড টোন)।
                </div>
              </button>
            </div>

            {/* Neural Persona Selection */}
            {speechEngineMode === 'gemini_neural' && (
              <div className="pt-2 border-t border-[#2C241E] space-y-1.5">
                <label className="text-[11px] font-sans text-[#A89F91] block">
                  কথকের ভয়েস ব্যক্তিত্ব (Gemini Persona Timbre):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {personas.map((p) => {
                    const isSelected = geminiVoicePersona === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          onChangeVoicePersona(p.id);
                          storyAudio.geminiVoicePersona = p.id;
                        }}
                        className={`p-2 rounded text-left border text-xs transition-colors ${
                          isSelected
                            ? 'border-[#D97706] bg-[#2E1E14] text-[#FDFBF7] font-semibold'
                            : 'border-[#2C241E] bg-[#120F0D] text-[#8C8275] hover:text-[#C2B7A3]'
                        }`}
                      >
                        <div className="text-[#FDFBF7]">{p.name}</div>
                        <div className="text-[10px] text-[#8C8275] truncate">{p.tag}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Character selection tiles */}
          <div>
            <label className="text-xs font-sans text-[#A89F91] mb-2 block">
              চরিত্র নির্বাচন করুন ও কণ্ঠ পরীক্ষা করুন:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {charProfiles.map((char) => {
                const isSelected = selectedChar === char.key;
                return (
                  <button
                    key={char.key}
                    onClick={() => handleSelectChar(char.key, char.sample)}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      isSelected
                        ? 'border-[#D97706] bg-[#241A14] text-[#FDFBF7] shadow-sm'
                        : 'border-[#2C241E] bg-[#120F0D] hover:bg-[#1A1512] text-[#A89F91]'
                    }`}
                  >
                    <div className="font-serif text-xs font-bold text-[#FDFBF7] mb-1">
                      {char.name}
                    </div>
                    <div className="text-[11px] text-[#7C7265] line-clamp-2 leading-tight">
                      {char.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sample Line Box & Test Button */}
          <div className="space-y-2">
            <label className="text-xs font-sans text-[#A89F91] block">
              চরিত্রের সংলাপ / উক্তি (বদলিয়ে পরীক্ষা করতে পারেন):
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-lg border border-[#2C241E] bg-[#120F0D] text-[#FDFBF7] font-serif text-sm focus:outline-none focus:border-[#D97706] resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="text-xs text-[#8C8275]">
            ইঞ্জিন: {speechEngineMode === 'gemini_neural' ? `Gemini Flash Lite Neural (${geminiVoicePersona})` : 'Web Speech API (Native)'}
          </div>
          <button
            onClick={() => handleTestVoice()}
            disabled={isAuditioning}
            className="px-4 py-2 rounded-lg bg-[#D97706] hover:bg-[#F59E0B] text-[#120F0D] font-sans font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isAuditioning ? 'animate-spin' : ''}`} />
            <span>{isAuditioning ? 'উচ্চারণ তৈরি হচ্ছে...' : 'কণ্ঠ শুনুন (Audition Voice)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
