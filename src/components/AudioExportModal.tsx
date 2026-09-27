import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Sliders,
  Music,
  Mic,
  Sparkles,
  CheckCircle2,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Disc,
  FileAudio,
  Radio,
  Share2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { StoryData } from '../data/stories';
import { exportStoryToMp3, ExportProgress, ExportSettings, ExportResult } from '../utils/audioExporter';

interface AudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: StoryData;
  voicePersona: 'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
}

export const AudioExportModal: React.FC<AudioExportModalProps> = ({
  isOpen,
  onClose,
  story,
  voicePersona,
}) => {
  // Export Settings State
  const [scope, setScope] = useState<'full' | number>('full');
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [ambientVolume, setAmbientVolume] = useState<number>(0.35);
  const [sfxVolume, setSfxVolume] = useState<number>(0.5);
  const [vintageWarmth, setVintageWarmth] = useState<boolean>(true);
  const [bitrate, setBitrate] = useState<128 | 192>(128);

  // Export Progress State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // In-modal preview audio player
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Clean up object URLs on unmount or new export
  useEffect(() => {
    return () => {
      if (exportResult?.url) {
        URL.revokeObjectURL(exportResult.url);
      }
    };
  }, [exportResult]);

  // Audio preview playback listeners
  useEffect(() => {
    const audio = audioPreviewRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setPreviewCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setPreviewDuration(audio.duration || 0);
    const handleEnded = () => setIsPlayingPreview(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [exportResult]);

  if (!isOpen) return null;

  const totalActs = story.acts?.length || 0;
  const totalScenes =
    story.acts?.reduce((acc, act) => acc + (act.scenes?.length || 0), 0) || 0;

  const selectedScenesCount =
    scope === 'full'
      ? totalScenes
      : story.acts?.[scope]?.scenes?.length || 0;

  // Trigger MP3 Export Pipeline
  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setExportResult(null);
    setIsPlayingPreview(false);

    const settings: ExportSettings = {
      scope,
      voicePersona,
      voiceVolume,
      ambientVolume,
      sfxVolume,
      masterVolume: 0.88,
      vintageWarmth,
      bitrate,
    };

    try {
      const result = await exportStoryToMp3(story, settings, (p) => {
        setProgress(p);
      });
      setExportResult(result);
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMsg(err.message || 'অডিও ড্রামা তৈরি করার সময় অপ্রত্যাশিত সমস্যা হয়েছে।');
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger direct browser file download
  const handleDownloadMp3 = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((e) => console.error(e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioPreviewRef.current) return;
    const time = parseFloat(e.target.value);
    audioPreviewRef.current.currentTime = time;
    setPreviewCurrentTime(time);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161210] border border-[#2C241E] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706]">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#FDFBF7]">
                  অডিও ড্রামা মার্জিং ও MP3 ডাউনলোড
                </h2>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-medium">
                  Studio Export
                </span>
              </div>
              <p className="text-xs text-[#8C8275] mt-0.5">
                কথকের কণ্ঠ, আবহ সঙ্গীত ও সাউন্ড এফেক্টস মার্জ করে সম্পূর্ণ MP3 ফাইল সংরক্ষণ করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C8275] hover:text-[#FDFBF7] hover:bg-[#201813] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Story Summary Card */}
          <div className="p-4 rounded-xl border border-[#2C241E] bg-[#120F0D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-sans text-[#D97706] font-medium tracking-wide">
                অডিও ড্রামা সংকলন
              </span>
              <h3 className="font-serif text-base font-bold text-[#FDFBF7] mt-0.5">
                {story.title}
              </h3>
              <p className="text-xs text-[#8C8275] mt-0.5">
                মূল লেখক: <span className="text-[#C2B7A3]">{story.originalAuthor}</span> · শৈলী:{' '}
                <span className="text-[#C2B7A3]">@BengaliClassicsByArnab</span>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#A89F91] border-t sm:border-t-0 sm:border-l border-[#2C241E] pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="block text-[10px] text-[#7C7265]">মোট পর্ব</span>
                <span className="font-mono text-sm font-semibold text-[#FDFBF7]">{totalActs}টি</span>
              </div>
              <div className="w-px h-6 bg-[#2C241E]" />
              <div>
                <span className="block text-[10px] text-[#7C7265]">মোট দৃশ্য</span>
                <span className="font-mono text-sm font-semibold text-[#FDFBF7]">{totalScenes}টি</span>
              </div>
              <div className="w-px h-6 bg-[#2C241E]" />
              <div>
                <span className="block text-[10px] text-[#7C7265]">ভয়েস পারসোনা</span>
                <span className="font-serif text-xs font-semibold text-[#D97706]">{voicePersona}</span>
              </div>
            </div>
          </div>

          {/* If Result Ready: Download and Preview Banner */}
          {exportResult && (
            <div className="p-5 rounded-2xl border border-emerald-600/60 bg-gradient-to-br from-emerald-950/40 via-[#141A14] to-[#120F0D] space-y-4 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-emerald-200">
                      MP3 অডিও ড্রামা সফলভাবে প্রস্তুত হয়েছে!
                    </h4>
                    <p className="text-xs text-emerald-300/70 mt-0.5">
                      কথকের কণ্ঠ, আবহ সঙ্গীত ও সাউন্ড এফেক্টস সম্পূর্ণ মার্জ করা হয়েছে
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                  {exportResult.fileSizeStr}
                </span>
              </div>

              {/* Audio Preview Player */}
              <div className="p-3.5 rounded-xl bg-[#0D120D] border border-emerald-800/40 space-y-2.5">
                <audio ref={audioPreviewRef} src={exportResult.url} preload="auto" />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={togglePreviewPlay}
                    className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors shadow-md shrink-0"
                    title={isPlayingPreview ? 'বিরতি' : 'প্লে করুন'}
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={previewDuration || exportResult.duration}
                      step={0.1}
                      value={previewCurrentTime}
                      onChange={handleSeek}
                      className="w-full accent-emerald-500 h-1.5 bg-[#202E20] rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-emerald-300/80">
                      <span>{formatSeconds(previewCurrentTime)}</span>
                      <span>{formatSeconds(previewDuration || exportResult.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Action Button */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadMp3}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-sans font-bold text-sm transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 group"
                >
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  <span>MP3 ফাইল ডাউনলোড করুন ({exportResult.fileSizeStr})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportResult(null)}
                  className="px-4 py-3 rounded-xl border border-[#2C241E] bg-[#161210] hover:bg-[#201813] text-xs text-[#A89F91] hover:text-[#FDFBF7] transition-colors"
                >
                  নতুন করে মিক্স করুন
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar during Export */}
          {isExporting && progress && (
            <div className="p-4 rounded-xl border border-[#D97706]/40 bg-[#1A1410] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#D97706]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-serif font-semibold">{progress.message}</span>
                </div>
                <span className="font-mono text-xs font-bold text-[#FDFBF7]">
                  {progress.percent}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#2C241E] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <p className="text-[11px] text-[#8C8275] text-center">
                কথকের সংলাপ, আবহ সুর ও শব্দসজ্জা স্বয়ংক্রিয়ভাবে মার্জ হচ্ছে, অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন...
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-900/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Export Settings Panel (only shown when not completed or when customizing) */}
          {!exportResult && (
            <div className="space-y-4">
              {/* 1. Scope: Full Story vs Single Act */}
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-2 font-medium">
                  ১. এক্সপোর্ট পরিধি (Export Scope):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setScope('full')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      scope === 'full'
                        ? 'border-[#D97706] bg-[#221711] shadow-md shadow-[#D97706]/10'
                        : 'border-[#2C241E] bg-[#120F0D] hover:bg-[#181310] text-[#8C8275]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-[#FDFBF7]">
                        সম্পূর্ণ অডিও ড্রামা (Full Story)
                      </span>
                      {scope === 'full' && <Check className="w-4 h-4 text-[#D97706]" />}
                    </div>
                    <p className="text-xs text-[#8C8275] mt-0.5">
                      সবগুলো পর্ব ({totalActs}টি পর্ব · {totalScenes}টি দৃশ্য) ও সমাপ্তি বিশ্লেষণ
                    </p>
                  </button>

                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      scope !== 'full'
                        ? 'border-[#D97706] bg-[#221711] shadow-md shadow-[#D97706]/10'
                        : 'border-[#2C241E] bg-[#120F0D] text-[#8C8275]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif font-bold text-sm text-[#FDFBF7]">
                        নির্দিষ্ট পর্ব (Single Act)
                      </span>
                      {scope !== 'full' && <Check className="w-4 h-4 text-[#D97706]" />}
                    </div>
                    <select
                      value={scope === 'full' ? 0 : scope}
                      onChange={(e) => setScope(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1 text-xs rounded border border-[#2C241E] bg-[#100D0B] text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706] mt-1"
                    >
                      {story.acts?.map((act, idx) => (
                        <option key={act.actNumber} value={idx}>
                          {act.actTitle} ({act.scenes?.length || 0} দৃশ্য)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Audio Mix Sliders */}
              <div className="border border-[#2C241E] rounded-xl p-4 bg-[#120F0D] space-y-4">
                <div className="flex items-center justify-between border-b border-[#2C241E] pb-2">
                  <div className="flex items-center gap-2 text-xs font-sans font-medium text-[#FDFBF7]">
                    <Sliders className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>২. মাল্টি-ট্র্যাক অডিও মিক্সার (Soundtrack Balance)</span>
                  </div>
                  <span className="text-[11px] text-[#7C7265]">সরাসরি মার্জ হবে</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Voice Volume */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A89F91] flex items-center gap-1.5">
                        <Mic className="w-3 h-3 text-[#D97706]" />
                        <span>কথকের কণ্ঠ:</span>
                      </span>
                      <span className="font-mono text-[#FDFBF7] text-[11px]">
                        {Math.round(voiceVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-full accent-[#D97706] h-1.5 bg-[#2C241E] rounded cursor-pointer"
                    />
                    <span className="text-[10px] text-[#7C7265] block">উজ্জ্বল ও স্পষ্ট ডায়ালগ</span>
                  </div>

                  {/* Ambient Volume */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A89F91] flex items-center gap-1.5">
                        <Music className="w-3 h-3 text-emerald-400" />
                        <span>আবহ সঙ্গীত:</span>
                      </span>
                      <span className="font-mono text-[#FDFBF7] text-[11px]">
                        {Math.round(ambientVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={0.8}
                      step={0.05}
                      value={ambientVolume}
                      onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-[#2C241E] rounded cursor-pointer"
                    />
                    <span className="text-[10px] text-[#7C7265] block">কুয়াশা, বৃষ্টি ও ড্রোন আবহ</span>
                  </div>

                  {/* SFX Volume */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A89F91] flex items-center gap-1.5">
                        <Volume2 className="w-3 h-3 text-amber-400" />
                        <span>শব্দসজ্জা (SFX):</span>
                      </span>
                      <span className="font-mono text-[#FDFBF7] text-[11px]">
                        {Math.round(sfxVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={sfxVolume}
                      onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-[#2C241E] rounded cursor-pointer"
                    />
                    <span className="text-[10px] text-[#7C7265] block">পাখি, বজ্রপাত ও কবাটের আওয়াজ</span>
                  </div>
                </div>
              </div>

              {/* 3. Audio Quality & Vintage Warmth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Vintage Warmth Toggle */}
                <div
                  onClick={() => setVintageWarmth(!vintageWarmth)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    vintageWarmth
                      ? 'border-[#B45309]/50 bg-[#1D1612]'
                      : 'border-[#2C241E] bg-[#120F0D]'
                  }`}
                >
                  <div>
                    <span className="font-serif font-semibold text-xs text-[#FDFBF7] block">
                      অ্যানালগ ভিন্টেজ ওয়ার্মথ (7.5 kHz)
                    </span>
                    <span className="text-[11px] text-[#8C8275]">
                      রেডিও ড্রামার মতো ভেলভেটি উষ্ণ অ্যানালগ টেক্সচার
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={vintageWarmth}
                    onChange={(e) => setVintageWarmth(e.target.checked)}
                    className="accent-[#D97706] w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* MP3 Bitrate */}
                <div className="p-3 rounded-xl border border-[#2C241E] bg-[#120F0D] flex items-center justify-between gap-3">
                  <div>
                    <span className="font-serif font-semibold text-xs text-[#FDFBF7] block">
                      MP3 কোয়ালিটি / বিটরেট
                    </span>
                    <span className="text-[11px] text-[#8C8275]">
                      স্ট্যান্ডার্ড ১২৮ kbps বা ১৯২ kbps স্টুডিও মাস্টার
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#1A1411] p-0.5 rounded border border-[#2C241E]">
                    <button
                      type="button"
                      onClick={() => setBitrate(128)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        bitrate === 128
                          ? 'bg-[#D97706] text-[#120F0D] font-bold'
                          : 'text-[#8C8275] hover:text-[#C2B7A3]'
                      }`}
                    >
                      128k
                    </button>
                    <button
                      type="button"
                      onClick={() => setBitrate(192)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        bitrate === 192
                          ? 'bg-[#D97706] text-[#120F0D] font-bold'
                          : 'text-[#8C8275] hover:text-[#C2B7A3]'
                      }`}
                    >
                      192k
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#2C241E] bg-[#14100E] flex items-center justify-between gap-3">
          <div className="text-xs text-[#8C8275] hidden sm:block">
            নির্বাচিত দৃশ্য: <span className="text-[#FDFBF7] font-semibold">{selectedScenesCount}টি</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl border border-[#2C241E] text-xs text-[#A89F91] hover:text-[#FDFBF7] hover:bg-[#161210] transition-colors"
            >
              বন্ধ করুন
            </button>

            {!exportResult && (
              <button
                type="button"
                onClick={handleStartExport}
                disabled={isExporting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-[#B45309] hover:to-[#D97706] disabled:opacity-50 text-[#120F0D] font-sans font-bold text-xs transition-all shadow-md flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>অডিও মার্জিং হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>MP3 ড্রামা রেন্ডার ও তৈরি করুন</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
