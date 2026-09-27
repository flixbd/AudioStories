import React from 'react';
import { Volume2, Sparkles, Sliders, BookOpen, HardDrive, Upload, Download } from 'lucide-react';
import { User } from 'firebase/auth';

interface TopNavProps {
  onOpenVoiceStudio: () => void;
  onOpenGenerator: () => void;
  onOpenAnalysis: () => void;
  onOpenDrive: () => void;
  onOpenExport: () => void;
  activeStoryTitle: string;
  speechEngineMode: 'gemini_neural' | 'browser_native';
  geminiVoicePersona: string;
  currentUser: User | null;
  hasDriveToken: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenVoiceStudio,
  onOpenGenerator,
  onOpenAnalysis,
  onOpenDrive,
  onOpenExport,
  activeStoryTitle,
  speechEngineMode,
  geminiVoicePersona,
  currentUser,
  hasDriveToken,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2C241E] bg-[#120F0D]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#B45309]/20 border border-[#B45309]/40 flex items-center justify-center text-[#D97706]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif text-lg tracking-tight text-[#F5EFE6] font-semibold block leading-none">
              বাংলা অডিও ক্লাসিক্স
            </span>
            <span className="text-[11px] font-sans text-[#A89F91] tracking-wide block mt-1">
              Bengali Classics by Arnab শৈলীতে একক কথকের আলেখ্য
            </span>
          </div>
        </div>

        {/* Zone 2: Clean nav links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-sans text-[#C2B7A3]">
          <span className="text-[#D97706] font-medium truncate max-w-[200px]">
            এখন শুনছেন: {activeStoryTitle}
          </span>
          <button
            onClick={onOpenAnalysis}
            className="hover:text-[#F5EFE6] transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-[#A89F91]" />
            সাহিত্যিক বিশ্লেষণ
          </button>
          <button
            onClick={onOpenVoiceStudio}
            className="hover:text-[#F5EFE6] transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#201813] border border-[#B45309]/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="text-xs text-[#F5EFE6]">
              {speechEngineMode === 'gemini_neural'
                ? `এআই নিউরাল কণ্ঠ (${geminiVoicePersona})`
                : 'ডিফল্ট ব্রাউজার কণ্ঠ'}
            </span>
          </button>
        </nav>

        {/* Zone 3: Primary action + Google Drive Hub */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenDrive}
            className={`px-3 py-1.5 text-xs font-sans rounded border transition-all flex items-center gap-1.5 ${
              hasDriveToken
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200 hover:bg-emerald-900/60'
                : 'bg-[#201813] border-[#443024] text-[#C2B7A3] hover:text-[#F5EFE6] hover:border-[#D97706]/50'
            }`}
            title="গুগল ড্রাইভ স্টোরি হাব"
          >
            <HardDrive className={`w-3.5 h-3.5 ${hasDriveToken ? 'text-emerald-400' : 'text-[#D97706]'}`} />
            {currentUser && hasDriveToken ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ড্রাইভ যুক্ত</span>
              </span>
            ) : (
              <span>গুগল ড্রাইভ</span>
            )}
          </button>

          <button
            onClick={onOpenExport}
            className="px-3 py-1.5 text-xs font-sans rounded border border-[#D97706]/40 bg-[#201813] hover:bg-[#2A1E16] text-[#F5EFE6] hover:border-[#D97706] transition-all flex items-center gap-1.5 shadow-sm"
            title="সম্পূর্ণ অডিও ড্রামা MP3 ফাইল হিসেবে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="hidden sm:inline">MP3 ডাউনলোড</span>
            <span className="sm:hidden">MP3</span>
          </button>

          <button
            onClick={onOpenGenerator}
            className="px-3.5 py-1.5 text-xs font-sans font-medium text-[#120F0D] bg-[#D97706] hover:bg-[#F59E0B] transition-colors rounded shadow-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>নতুন গল্প / আপলোড</span>
          </button>
        </div>
      </div>
    </header>
  );
};

