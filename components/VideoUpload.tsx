
import React, { useCallback, useState } from 'react';
import { UploadIcon, Bars3BottomLeftIcon, PlayIcon, SparklesIcon, EmojiHappyIcon, DocumentTextIcon, ChatBubbleBottomCenterTextIcon, LinkIcon, DocumentArrowUpIcon, VideoIcon, ScissorsIcon } from './icons';
import { StylePreset, AppMode } from '../types';

interface VideoUploadProps {
  onUpload: (file: File, targetLanguage: string, stylePreset: StylePreset, mode: AppMode) => void;
  onUrlSubmit: (url: string, targetLanguage: string, stylePreset: StylePreset, mode: AppMode) => void;
  error?: string | null;
}

const languageOptions = [
  { value: 'original', label: 'Original Language' },
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Mandarin Chinese', label: 'Mandarin Chinese' },
  { value: 'Hindi', label: 'Hindi' },
];

const presetOptions = [
    { id: StylePreset.STANDARD, icon: Bars3BottomLeftIcon, title: 'Standard', description: 'Classic subtitles with word-level timing.' },
    { id: StylePreset.TIKTOK, icon: PlayIcon, title: 'TikTok Style', description: 'Short, punchy lines for social media.' },
    { id: StylePreset.KEYWORDS, icon: SparklesIcon, title: 'Keyword Highlight', description: 'AI automatically bolds important words.' },
    { id: StylePreset.EMOJIS, icon: EmojiHappyIcon, title: 'Emoji Injection', description: 'AI adds relevant emojis to each line.' },
    { id: StylePreset.MINIMALIST, icon: DocumentTextIcon, title: 'Minimalist', description: 'Clean, simple text with no effects.' },
    { id: StylePreset.BOLD_OUTLINE, icon: ChatBubbleBottomCenterTextIcon, title: 'Bold Outline', description: 'Large, outlined text for high visibility.' },
    { id: StylePreset.POP_3D, icon: SparklesIcon, title: '3D Pop', description: 'Text with a sharp shadow for a 3D effect.' },
];

const VideoUpload: React.FC<VideoUploadProps> = ({ onUpload, onUrlSubmit, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('original');
  const [stylePreset, setStylePreset] = useState<StylePreset>(StylePreset.STANDARD);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [appMode, setAppMode] = useState<AppMode>('subtitles');
  const [videoUrl, setVideoUrl] = useState('');
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);


  const handleFileSelect = (file: File | null | undefined) => {
    if (file) {
      onUpload(file, targetLanguage, stylePreset, appMode);
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0]);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
       handleFileSelect(file);
    } else {
        alert("Please drop a valid video or audio file.");
    }
  }, [onUpload, targetLanguage, stylePreset, appMode]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
    if (urlValidationError) {
      setUrlValidationError(null);
    }
  };

  const handleUrlGenerate = () => {
    const urlToTest = videoUrl.trim();
    if (!urlToTest) {
      setUrlValidationError('Empty URL|Please paste a link to a video.');
      return;
    }

    const fullUrl = /^(https?:\/\/)/.test(urlToTest) ? urlToTest : `https://${urlToTest}`;

    try {
      const url = new URL(fullUrl);
      if (!url.hostname.includes('.')) {
        throw new Error('Invalid hostname');
      }
      
      const unsupportedDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com'];
      if (unsupportedDomains.some(domain => url.hostname.includes(domain))) {
        setUrlValidationError('Unsupported Link|Links from streaming sites are not supported due to browser security. Please download your video first, then switch to the "Upload File" tab to process it.');
        return;
      }

      setUrlValidationError(null);
      onUrlSubmit(videoUrl, targetLanguage, stylePreset, appMode);
    } catch (e) {
      setUrlValidationError('Invalid URL|Please enter a complete and valid link to a video file.');
    }
  };
  
  const displayError = urlValidationError || error;
  const [errorTitle, errorMessage] = displayError ? displayError.split('|') : [null, null];

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
        {/* Mode Switcher */}
        <div className="flex justify-center mb-8">
             <div className="bg-gray-900 p-1 rounded-xl inline-flex border border-gray-800">
                 <button 
                    onClick={() => setAppMode('subtitles')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${appMode === 'subtitles' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                     <VideoIcon className="w-5 h-5" />
                     AI Subtitle Generator
                 </button>
                 <button 
                    onClick={() => setAppMode('highlights')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${appMode === 'highlights' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                     <ScissorsIcon className="w-5 h-5" />
                     AI Viral Clips
                 </button>
             </div>
        </div>

        <div className="ui-panel p-6 sm:p-8 relative overflow-hidden">
            {/* Background Accent */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-opacity duration-500 ${appMode === 'highlights' ? 'opacity-0' : 'opacity-100'}`}></div>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-500 transition-opacity duration-500 ${appMode === 'highlights' ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                    {appMode === 'subtitles' ? 'Generate Professional Subtitles' : 'Create Viral Highlights with AI'}
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    {appMode === 'subtitles' 
                        ? 'Upload a video or paste a link. The AI will transcribe, translate, and style your captions perfectly in seconds.' 
                        : 'Let the AI watch your long video and automatically extract the most engaging moments to share on TikTok, Reels, or Shorts.'}
                </p>
            </div>
            
             <div className="flex justify-center items-center gap-2 my-6">
                <button onClick={() => setUploadMethod('file')} className={`control-button flex items-center gap-2 ${uploadMethod === 'file' ? 'active' : ''}`}>
                    <DocumentArrowUpIcon className="w-5 h-5" /> Upload File
                </button>
                <button onClick={() => setUploadMethod('link')} className={`control-button flex items-center gap-2 ${uploadMethod === 'link' ? 'active' : ''}`}>
                    <LinkIcon className="w-5 h-5" /> Paste Link
                </button>
            </div>

            {displayError && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg relative mb-6 backdrop-blur-sm" role="alert">
                    <div className="flex items-center gap-2">
                        <span className="bg-red-500/20 p-1 rounded text-red-400">!</span>
                        <div>
                            <strong className="font-bold block text-sm">{errorTitle || 'Error'}</strong>
                            <span className="block sm:inline text-sm opacity-90">{errorMessage || 'An unknown error occurred.'}</span>
                        </div>
                    </div>
                </div>
            )}
            
            {uploadMethod === 'file' && (
              <>
                <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    className={`relative block w-full border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${isDragging ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'}`}
                >
                    <input type="file" id="file-upload" className="sr-only" onChange={handleFileChange} accept="video/*,audio/*" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-400'}`}>
                            <UploadIcon className="h-8 w-8" />
                        </div>
                        <span className="mt-4 block text-lg font-semibold text-gray-200">
                            Drop your {appMode === 'subtitles' ? 'video' : 'long video'} here
                        </span>
                        <span className="mt-2 block text-sm text-gray-400">or <span className="text-indigo-400 hover:underline">click to browse</span></span>
                        <p className="mt-4 block text-xs text-gray-500 uppercase tracking-wide font-medium">Supports MP4, MOV, WEBM, MP3 (Max 1GB)</p>
                    </label>
                </div>
              </>
            )}

            {uploadMethod === 'link' && (
              <div className="space-y-4 bg-gray-800/30 p-6 rounded-xl border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={handleUrlChange}
                      placeholder="Paste a direct link to a video file..."
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner"
                    />
                    <button onClick={handleUrlGenerate} className="action-button !w-auto btn-primary whitespace-nowrap px-8 shadow-lg shadow-indigo-500/20">
                      {appMode === 'subtitles' ? 'Generate' : 'Analyze'}
                    </button>
                  </div>
                  <p className="text-center text-sm text-gray-500">Provide a direct link to a video file (.mp4, .webm). For YouTube, please download first.</p>
              </div>
            )}
            
            {/* Settings Section - Only show relevant settings based on mode */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-800">
                {appMode === 'subtitles' ? (
                    <>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                                Language
                            </h3>
                            <p className="text-sm text-gray-400 mb-3">Translate subtitles or keep original.</p>
                            <select 
                                value={targetLanguage} 
                                onChange={e => setTargetLanguage(e.target.value)}
                                className="font-select bg-gray-900"
                            >
                                {languageOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                                Style Preset
                            </h3>
                             <p className="text-sm text-gray-400 mb-3">Choose how the AI formats text.</p>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                              {presetOptions.map(preset => (
                                  <button 
                                      key={preset.id} 
                                      onClick={() => setStylePreset(preset.id)}
                                      className={`text-left p-3 rounded-lg border transition-all duration-200 relative overflow-hidden group ${stylePreset === preset.id ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'}`}
                                  >
                                      <div className="flex items-center relative z-10">
                                          <preset.icon className={`w-5 h-5 mr-2 flex-shrink-0 transition-colors ${stylePreset === preset.id ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                          <div>
                                            <span className={`block font-semibold text-sm ${stylePreset === preset.id ? 'text-white' : 'text-gray-300'}`}>{preset.title}</span>
                                            {stylePreset === preset.id && <span className="text-[10px] text-indigo-300 block leading-tight mt-0.5 opacity-80">{preset.description}</span>}
                                          </div>
                                      </div>
                                  </button>
                              ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="col-span-2 bg-teal-900/10 border border-teal-500/20 rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-teal-500/20 p-3 rounded-lg text-teal-400">
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">AI Director Mode Active</h3>
                                <p className="text-gray-300 text-sm mb-4">
                                    Gemini will watch your entire video and identify the top 3-5 most engaging segments. 
                                    It provides titles, descriptions, and perfect cut points for your social media content.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 rounded-full bg-gray-800 text-xs text-gray-400 border border-gray-700">Contextual Analysis</span>
                                    <span className="px-3 py-1 rounded-full bg-gray-800 text-xs text-gray-400 border border-gray-700">Viral Moment Detection</span>
                                    <span className="px-3 py-1 rounded-full bg-gray-800 text-xs text-gray-400 border border-gray-700">Auto-Titling</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
        `}</style>
    </div>
  );
};

export default VideoUpload;
