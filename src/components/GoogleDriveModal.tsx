import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  FileJson,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Upload,
  HardDrive,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { StoryData } from '../data/stories';
import {
  DriveStoryFile,
  listDriveStories,
  saveStoryJsonToDrive,
  exportStoryTextToDrive,
  loadStoryFromDrive,
  deleteDriveFile,
} from '../utils/driveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStory: StoryData;
  onLoadStory: (story: StoryData) => void;
  currentUser: User | null;
  accessToken: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  isLoggingIn: boolean;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  activeStory,
  onLoadStory,
  currentUser,
  accessToken,
  onSignIn,
  onSignOut,
  isLoggingIn,
}) => {
  const [files, setFiles] = useState<DriveStoryFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<'json' | 'text' | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Destructive Confirmation Dialog State (MANDATORY REQUIREMENT)
  const [fileToDelete, setFileToDelete] = useState<DriveStoryFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch files when modal opens and token is present
  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles();
    }
  }, [isOpen, accessToken]);

  const loadFiles = async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    setNotification(null);
    try {
      const fetched = await listDriveStories(accessToken);
      setFiles(fetched);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'গুগল ড্রাইভ থেকে ফাইল আনতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSaveJson = async () => {
    if (!accessToken) return;
    setIsSaving('json');
    setNotification(null);
    try {
      const saved = await saveStoryJsonToDrive(accessToken, activeStory);
      setNotification({
        type: 'success',
        message: `"${saved.name}" সফলভাবে আপনার গুগল ড্রাইভে সংরক্ষিত হয়েছে!`,
      });
      await loadFiles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'গুগল ড্রাইভে সংরক্ষণ ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleExportText = async () => {
    if (!accessToken) return;
    setIsSaving('text');
    setNotification(null);
    try {
      const saved = await exportStoryTextToDrive(accessToken, activeStory);
      setNotification({
        type: 'success',
        message: `"${saved.name}" সম্পূর্ণ চিত্রনাট্য টেক্সট ফাইল হিসেবে ড্রাইভে জমা হয়েছে!`,
      });
      await loadFiles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'চিত্রনাট্য টেক্সট ড্রাইভে সংরক্ষণ ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleLoadFileIntoApp = async (file: DriveStoryFile) => {
    if (!accessToken) return;
    setLoadingFileId(file.id);
    setNotification(null);
    try {
      const loadedStory = await loadStoryFromDrive(accessToken, file.id);
      onLoadStory(loadedStory);
      setNotification({
        type: 'success',
        message: `"${loadedStory.title}" সফলভাবে অডিও প্লেয়ারে লোড হয়েছে! আপনি এখন এটি শুনতে পারবেন।`,
      });
      // Close modal after brief feedback
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'গল্পটি লোড করতে সমস্যা হয়েছে। নিশ্চিত করুন এটি সঠিক ফরম্যাটের গল্প ফাইল।',
      });
    } finally {
      setLoadingFileId(null);
    }
  };

  // Perform Destructive Deletion AFTER explicit user confirmation in dialog
  const handleConfirmDelete = async () => {
    if (!accessToken || !fileToDelete) return;
    setIsDeleting(true);
    setNotification(null);
    try {
      await deleteDriveFile(accessToken, fileToDelete.id);
      setNotification({
        type: 'success',
        message: `"${fileToDelete.name}" গুগল ড্রাইভ থেকে সফলভাবে মুছে ফেলা হয়েছে।`,
      });
      setFileToDelete(null);
      await loadFiles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'ফাইলটি মুছে ফেলা সম্ভব হয়নি।',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#14100E] border border-[#3E2B20] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#E8DEC8]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2C2018] flex items-center justify-between bg-[#191310]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#FDFBF7] flex items-center gap-2">
                গুগল ড্রাইভ স্টোরি হাব
                <span className="text-xs px-2 py-0.5 rounded font-sans bg-[#2E2018] text-[#D97706] font-normal border border-[#D97706]/30">
                  Google Drive Cloud Storage
                </span>
              </h2>
              <p className="text-xs text-[#A89F91]">
                আপনার গল্প, স্ক্রিপ্ট ও অডিও নাট্যরূপ গুগল ড্রাইভে ক্লাউডে নিরাপদ রাখুন ও যেকোনো সময় লোড করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#FDFBF7] hover:bg-[#251A14] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback notification toast banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 flex items-center gap-2 text-xs font-sans border-b ${
              notification.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/70 border-rose-800 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-xs underline hover:opacity-80"
            >
              বন্ধ করুন
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Auth State Panel */}
          {!currentUser || !accessToken ? (
            <div className="p-6 rounded-xl bg-[#1C1612] border border-[#3E2B20] text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#D97706]/10 border border-[#D97706]/30 flex items-center justify-center text-[#D97706]">
                <Cloud className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-serif font-semibold text-[#FDFBF7]">
                  গুগল ড্রাইভের সাথে যুক্ত হন
                </h3>
                <p className="text-xs text-[#A89F91] leading-relaxed">
                  আপনার গল্পের স্ক্রিপ্ট, চরিত্রের ভয়েস নির্দেশিকা এবং ব্যাকগ্রাউন্ড স্কোর গুগল ড্রাইভে সংরক্ষণ করতে এবং পূর্বে সংরক্ষিত গল্প সরাসরি এই অ্যাপে বাজাতে আপনার গুগল একাউন্টে সাইন-ইন করুন।
                </p>
              </div>

              {/* Official Google Sign-in button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={onSignIn}
                  disabled={isLoggingIn}
                  className="gsi-material-button"
                  title="Sign in with Google"
                >
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isLoggingIn ? 'সংযোগ করা হচ্ছে...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#1C1612] border border-[#3E2B20]">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google Account'}
                    className="w-10 h-10 rounded-full border border-[#D97706]/40"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#D97706]/20 border border-[#D97706]/40 flex items-center justify-center font-bold text-[#D97706]">
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#FDFBF7]">
                      {currentUser.displayName || 'গুগল ব্যবহারকারী'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      ড্রাইভ সংযুক্ত
                    </span>
                  </div>
                  <span className="text-xs text-[#A89F91]">{currentUser.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadFiles}
                  disabled={isLoadingFiles}
                  className="px-3 py-1.5 text-xs rounded bg-[#251D18] hover:bg-[#322620] border border-[#443024] text-[#E8DEC8] flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ করুন</span>
                </button>

                <button
                  onClick={onSignOut}
                  className="px-3 py-1.5 text-xs rounded bg-[#251D18] hover:bg-rose-950/50 hover:text-rose-300 border border-[#443024] text-[#A89F91] flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>সাইন আউট</span>
                </button>
              </div>
            </div>
          )}

          {/* Section: Save Active Story to Google Drive */}
          {accessToken && (
            <div className="p-5 rounded-xl bg-[#181310] border border-[#3E2B20] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#FDFBF7] flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#D97706]" />
                    বর্তমান গল্প ড্রাইভে ব্যাকআপ রাখুন
                  </h3>
                  <p className="text-xs text-[#A89F91]">
                    চলমান গল্প: <strong className="text-[#FDFBF7]">"{activeStory.title}"</strong> ({activeStory.originalAuthor}) - {activeStory.acts.length}টি অধ্যায়
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Save Option 1: Full Storyboard JSON */}
                <button
                  onClick={handleSaveJson}
                  disabled={isSaving !== null}
                  className="p-3.5 rounded-lg bg-[#221A15] hover:bg-[#2A201A] border border-[#D97706]/40 hover:border-[#D97706] text-left transition-all flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded bg-[#D97706]/10 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] shrink-0 group-hover:bg-[#D97706]/20">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-[#FDFBF7]">
                      <span>চিত্রনাট্য ডেটা হিসেবে সেভ করুন (.json)</span>
                      {isSaving === 'json' && <RefreshCw className="w-3 h-3 animate-spin text-[#D97706]" />}
                    </div>
                    <p className="text-[11px] text-[#A89F91] mt-0.5 leading-normal">
                      পরবর্তীতে এই অ্যাপে সরাসরি লোড করে প্রতিটি চরিত্রের কণ্ঠ ও আবহসঙ্গীত সহ শুনতে পারবেন।
                    </p>
                  </div>
                </button>

                {/* Save Option 2: Full Text Script */}
                <button
                  onClick={handleExportText}
                  disabled={isSaving !== null}
                  className="p-3.5 rounded-lg bg-[#221A15] hover:bg-[#2A201A] border border-[#443024] hover:border-[#A89F91]/50 text-left transition-all flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded bg-[#33251D] border border-[#553E30] flex items-center justify-center text-[#C2B7A3] shrink-0 group-hover:bg-[#443226]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-[#FDFBF7]">
                      <span>সাহিত্যিক স্ক্রিপ্ট টেক্সট (.txt)</span>
                      {isSaving === 'text' && <RefreshCw className="w-3 h-3 animate-spin text-[#D97706]" />}
                    </div>
                    <p className="text-[11px] text-[#A89F91] mt-0.5 leading-normal">
                      দার্শনিক ভূমিকা, সংলাপ, আবেগ ও আবহধ্বনির নির্দেশিকা সহ পড়ার জন্য সম্পূর্ণ টেক্সট ফাইল।
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Section: Saved Stories Library in Drive */}
          {accessToken && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-serif font-bold text-[#FDFBF7] flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#D97706]" />
                  গুগল ড্রাইভ স্টোরি লাইব্রেরি
                  <span className="text-xs font-mono font-normal text-[#A89F91]">({files.length}টি ফাইল)</span>
                </h3>
                <span className="text-[11px] text-[#8C8275]">
                  ফোল্ডার: "Bengali Classics - Stories"
                </span>
              </div>

              {isLoadingFiles ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#D97706] mx-auto" />
                  <p className="text-xs text-[#A89F91]">গুগল ড্রাইভ থেকে ফাইল খোঁজা হচ্ছে...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#181310] border border-dashed border-[#3E2B20] space-y-2">
                  <HardDrive className="w-8 h-8 text-[#5A4538] mx-auto" />
                  <p className="text-xs text-[#A89F91]">আপনার গুগল ড্রাইভে এখনও কোনো বাংলা গল্প সংরক্ষিত নেই।</p>
                  <p className="text-[11px] text-[#8C8275]">
                    উপরের "চিত্রনাট্য ডেটা হিসেবে সেভ করুন" বাটনে ক্লিক করে বর্তমান গল্পটি ড্রাইভে জমা রাখুন।
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#2C2018] rounded-xl bg-[#181310] border border-[#3E2B20] overflow-hidden">
                  {files.map((file) => {
                    const isJson = file.name.endsWith('.json') || file.mimeType === 'application/json';
                    const isTxt = file.name.endsWith('.txt') || file.mimeType === 'text/plain';
                    const formattedDate = new Date(file.modifiedTime).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={file.id}
                        className="p-3.5 hover:bg-[#201814] transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                              isJson
                                ? 'bg-[#D97706]/15 border-[#D97706]/30 text-[#D97706]'
                                : 'bg-[#2A201A] border-[#443024] text-[#A89F91]'
                            }`}
                          >
                            {isJson ? <FileJson className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-serif font-bold text-[#FDFBF7] truncate">
                              {file.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-[#8C8275] mt-0.5 font-sans">
                              <span>আপডেট: {formattedDate}</span>
                              {file.size && <span>• {Math.round(parseInt(file.size) / 1024)} KB</span>}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isJson && (
                            <button
                              onClick={() => handleLoadFileIntoApp(file)}
                              disabled={loadingFileId === file.id}
                              className="px-2.5 py-1 text-xs rounded bg-[#D97706]/15 hover:bg-[#D97706] hover:text-[#120F0D] border border-[#D97706]/40 text-[#D97706] transition-all flex items-center gap-1 font-medium"
                              title="এই গল্পটি প্লেয়ারে লোড করুন"
                            >
                              {loadingFileId === file.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              <span>প্লেয়ারে চালান</span>
                            </button>
                          )}

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-[#2C2018] text-[#A89F91] hover:text-[#FDFBF7] transition-colors"
                              title="গুগল ড্রাইভে দেখুন"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete button triggers explicit confirmation modal */}
                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded hover:bg-rose-950/60 text-[#A89F91] hover:text-rose-300 transition-colors"
                            title="গুগল ড্রাইভ থেকে মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2C2018] bg-[#191310] flex items-center justify-between text-xs text-[#8C8275]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            Google Workspace OAuth API দিয়ে সরাসরি এনক্রিপ্টেড সংযোগ
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#2A201A] hover:bg-[#382B22] text-[#E8DEC8] transition-colors font-medium"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE OPERATIONS */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181210] border border-rose-900/60 rounded-xl shadow-2xl p-6 text-[#E8DEC8] space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#FDFBF7]">
                  গুগল ড্রাইভ থেকে ফাইল মুছে ফেলতে চান?
                </h3>
                <span className="text-xs text-rose-300/80 font-sans">
                  স্থায়ীভাবে অপসারণ সতর্কতা (Permanent Deletion)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#221713] border border-[#3A241B] space-y-1 text-xs">
              <p className="text-[#A89F91]">
                ফাইলটির নাম: <strong className="text-[#FDFBF7] break-all">{fileToDelete.name}</strong>
              </p>
              <p className="text-[11px] text-[#8C8275]">
                আইডি: <code className="font-mono">{fileToDelete.id}</code>
              </p>
            </div>

            <p className="text-xs text-[#C2B7A3] leading-relaxed">
              এই ফাইলটি আপনার গুগল ড্রাইভ থেকে স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি বাতিল বা পূর্বাবস্থায় ফিরিয়ে আনা যাবে না। আপনি কি নিশ্চিত?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs rounded-lg border border-[#443024] bg-[#221A15] hover:bg-[#2C211B] text-[#E8DEC8] font-medium transition-colors"
              >
                বাতিল করুন
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors flex items-center gap-1.5 shadow-md"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>মুছে ফেলা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, মুছে ফেলুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
