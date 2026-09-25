import React, { useState } from 'react';
import { X, BookOpen, Quote, Sparkles, Loader2 } from 'lucide-react';
import { StoryData } from '../data/stories';

interface LiteraryAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: StoryData;
}

export const LiteraryAnalysisModal: React.FC<LiteraryAnalysisModalProps> = ({
  isOpen,
  onClose,
  story,
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFetchAiAnalysis = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/stories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: story.title,
          excerpt: story.philosophicalOpening + ' ' + (story.acts[0]?.scenes[0]?.text || ''),
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#161210] border border-[#2C241E] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#D97706]" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#FDFBF7]">
                সাহিত্যিক বিশ্লেষণ ও মনস্তাত্ত্বিক রূপায়ণ
              </h2>
              <p className="text-xs text-[#8C8275]">
                {story.title} — {story.originalAuthor} | আর্নব স্টাইলের মর্মার্থ
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Philosophical Core & Key Quote */}
          <div className="p-4 rounded-lg border border-[#B45309]/30 bg-[#221711] space-y-2">
            <div className="flex items-center gap-2 text-xs font-serif text-[#D97706] font-medium">
              <Quote className="w-3.5 h-3.5" />
              <span>গল্পের চরম ট্র্যাজিক উক্তি:</span>
            </div>
            <p className="font-serif italic text-sm text-[#F5EFE6] leading-relaxed">
              “{story.literaryEpilogue.quote}”
            </p>
          </div>

          {/* Deep Narrative Breakdown */}
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-semibold text-[#FDFBF7] border-b border-[#2C241E] pb-1.5">
              উপমা ও মনস্তাত্ত্বিক দ্বন্দ্বের বিশ্লেষণ:
            </h3>
            <p className="text-sm font-serif leading-relaxed text-[#D5C9B3]">
              {story.literaryEpilogue.analysis}
            </p>
          </div>

          {/* Arnab's Storytelling Style Characteristics */}
          <div className="p-4 rounded-lg border border-[#2C241E] bg-[#120F0D] space-y-2.5">
            <h4 className="text-xs font-sans uppercase tracking-wider text-[#A89F91]">
              @BengaliClassicsByArnab উপস্থাপনার ৩টি স্তম্ভ:
            </h4>
            <ul className="text-xs text-[#C2B7A3] space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-[#FDFBF7]">প্রকৃতির সাথে মনের সুরের মিলন:</strong> ভোরের অস্পষ্ট কুয়াশা, বাঁশপাতার মর্মর ও শীতের শিশিরের মাধ্যমে মানুষের অপূর্ণ প্রেমের নিস্তব্ধ স্মৃতিকে জীবন্ত করা।
              </li>
              <li>
                <strong className="text-[#FDFBF7]">একক কথকের বহুভাষী কণ্ঠ:</strong> কোনো বাড়তি সঙ্গীত বা কোলাহল ছাড়া কথক নিজেই নিশীথের ব্যাকুলতা এবং নবনীতার বরফশীতল অহংকারকে কণ্ঠে ফুটিয়ে তোলেন।
              </li>
              <li>
                <strong className="text-[#FDFBF7]">নাটকীয় ক্লাইম্যাক্স ও ট্র্যাজেডি:</strong> শেষদৃশ্যে টাকার নোটগুলো কুটি-কুটি করে ছিঁড়ে বাতাসে ওড়ার মাধ্যমে নবনীতার অনমনীয় ধ্বংসকে এক মহাকাব্যিক উচ্চতায় নিয়ে যাওয়া।
              </li>
            </ul>
          </div>

          {/* AI Literary Deep Dive */}
          {aiAnalysis && (
            <div className="p-4 rounded-lg border border-[#D97706]/40 bg-[#1D1612] space-y-2">
              <div className="flex items-center gap-2 text-xs font-sans text-[#D97706] font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini এআই সাহিত্য সমালোচনা:</span>
              </div>
              <p className="text-xs font-serif leading-relaxed text-[#FDFBF7] whitespace-pre-line">
                {aiAnalysis}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="text-xs text-[#8C8275]">
            মূল রচনা অবলম্বনে প্রস্তুতকৃত সাহিত্য আলেখ্য
          </div>
          <button
            onClick={handleFetchAiAnalysis}
            disabled={isLoadingAi}
            className="px-4 py-2 rounded-lg bg-[#2A1E17] hover:bg-[#3A2A20] text-[#D97706] border border-[#B45309]/30 text-xs font-sans font-medium transition-colors flex items-center gap-2"
          >
            {isLoadingAi ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>বিশ্লেষণ তৈরি হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>অতিরিক্ত মনস্তাত্ত্বিক রসাস্বাদন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
