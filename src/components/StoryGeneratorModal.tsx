import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  FileUp,
  ArrowRight,
  RefreshCw,
  FileCode,
  Check,
  FileCheck,
} from 'lucide-react';
import { StoryData } from '../data/stories';

interface StoryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryGenerated: (newStory: StoryData) => void;
}

interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
  charCount?: number;
  wordCount?: number;
}

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
  isOpen,
  onClose,
  onStoryGenerated,
}) => {
  // Navigation tab: 'upload' (default) or 'prompt'
  const [activeTab, setActiveTab] = useState<'upload' | 'prompt'>('upload');

  // Basic Story Details
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [theme, setTheme] = useState('');
  const [contextPrompt, setContextPrompt] = useState('');

  // Upload states
  const [uploadedFileInfo, setUploadedFileInfo] = useState<UploadedFileInfo | null>(null);
  const [uploadedText, setUploadedText] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [directStoryJson, setDirectStoryJson] = useState<StoryData | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Loading & error states
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Hidden file input refs
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const presets = [
    {
      title: 'মহেশ',
      author: 'শরৎচন্দ্র চট্টোপাধ্যায়',
      theme: 'দারিদ্র্য, অবোলা জীবের ভালোবাসা ও সমাজের নিষ্ঠুরতা',
      contextPrompt:
        'বৈশাখ মাসের প্রখর রৌদ্রে ফাটল ধরা শুকনো মাটির সাথে নিরুপায় কৃষক গফুরের বক্ষের রক্তক্ষরণের মিল রেখে শুরু হবে।',
    },
    {
      title: 'পোস্টমাস্টার',
      author: 'রবীন্দ্রনাথ ঠাকুর',
      theme: 'নির্জন প্রবাস, অনাথ বালিকা রতনের নিঃশব্দ ভালোবাসা ও বিচ্ছেদ',
      contextPrompt:
        'বর্ষায় ভরা নদীর ঘূর্ণিজল আর বৃষ্টির অবিরাম ধারায় রতনের স্তব্ধ নিঃসঙ্গ চোখের জলের রূপক তুলে ধরা।',
    },
    {
      title: 'মেঘমল্লার',
      author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
      theme: 'ভারতীয় উচ্চাঙ্গ সঙ্গীতের আধ্যাত্মিক শক্তি ও প্রকৃতির মেলবন্ধন',
      contextPrompt:
        'প্রাচীন তপোবনের সায়াহ্নে মেঘমল্লার রাগের ধীর আলাপ এবং আকাশে পুঞ্জীভূত মেঘের গর্জন।',
    },
  ];

  const handleApplyPreset = (p: (typeof presets)[0]) => {
    setTitle(p.title);
    setAuthor(p.author);
    setTheme(p.theme);
    setContextPrompt(p.contextPrompt);
  };

  // Convert File to Base64 String
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data:*/*;base64,
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Parse file content with Gemini to auto-extract title, author & theme
  const parseDocumentWithAI = async (
    textToAnalyze: string,
    b64: string | null,
    mime: string | null,
    fileName: string
  ) => {
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/stories/parse-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze.slice(0, 12000),
          fileBase64: b64,
          fileMimeType: mime,
          fileName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.title && !title) setTitle(data.title);
        if (data.author && !author) setAuthor(data.author);
        if (data.theme && !theme) setTheme(data.theme);
        if (data.contextPrompt && !contextPrompt) setContextPrompt(data.contextPrompt);
        setSuccessNotice('পান্ডুলিপি থেকে শিরোনাম, লেখক ও ভাবার্থ সফলভাবে চিহ্নিত হয়েছে!');
      }
    } catch (err: any) {
      console.warn('Auto parse warning:', err);
    } finally {
      setIsParsing(false);
    }
  };

  // Process chosen or dropped story file
  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessNotice(null);
    setDirectStoryJson(null);

    const isJson = file.name.endsWith('.json') || file.type === 'application/json';
    const isImage = file.type.startsWith('image/');
    const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf';

    // If user dropped an image, treat it as custom cover art
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImage(reader.result as string);
        setSuccessNotice('কভার আর্ট হিসেবে ছবি যুক্ত করা হয়েছে!');
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      if (isJson) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Check if it's already a complete StoryData object
        if (parsed.title && (parsed.acts || parsed.characters || parsed.philosophicalOpening)) {
          setDirectStoryJson(parsed as StoryData);
          setTitle(parsed.title || '');
          setAuthor(parsed.originalAuthor || parsed.author || '');
          setTheme(parsed.theme || '');
          setUploadedFileInfo({
            name: file.name,
            size: file.size,
            type: 'JSON অডিও চিত্রনাট্য',
            charCount: text.length,
            wordCount: text.trim().split(/\s+/).length,
          });
          setSuccessNotice('সম্পূর্ণ প্রস্তুতকৃত বাংলা অডিও চিত্রনাট্য ফাইল শনাক্ত হয়েছে!');
          return;
        } else {
          // General JSON or text data
          setUploadedText(text);
          setUploadedFileInfo({
            name: file.name,
            size: file.size,
            type: 'JSON ডেটা',
            charCount: text.length,
            wordCount: text.trim().split(/\s+/).length,
          });
          parseDocumentWithAI(text, null, null, file.name);
        }
      } else if (isPdf) {
        const b64 = await fileToBase64(file);
        setFileBase64(b64);
        setFileMimeType('application/pdf');
        setUploadedFileInfo({
          name: file.name,
          size: file.size,
          type: 'PDF পান্ডুলিপি',
        });
        parseDocumentWithAI('', b64, 'application/pdf', file.name);
      } else {
        // Plain text, markdown, or text-based documents
        const text = await file.text();
        setUploadedText(text);
        setUploadedFileInfo({
          name: file.name,
          size: file.size,
          type: file.name.endsWith('.md') ? 'Markdown ফাইল' : 'টেক্সট পান্ডুলিপি',
          charCount: text.length,
          wordCount: text.trim().split(/\s+/).length,
        });

        // Fast client heuristic for title/author detection if present on first lines
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0 && !title) {
          const firstLine = lines[0].replace(/^[#*\-—\s]+/, '').slice(0, 50);
          if (firstLine.length > 2 && firstLine.length < 40) {
            setTitle(firstLine);
          }
        }

        parseDocumentWithAI(text, null, null, file.name);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('ফাইলটি পড়া সম্ভব হয়নি: ' + (err?.message || 'অজ্ঞাত ত্রুটি'));
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Custom cover image upload handler
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Direct import of existing complete StoryData JSON
  const handleDirectLoadStory = () => {
    if (!directStoryJson) return;

    let rawActs = directStoryJson.acts;
    if (!Array.isArray(rawActs) && typeof rawActs === 'object' && rawActs !== null) {
      rawActs = Object.values(rawActs);
    }
    if (!Array.isArray(rawActs) || rawActs.length === 0) {
      rawActs = [
        {
          actNumber: 1,
          actTitle: 'পর্ব ১: সূচনা',
          sfx: '',
          bgm: '',
          narratorTone: 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
          ambientType: 'dawn_mist',
          scenes: [
            {
              id: 'sc-1-1',
              speaker: 'কথক',
              emotion: 'স্বগত ভাষণ',
              text: directStoryJson.philosophicalOpening || 'গল্প শুরু হতে চলেছে...',
              characterKey: 'narrator',
            },
          ],
        },
      ];
    }

    const formattedActs = rawActs.map((act: any, actIdx: number) => {
      let rawScenes = Array.isArray(act?.scenes)
        ? act.scenes
        : Array.isArray(act?.dialogues)
        ? act.dialogues
        : Array.isArray(act?.lines)
        ? act.lines
        : [];
      if (rawScenes.length === 0) {
        rawScenes = [
          {
            id: `sc-${actIdx + 1}-1`,
            speaker: 'কথক',
            emotion: 'স্বগত ভাষণ',
            text: act?.actTitle || 'দৃশ্য বর্ণনা',
            characterKey: 'narrator',
          },
        ];
      }
      return {
        ...act,
        actNumber: act.actNumber || actIdx + 1,
        ambientType: act.ambientType || 'dawn_mist',
        scenes: rawScenes.map((sc: any, scIdx: number) => ({
          ...sc,
          id: sc.id || `sc-${actIdx + 1}-${scIdx + 1}`,
          characterKey: sc.characterKey || (sc.speaker?.includes('কথক') ? 'narrator' : 'other'),
        })),
      };
    });

    const formattedStory: StoryData = {
      ...directStoryJson,
      id: directStoryJson.id || 'imported-' + Date.now(),
      heroImage:
        coverImage ||
        directStoryJson.heroImage ||
        '/src/assets/images/storyteller_studio_1790306569050.jpg',
      acts: formattedActs,
    };

    onStoryGenerated(formattedStory);
    onClose();
  };

  // Clear current uploaded manuscript
  const handleClearUpload = () => {
    setUploadedFileInfo(null);
    setUploadedText('');
    setFileBase64(null);
    setFileMimeType(null);
    setDirectStoryJson(null);
    setSuccessNotice(null);
    if (storyFileInputRef.current) storyFileInputRef.current.value = '';
  };

  // Generate complete Arnab-style audio drama script
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !uploadedText && !fileBase64) {
      setErrorMsg('দয়া করে গল্পের শিরোনাম লিখুন অথবা কোনো পান্ডুলিপি ফাইল আপলোড করুন।');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || uploadedFileInfo?.name?.replace(/\.[^/.]+$/, '') || 'নতুন বাংলা গল্প',
          author: author || 'অজ্ঞাতনামা কথাশিল্পী',
          theme,
          contextPrompt,
          uploadedStoryText: uploadedText || undefined,
          fileBase64: fileBase64 || undefined,
          fileMimeType: fileMimeType || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.story) {
        throw new Error(data.error || 'চিত্রনাট্য তৈরি করা সম্ভব হয়নি');
      }

      const generated = data.story;
      // Convert to StoryData interface format
      const formattedStory: StoryData = {
        id: 'gen-' + Date.now(),
        title: generated.title || title,
        subtitle: 'Bengali Classics by Arnab শৈলীতে একক কথকের অডিও ড্রামা',
        originalAuthor: generated.author || author || 'অজ্ঞাতনামা কথাশিল্পী',
        dramatizationStyle: 'Versatile Audio Storyteller Solo Performance - @BengaliClassicsByArnab Style',
        theme: generated.theme || theme,
        durationEst: '১২ - ১৫ মিনিট',
        heroImage:
          coverImage ||
          (theme?.includes('বৃষ্টি') || contextPrompt?.includes('বৃষ্টি')
            ? '/src/assets/images/misty_pond_dawn_1790306582395.jpg'
            : '/src/assets/images/storyteller_studio_1790306569050.jpg'),
        characters: (generated.characters || []).map((c: any, idx: number) => ({
          name: c.name,
          role: c.name,
          voiceDescription: c.voiceDescription || 'বহুমুখী স্বর',
          characterKey: idx === 0 ? 'narrator' : idx === 1 ? 'nishith' : 'other',
        })),
        acts: (() => {
          let rawActs = generated.acts;
          if (!Array.isArray(rawActs) && typeof rawActs === 'object' && rawActs !== null) {
            rawActs = Object.values(rawActs);
          }
          if (!Array.isArray(rawActs) || rawActs.length === 0) {
            rawActs = [
              {
                actNumber: 1,
                actTitle: 'পর্ব ১: ভূমিকা ও দৃশ্যপট',
                sfx: 'কুয়াশা ও নিস্তব্ধ প্রকৃতির সুর',
                bgm: 'সেতারের ধীর বিষাদময় সুর',
                narratorTone: 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
                scenes: [
                  {
                    speaker: 'কথক',
                    emotion: 'স্বগত ভাষণ',
                    text:
                      generated.philosophicalOpening ||
                      contextPrompt ||
                      'মানুষের জীবনে কিছু স্মৃতি চিরকাল নদীর জলের মতো নিঃশব্দে বয়ে চলে...',
                  },
                ],
              },
            ];
          }

          return rawActs.map((act: any, actIdx: number) => {
            let rawScenes = Array.isArray(act?.scenes)
              ? act.scenes
              : Array.isArray(act?.dialogues)
              ? act.dialogues
              : Array.isArray(act?.lines)
              ? act.lines
              : [];

            if (rawScenes.length === 0) {
              rawScenes = [
                {
                  speaker: 'কথক',
                  emotion: 'স্বগত ভাষণ',
                  text: act?.actTitle || 'দৃশ্য বর্ণনা...',
                },
              ];
            }

            return {
              actNumber: act.actNumber || actIdx + 1,
              actTitle: act.actTitle || `পর্ব ${actIdx + 1}`,
              sfx: act.sfx || '',
              bgm: act.bgm || '',
              narratorTone: act.narratorTone || 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
              ambientType:
                act.actTitle?.includes('বৃষ্টি') || act.sfx?.includes('বৃষ্টি')
                  ? 'monsoon_rain'
                  : act.actTitle?.includes('দরবার') || act.actTitle?.includes('জমিদার')
                  ? 'zamindar_court'
                  : act.actTitle?.includes('কলকাতা') || act.actTitle?.includes('শহর')
                  ? 'calcutta_alley'
                  : 'dawn_mist',
              scenes: rawScenes.map((sc: any, scIdx: number) => ({
                id: `gen-sc-${act.actNumber || actIdx + 1}-${scIdx + 1}`,
                speaker: sc.speaker || 'কথক',
                emotion: sc.emotion || 'স্বগত ভাষণ',
                text: sc.text || sc.dialogue || sc.line || '',
                sfxCue: sc.sfxCue,
                characterKey:
                  sc.speaker?.includes('কথক')
                    ? 'narrator'
                    : sc.speaker?.toLowerCase().includes('nishith')
                    ? 'nishith'
                    : 'other',
              })),
            };
          });
        })(),
        philosophicalOpening:
          generated.acts?.[0]?.scenes?.[0]?.text ||
          'মানুষের জীবনে কিছু স্মৃতি চিরকাল নদীর জলের মতো নিঃশব্দে বয়ে চলে...',
        literaryEpilogue: {
          analysis:
            generated.epilogue?.literaryAnalysis ||
            'গল্পের প্রতিটি উপমা পাঠকের হৃদয়কে ছুঁয়ে যায়...',
          quote: (generated.title || title) + ' — অমর বাংলা ক্লাসিক',
        },
      };

      onStoryGenerated(formattedStory);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'চিত্রনাট্য তৈরি ব্যর্থ হয়েছে');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161210] border border-[#2C241E] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#2C241E] bg-[#14100E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#FDFBF7]">
                  নতুন অডিও চিত্রনাট্য তৈরি ও আপলোড
                </h2>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40 font-medium">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-[#8C8275] mt-0.5">
                নিজের পান্ডুলিপি আপলোড করুন বা প্রম্পট দিয়ে আর্নব স্টাইলে রূপান্তর করুন
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2C241E] bg-[#110E0C] px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-sans font-medium flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-[#D97706] text-[#FDFBF7] font-semibold'
                : 'border-transparent text-[#8C8275] hover:text-[#C2B7A3]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#D97706]" />
            <span>পান্ডুলিপি বা ফাইল আপলোড</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              নতুন ফিচার
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`pb-2.5 px-3 text-xs font-sans font-medium flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'prompt'
                ? 'border-[#D97706] text-[#FDFBF7] font-semibold'
                : 'border-transparent text-[#8C8275] hover:text-[#C2B7A3]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#A89F91]" />
            <span>ধ্রুপদী প্রম্পট ও ক্যাটালগ</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleGenerate} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: UPLOAD FEATURE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => storyFileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? 'border-[#D97706] bg-[#D97706]/10 shadow-lg shadow-[#D97706]/10 scale-[1.01]'
                    : uploadedFileInfo
                    ? 'border-emerald-600/50 bg-emerald-950/20'
                    : 'border-[#3D3025] hover:border-[#D97706]/60 bg-[#120F0D] hover:bg-[#181310]'
                }`}
              >
                <input
                  ref={storyFileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.pdf,.docx,.doc"
                  onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])}
                  className="hidden"
                />

                {isParsing ? (
                  <div className="py-3 flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
                    <p className="font-serif text-sm text-[#FDFBF7]">
                      পান্ডুলিপির নির্যাস ও বিবরণ বিশ্লেষণ করা হচ্ছে...
                    </p>
                    <p className="text-xs text-[#8C8275]">
                      Gemini 3.8 Flash স্বয়ংক্রিয়ভাবে শিরোনাম ও কথকের সূচনা বের করছে
                    </p>
                  </div>
                ) : uploadedFileInfo ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                        {directStoryJson ? (
                          <FileCode className="w-5 h-5" />
                        ) : (
                          <FileCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-[#FDFBF7] text-sm">
                            {uploadedFileInfo.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                            {uploadedFileInfo.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#8C8275] mt-0.5">
                          সাইজ: {(uploadedFileInfo.size / 1024).toFixed(1)} KB
                          {uploadedFileInfo.charCount && ` · ${uploadedFileInfo.charCount} অক্ষর`}
                          {uploadedFileInfo.wordCount && ` · প্রায় ${uploadedFileInfo.wordCount} শব্দ`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => storyFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs rounded border border-[#3D3025] text-[#C2B7A3] hover:text-[#FDFBF7] hover:bg-[#201813]"
                      >
                        অন্য ফাইল
                      </button>
                      <button
                        type="button"
                        onClick={handleClearUpload}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40"
                        title="ফাইল মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#201813] border border-[#3D3025] flex items-center justify-center text-[#D97706] mb-3">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <p className="font-serif text-sm font-semibold text-[#FDFBF7]">
                      পান্ডুলিপি বা গল্প ফাইল এখানে ড্রপ করুন অথবা ব্রাউজ করতে ক্লিক করুন
                    </p>
                    <p className="text-xs text-[#8C8275] mt-1 max-w-md">
                      সমর্থিত ফরম্যাট: <span className="text-[#C2B7A3]">.txt, .md, .pdf, .json, .docx</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#1C1612] border border-[#3D3025] text-[#A89F91]">
                        📝 কাঁচা গল্প টেক্সট
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#1C1612] border border-[#3D3025] text-[#A89F91]">
                        📑 সম্পূর্ণ চিত্রনাট্য (.json)
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#1C1612] border border-[#3D3025] text-[#A89F91]">
                        📄 বইয়ের PDF
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct JSON Ready Banner */}
              {directStoryJson && (
                <div className="p-3.5 rounded-xl border border-emerald-700/60 bg-emerald-950/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-200">
                        প্রস্তুতকৃত অডিও ড্রামা ফাইল: &ldquo;{directStoryJson.title}&rdquo; (
                        {directStoryJson.acts?.length || 0} পর্ব,{' '}
                        {directStoryJson.acts?.reduce((acc, a) => acc + (a.scenes?.length || 0), 0) || 0} দৃশ্য)
                      </p>
                      <p className="text-[11px] text-emerald-300/70">
                        আপনি চাইলে এখনই সরাসরি প্লেয়ারে লোড করতে পারেন অথবা নতুন করে সাজাতে পারেন।
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDirectLoadStory}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-semibold text-xs transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
                  >
                    <span>সরাসরি লোড করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Uploaded Text Preview (if text exists) */}
              {uploadedText && !directStoryJson && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-sans text-[#A89F91] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>আপলোডকৃত পান্ডুলিপির অংশ (পূর্বরূপ):</span>
                    </label>
                    <span className="text-[10px] text-[#7C7265]">
                      Gemini এই লেখার উপর ভিত্তি করে অডিও ড্রামা তৈরি করবে
                    </span>
                  </div>
                  <textarea
                    value={uploadedText}
                    onChange={(e) => setUploadedText(e.target.value)}
                    rows={4}
                    placeholder="পান্ডুলিপির টেক্সট..."
                    className="w-full p-2.5 rounded-lg border border-[#2C241E] bg-[#100D0B] text-xs text-[#E8DEC8] font-serif focus:outline-none focus:border-[#D97706] resize-none"
                  />
                </div>
              )}

              {/* Or Direct Paste Collapsible if no file */}
              {!uploadedFileInfo && !uploadedText && (
                <div className="border border-[#2C241E] rounded-xl p-3 bg-[#120F0D]">
                  <label className="text-xs font-sans text-[#A89F91] mb-1.5 block">
                    অথবা সরাসরি গল্পের টেক্সট বা খসড়া পেস্ট করুন:
                  </label>
                  <textarea
                    value={uploadedText}
                    onChange={(e) => {
                      setUploadedText(e.target.value);
                      if (e.target.value.length > 50 && !uploadedFileInfo) {
                        setUploadedFileInfo({
                          name: 'পেস্টকৃত_গল্প.txt',
                          size: e.target.value.length,
                          type: 'সরাসরি পেস্টকৃত টেক্সট',
                          charCount: e.target.value.length,
                          wordCount: e.target.value.trim().split(/\s+/).length,
                        });
                      }
                    }}
                    rows={3}
                    placeholder="আপনার গল্পের বা উপন্যাসের পুরো অনুচ্ছেদ বা সংলাপগুলো এখানে সরাসরি পেস্ট করতে পারেন..."
                    className="w-full p-2.5 rounded-lg border border-[#2C241E] bg-[#0E0C0A] text-xs text-[#E8DEC8] font-serif focus:outline-none focus:border-[#D97706] resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROMPT & PRESETS */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-sans text-[#A89F91] mb-1.5 block">
                  জনপ্রিয় ধ্রুপদী গল্প থেকে বেছে নিন (Quick Presets):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {presets.map((p) => (
                    <button
                      type="button"
                      key={p.title}
                      onClick={() => handleApplyPreset(p)}
                      className="p-2.5 rounded-xl border border-[#2C241E] bg-[#120F0D] hover:bg-[#1C1713] hover:border-[#D97706]/40 text-left text-xs transition-colors"
                    >
                      <div className="font-serif font-bold text-[#FDFBF7]">{p.title}</div>
                      <div className="text-[11px] text-[#7C7265] truncate mt-0.5">{p.author}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COMMON STORY METADATA FIELDS */}
          <div className="border-t border-[#2C241E] pt-3.5 space-y-3">
            {/* Title and Author */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1">
                  গল্পের শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: হৈমন্তী / মহেশ / মেঘমল্লার"
                  className="w-full px-3 py-2 rounded-lg border border-[#2C241E] bg-[#120F0D] text-sm text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1">
                  মূল লেখক
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="যেমন: রবীন্দ্রনাথ ঠাকুর / শরৎচন্দ্র চট্টোপাধ্যায়"
                  className="w-full px-3 py-2 rounded-lg border border-[#2C241E] bg-[#120F0D] text-sm text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>
            </div>

            {/* Theme & Cover Art Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs font-sans text-[#A89F91] block mb-1">
                  গল্পের মূলসুর / থিম
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="যেমন: প্রেম, আত্মমর্যাদা ও নীরব বিরহ"
                  className="w-full px-3 py-2 rounded-lg border border-[#2C241E] bg-[#120F0D] text-sm text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706]"
                />
              </div>

              {/* Cover Art Upload Trigger */}
              <div>
                <label className="text-xs font-sans text-[#A89F91] block mb-1 flex items-center justify-between">
                  <span>কভার ছবি (ঐচ্ছিক)</span>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => setCoverImage(null)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      মুছুন
                    </button>
                  )}
                </label>
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coverImageInputRef.current?.click()}
                  className={`w-full h-[38px] px-2.5 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-colors overflow-hidden ${
                    coverImage
                      ? 'border-emerald-600/60 bg-emerald-950/30 text-emerald-200'
                      : 'border-[#2C241E] bg-[#120F0D] text-[#A89F91] hover:text-[#FDFBF7] hover:border-[#D97706]/40'
                  }`}
                >
                  {coverImage ? (
                    <>
                      <img
                        src={coverImage}
                        alt="Preview"
                        className="w-5 h-5 rounded object-cover border border-emerald-500/40 shrink-0"
                      />
                      <span className="truncate text-[11px]">ছবি যুক্ত হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5 text-[#D97706]" />
                      <span className="truncate">কভার ছবি আপলোড</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Opening scene simile / metaphor prompt */}
            <div>
              <label className="text-xs font-sans text-[#A89F91] block mb-1">
                সূচনার মনস্তাত্ত্বিক ভাবনা ও প্রাকৃতিক উপমা (Arnab&apos;s Signature Intro):
              </label>
              <textarea
                value={contextPrompt}
                onChange={(e) => setContextPrompt(e.target.value)}
                rows={2}
                placeholder="যেমন: শীতের ভোরের কুয়াশাচ্ছন্ন পুকুর বা জীর্ণ কপাটের নিঃশব্দ আর্তির সাথে মানুষের হৃদয়ের নীরব যন্ত্রণার মেলবন্ধন..."
                className="w-full p-2.5 rounded-lg border border-[#2C241E] bg-[#120F0D] text-xs text-[#FDFBF7] font-serif focus:outline-none focus:border-[#D97706] resize-none"
              />
            </div>
          </div>

          {/* Feedback Alerts */}
          {successNotice && (
            <div className="text-xs text-emerald-300 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/50 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-[#2C241E]">
            <div className="text-[11px] text-[#7C7265] hidden sm:block">
              {uploadedFileInfo ? 'পান্ডুলিপি থেকে অ্যাডাপ্ট করা হবে' : 'Gemini 3.8 Flash দ্বারা পরিচালিত'}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-[#2C241E] text-xs text-[#A89F91] hover:text-[#FDFBF7] hover:bg-[#161210] transition-colors"
              >
                বাতিল
              </button>

              {directStoryJson ? (
                <button
                  type="button"
                  onClick={handleDirectLoadStory}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>সরাসরি প্লেয়ারে শুনুন</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isGenerating || isParsing || (!title && !uploadedText && !fileBase64)}
                  className="px-4 py-2 rounded-lg bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 text-[#120F0D] font-sans font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>চিত্রনাট্য তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {uploadedFileInfo ? 'পান্ডুলিপি থেকে চিত্রনাট্য তৈরি' : 'চিত্রনাট্য তৈরি করুন'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
