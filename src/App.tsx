import React, { useState, useEffect, useRef } from 'react';
import { TopNav } from './components/TopNav';
import { StoryHero } from './components/StoryHero';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AtmosphereBoard } from './components/AtmosphereBoard';
import { TeleprompterView } from './components/TeleprompterView';
import { VoiceStudioModal } from './components/VoiceStudioModal';
import { LiteraryAnalysisModal } from './components/LiteraryAnalysisModal';
import { StoryGeneratorModal } from './components/StoryGeneratorModal';
import { SceneEditModal, EditTarget } from './components/SceneEditModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { STORIES, StoryData, StoryScene, StoryAct } from './data/stories';
import { storyAudio, AmbientMood, SFXType } from './utils/audioEngine';
import { initAuth, googleSignIn, logout } from './utils/googleAuth';
import { User } from 'firebase/auth';
import { Play, Pause, SkipForward, SkipBack, Volume2, Sparkles, BookOpen, Upload } from 'lucide-react';

export default function App() {
  const [storiesList, setStoriesList] = useState<StoryData[]>(STORIES);
  const [activeStoryId, setActiveStoryId] = useState<string>('nabanita');
  const activeStory = storiesList.find((s) => s.id === activeStoryId) || storiesList[0];

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentActIndex, setCurrentActIndex] = useState<number>(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<'standard' | 'large'>('standard');
  const [vintageWarmth, setVintageWarmth] = useState<boolean>(true);
  const [currentAmbient, setCurrentAmbient] = useState<AmbientMood>('dawn_mist');

  // Voice Engine State
  const [speechEngineMode, setSpeechEngineMode] = useState<'gemini_neural' | 'browser_native'>('gemini_neural');
  const [geminiVoicePersona, setGeminiVoicePersona] = useState<'Fenrir' | 'Kore' | 'Puck' | 'Charon' | 'Zephyr'>('Fenrir');
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [rateLimitCooldownSec, setRateLimitCooldownSec] = useState<number>(0);

  // Google Drive & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Modals state
  const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState<boolean>(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);

  // Edit / Regenerate Modal state
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const currentAct = activeStory.acts[currentActIndex] || activeStory.acts[0];
  const currentScene = currentAct.scenes[currentSceneIndex] || currentAct.scenes[0];

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  // Listen to Audio Engine Rate Limit status
  useEffect(() => {
    const unsub = storyAudio.onRateLimitStatus((limited, remainingSec) => {
      setIsRateLimited(limited);
      setRateLimitCooldownSec(remainingSec);
    });
    return unsub;
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (!isRateLimited || rateLimitCooldownSec <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCooldownSec((prev) => {
        if (prev <= 1) {
          setIsRateLimited(false);
          storyAudio.isRateLimited = false;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRateLimited, rateLimitCooldownSec]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        // Auth state changed to signed out
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
  };

  const handleLoadStoryFromDrive = (newStory: StoryData) => {
    setStoriesList((prev) => {
      const idx = prev.findIndex((s) => s.id === newStory.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newStory;
        return copy;
      }
      return [newStory, ...prev];
    });
    setActiveStoryId(newStory.id);
    setCurrentActIndex(0);
    setCurrentSceneIndex(0);
    setIsPlaying(false);
    storyAudio.stopSpeech();
  };

  // Sync ambient sound when act changes
  useEffect(() => {
    if (isPlaying && currentAct?.ambientType) {
      setCurrentAmbient(currentAct.ambientType);
      storyAudio.setAmbient(currentAct.ambientType);
    }
  }, [currentActIndex, isPlaying]);

  // When currentSceneIndex or currentActIndex changes and isPlaying is true, speak the line
  useEffect(() => {
    if (!isPlaying) {
      storyAudio.stopSpeech();
      return;
    }

    if (!currentScene) return;

    // Check if scene has an instant SFX cue to trigger
    if (currentScene.sfxCue) {
      if (currentScene.sfxCue.includes('কাক') || currentScene.sfxCue.includes('পাখি')) {
        storyAudio.playSFX('bird_chirp');
      } else if (currentScene.sfxCue.includes('বৃষ্টি') || currentScene.sfxCue.includes('চমক')) {
        storyAudio.playSFX('thunder');
      } else if (currentScene.sfxCue.includes('দরজা') || currentScene.sfxCue.includes('কবাট')) {
        storyAudio.playSFX('door_bang');
      } else if (currentScene.sfxCue.includes('ছেঁড়ার') || currentScene.sfxCue.includes('কাগজ')) {
        storyAudio.playSFX('paper_tear');
      } else if (currentScene.sfxCue.includes('বাঁশি') || currentScene.sfxCue.includes('সুর')) {
        storyAudio.playSFX('flute_chord');
      }
    }

    storyAudio.speakScene(
      currentScene.text,
      currentScene.characterKey,
      playbackSpeed,
      {
        onEnd: () => {
          if (!isPlayingRef.current) return;
          // Pause briefly for dramatic breathing room, then advance
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            advanceNextScene();
          }, 1200);
        },
        onError: () => {
          // If synthesis error, still continue after timeout
          setTimeout(() => {
            if (isPlayingRef.current) {
              advanceNextScene();
            }
          }, 3000);
        },
      },
      {
        emotion: currentScene.emotion,
        speaker: currentScene.speaker,
      }
    );

    // Preload next line into cache so transition is seamless and instant
    const act = activeStory.acts[currentActIndex];
    let nextScene = null;
    if (currentSceneIndex + 1 < act.scenes.length) {
      nextScene = act.scenes[currentSceneIndex + 1];
    } else if (currentActIndex + 1 < activeStory.acts.length) {
      nextScene = activeStory.acts[currentActIndex + 1].scenes[0];
    }
    if (nextScene) {
      storyAudio.preloadLine(nextScene.text, nextScene.characterKey, {
        emotion: nextScene.emotion,
        speaker: nextScene.speaker,
      });
    }
  }, [currentActIndex, currentSceneIndex, isPlaying, playbackSpeed, speechEngineMode, geminiVoicePersona]);

  const advanceNextScene = () => {
    const act = activeStory.acts[currentActIndex];
    if (currentSceneIndex + 1 < act.scenes.length) {
      setCurrentSceneIndex((prev) => prev + 1);
    } else if (currentActIndex + 1 < activeStory.acts.length) {
      setCurrentActIndex((prev) => prev + 1);
      setCurrentSceneIndex(0);
    } else {
      // Completed full story!
      setIsPlaying(false);
      storyAudio.stopSpeech();
      storyAudio.stopAmbient();
      setCurrentAmbient('none');
    }
  };

  const advancePrevScene = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
    } else if (currentActIndex > 0) {
      const prevActIdx = currentActIndex - 1;
      setCurrentActIndex(prevActIdx);
      setCurrentSceneIndex(activeStory.acts[prevActIdx].scenes.length - 1);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      storyAudio.pauseSpeech();
    } else {
      setIsPlaying(true);
      if (currentAct?.ambientType) {
        setCurrentAmbient(currentAct.ambientType);
        storyAudio.setAmbient(currentAct.ambientType);
      }
      storyAudio.resumeSpeech();
    }
  };

  const handleRestart = () => {
    storyAudio.stopSpeech();
    setCurrentActIndex(0);
    setCurrentSceneIndex(0);
    setIsPlaying(true);
    if (activeStory.acts[0]?.ambientType) {
      setCurrentAmbient(activeStory.acts[0].ambientType);
      storyAudio.setAmbient(activeStory.acts[0].ambientType);
    }
  };

  const handleSelectScene = (actIdx: number, scene: StoryScene) => {
    setCurrentActIndex(actIdx);
    const sceneIdx = activeStory.acts[actIdx].scenes.findIndex((s) => s.id === scene.id);
    if (sceneIdx !== -1) {
      setCurrentSceneIndex(sceneIdx);
    }
    setIsPlaying(true);
    const targetAmbient = activeStory.acts[actIdx].ambientType;
    if (targetAmbient) {
      setCurrentAmbient(targetAmbient);
      storyAudio.setAmbient(targetAmbient);
    }
  };

  const handleSelectAmbient = (mood: AmbientMood) => {
    setCurrentAmbient(mood);
    storyAudio.setAmbient(mood);
  };

  const handleTriggerSFX = (type: SFXType) => {
    storyAudio.playSFX(type);
  };

  const handleToggleVintageWarmth = (val: boolean) => {
    setVintageWarmth(val);
    storyAudio.toggleVintageWarmth(val);
  };

  const handleStoryGenerated = (newStory: StoryData) => {
    setStoriesList((prev) => [newStory, ...prev]);
    setActiveStoryId(newStory.id);
    setCurrentActIndex(0);
    setCurrentSceneIndex(0);
    setIsPlaying(false);
    storyAudio.stopSpeech();
  };

  // Handlers for Editing and Regenerating Individual Story Parts
  const handleOpenEditScene = (actIndex: number, scene: StoryScene) => {
    setEditTarget({ type: 'scene', actIndex, scene });
    setIsEditModalOpen(true);
  };

  const handleOpenEditAct = (actIndex: number, act: StoryAct) => {
    setEditTarget({ type: 'act', actIndex, act });
    setIsEditModalOpen(true);
  };

  const handleOpenEditIntro = () => {
    setEditTarget({ type: 'intro', text: activeStory.philosophicalOpening });
    setIsEditModalOpen(true);
  };

  const handleSaveScene = (actIndex: number, sceneId: string, updated: Partial<StoryScene>) => {
    setStoriesList((prevList) =>
      prevList.map((story) => {
        if (story.id !== activeStory.id) return story;
        const newActs = story.acts.map((act, idx) => {
          if (idx !== actIndex) return act;
          const newScenes = act.scenes.map((sc) => {
            if (sc.id !== sceneId) return sc;
            return { ...sc, ...updated };
          });
          return { ...act, scenes: newScenes };
        });
        return { ...story, acts: newActs };
      })
    );
  };

  const handleSaveAct = (actIndex: number, updated: Partial<StoryAct>) => {
    setStoriesList((prevList) =>
      prevList.map((story) => {
        if (story.id !== activeStory.id) return story;
        const newActs = story.acts.map((act, idx) => {
          if (idx !== actIndex) return act;
          return { ...act, ...updated };
        });
        return { ...story, acts: newActs };
      })
    );
  };

  const handleSaveIntro = (newIntro: string) => {
    setStoriesList((prevList) =>
      prevList.map((story) => {
        if (story.id !== activeStory.id) return story;
        return { ...story, philosophicalOpening: newIntro };
      })
    );
  };

  // Calculate overall story completion percentage
  const totalScenes = activeStory.acts.reduce((acc, act) => acc + act.scenes.length, 0);
  const currentSceneCount =
    activeStory.acts.slice(0, currentActIndex).reduce((acc, act) => acc + act.scenes.length, 0) +
    currentSceneIndex +
    1;
  const progressPercent = Math.min(100, Math.round((currentSceneCount / totalScenes) * 100));

  return (
    <div className="min-h-screen bg-[#100D0B] text-[#E8DEC8] flex flex-col font-sans pb-24 selection:bg-[#B45309]/30">
      {/* Top Bar Contract (3 zones) */}
      <TopNav
        onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onOpenDrive={() => setIsDriveModalOpen(true)}
        activeStoryTitle={activeStory.title}
        speechEngineMode={speechEngineMode}
        geminiVoicePersona={geminiVoicePersona}
        currentUser={currentUser}
        hasDriveToken={!!accessToken}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Story Selector segmented bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2C241E] pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-sans text-[#8C8275] whitespace-nowrap">
              গল্প সংকলন:
            </span>
            {storiesList.map((s) => {
              const isActive = s.id === activeStoryId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.id !== activeStoryId) {
                      storyAudio.stopSpeech();
                      setActiveStoryId(s.id);
                      setCurrentActIndex(0);
                      setCurrentSceneIndex(0);
                      setIsPlaying(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-serif transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D97706] text-[#120F0D] font-bold shadow-sm'
                      : 'text-[#C2B7A3] hover:text-[#FDFBF7] bg-[#161210] border border-[#2C241E]'
                  }`}
                >
                  {s.title} ({s.originalAuthor})
                </button>
              );
            })}
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="px-2.5 py-1.5 rounded text-xs font-sans transition-colors whitespace-nowrap text-[#D97706] hover:text-[#F59E0B] bg-[#161210] hover:bg-[#201813] border border-dashed border-[#D97706]/50 flex items-center gap-1.5"
              title="নতুন গল্প বা পান্ডুলিপি আপলোড করুন"
            >
              <Upload className="w-3 h-3" />
              <span>+ আপলোড / নতুন গল্প</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <AudioVisualizer
              isPlaying={isPlaying}
              speaker={currentScene?.speaker || 'কথক'}
              characterKey={currentScene?.characterKey || 'narrator'}
            />
          </div>
        </div>

        {/* Hero Banner Presentation */}
        <StoryHero
          story={activeStory}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onRestart={handleRestart}
          currentActIndex={currentActIndex}
          onEditIntro={handleOpenEditIntro}
          onOpenDrive={() => setIsDriveModalOpen(true)}
          speechEngineMode={speechEngineMode}
          onChangeSpeechEngineMode={(mode) => {
            setSpeechEngineMode(mode);
            storyAudio.speechEngineMode = mode;
          }}
          isRateLimited={isRateLimited}
          rateLimitCooldownSec={rateLimitCooldownSec}
          onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
        />

        {/* 2-Column Responsive Layout: Left = Atmosphere Board, Right = Script Teleprompter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (4 cols): Atmosphere & Voice Details */}
          <div className="lg:col-span-4 space-y-6">
            <AtmosphereBoard
              currentAmbient={currentAmbient}
              onSelectAmbient={handleSelectAmbient}
              onTriggerSFX={handleTriggerSFX}
              vintageWarmth={vintageWarmth}
              onToggleVintageWarmth={handleToggleVintageWarmth}
            />

            {/* Characters & Voice Cast Overview */}
            <div className="border border-[#2C241E] bg-[#161210] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2C241E]">
                <h3 className="font-serif text-sm font-semibold text-[#FDFBF7]">
                  চরিত্র ও স্বর রূপায়ণ (Solo Voice Personas)
                </h3>
                <button
                  onClick={() => setIsVoiceStudioOpen(true)}
                  className="text-xs text-[#D97706] hover:underline"
                >
                  পরীক্ষা করুন
                </button>
              </div>

              <div className="space-y-2.5">
                {activeStory.characters.map((char) => (
                  <div
                    key={char.name}
                    className="p-2.5 rounded bg-[#120F0D] border border-[#241C16] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-[#FDFBF7]">
                        {char.name}
                      </span>
                      <span className="text-[11px] text-[#A89F91]">
                        {char.role}
                      </span>
                    </div>
                    <p className="text-[#8C8275] leading-relaxed">
                      {char.voiceDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chapter Rail */}
            <div className="border border-[#2C241E] bg-[#161210] rounded-xl p-4 sm:p-5 space-y-2">
              <h3 className="font-serif text-sm font-semibold text-[#FDFBF7] mb-2">
                অধ্যায় সূচি (Act Index)
              </h3>
              <div className="space-y-1.5">
                {activeStory.acts.map((act, idx) => {
                  const isActive = idx === currentActIndex;
                  return (
                    <button
                      key={act.actNumber}
                      onClick={() => {
                        setCurrentActIndex(idx);
                        setCurrentSceneIndex(0);
                        setIsPlaying(true);
                      }}
                      className={`w-full p-2 rounded text-left text-xs transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-[#261A13] text-[#D97706] border border-[#D97706]/40 font-semibold'
                          : 'text-[#A89F91] hover:bg-[#1A1411] hover:text-[#FDFBF7]'
                      }`}
                    >
                      <span className="truncate max-w-[200px]">{act.actTitle}</span>
                      <span className="text-[10px] text-[#6A6054]">
                        {act.scenes.length} বাক্য
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (8 cols): Interactive Teleprompter Reader */}
          <div className="lg:col-span-8">
            <TeleprompterView
              acts={activeStory.acts}
              currentActIndex={currentActIndex}
              currentSceneId={currentScene?.id || ''}
              isPlaying={isPlaying}
              onSelectScene={handleSelectScene}
              playbackSpeed={playbackSpeed}
              onChangeSpeed={setPlaybackSpeed}
              fontSize={fontSize}
              onToggleFontSize={() =>
                setFontSize((prev) => (prev === 'standard' ? 'large' : 'standard'))
              }
              onEditScene={handleOpenEditScene}
              onEditAct={handleOpenEditAct}
            />
          </div>
        </div>
      </main>

      {/* Floating Bottom Sticky Audio Controller Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2C241E] bg-[#120F0D]/95 backdrop-blur-lg px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Progress bar line */}
          <div className="w-full absolute -top-1 left-0 right-0 h-1 bg-[#2C241E]">
            <div
              className="h-full bg-[#D97706] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Left: Current Speaker and Quote snippet */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-lg bg-[#2A1D16] border border-[#D97706]/40 flex items-center justify-center text-[#D97706] shrink-0 font-serif font-bold text-sm">
              {currentScene?.speaker?.[0] || 'ক'}
            </div>
            <div className="truncate max-w-xs sm:max-w-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif font-bold text-[#FDFBF7]">
                  {currentScene?.speaker || 'কথক'}
                </span>
                <span className="text-[11px] text-[#8C8275] truncate">
                  ({currentScene?.emotion || 'স্বগত ভাষণ'})
                </span>
              </div>
              <p className="text-xs text-[#C2B7A3] truncate font-serif">
                {currentScene?.text || ''}
              </p>
            </div>
          </div>

          {/* Center: Play / Step Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={advancePrevScene}
              className="p-2 rounded-lg text-[#A89F91] hover:text-[#FDFBF7] hover:bg-[#1C1613] transition-colors"
              title="পূর্ববর্তী বাক্য"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-full bg-[#D97706] hover:bg-[#F59E0B] text-[#120F0D] flex items-center justify-center transition-all shadow-md"
              title={isPlaying ? 'বিরতি (Pause)' : 'চালান (Play)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={advanceNextScene}
              className="p-2 rounded-lg text-[#A89F91] hover:text-[#FDFBF7] hover:bg-[#1C1613] transition-colors"
              title="পরবর্তী বাক্য"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Overall Progress Metric & Quick Triggers */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-[#8C8275]">
            <span className="font-mono tabular-nums">
              {currentSceneCount} / {totalScenes} ({progressPercent}%)
            </span>
            <button
              onClick={() => setIsAnalysisOpen(true)}
              className="px-2.5 py-1 rounded border border-[#2C241E] bg-[#161210] hover:bg-[#201A16] text-[#C2B7A3] transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
              <span>বিশ্লেষণ</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <VoiceStudioModal
        isOpen={isVoiceStudioOpen}
        onClose={() => setIsVoiceStudioOpen(false)}
        speechEngineMode={speechEngineMode}
        onChangeEngineMode={setSpeechEngineMode}
        geminiVoicePersona={geminiVoicePersona}
        onChangeVoicePersona={setGeminiVoicePersona}
      />

      <LiteraryAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        story={activeStory}
      />

      <StoryGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onStoryGenerated={handleStoryGenerated}
      />

      <SceneEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        target={editTarget}
        storyTitle={activeStory.title}
        author={activeStory.originalAuthor}
        onSaveScene={handleSaveScene}
        onSaveAct={handleSaveAct}
        onSaveIntro={handleSaveIntro}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        activeStory={activeStory}
        onLoadStory={handleLoadStoryFromDrive}
        currentUser={currentUser}
        accessToken={accessToken}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        isLoggingIn={isLoggingIn}
      />
    </div>
  );
}
