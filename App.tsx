
import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { AppState, StyleOptions, Subtitle, Font, Position, Animation, EffectType, TextCase, StylePreset, AppMode, HighlightClip } from './types';
import VideoUpload from './components/VideoUpload';
import Loader from './components/Loader';
import { generateSubtitles, generateHighlights } from './services/subtitleService';
import { GithubIcon } from './components/icons';

const SubtitleEditor = lazy(() => import('./components/SubtitleEditor'));
const HighlightViewer = lazy(() => import('./components/HighlightViewer'));

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[] | null>(null);
  const [highlightClips, setHighlightClips] = useState<HighlightClip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Store the current mode to switch text in Loader
  const [currentMode, setCurrentMode] = useState<AppMode>('subtitles');

  const [styleOptions, setStyleOptions] = useState<StyleOptions>({
    font: Font.MODERN,
    fontSize: 2.5,
    isBold: true,
    isItalic: false,
    textCase: TextCase.NORMAL,
    
    // Spacing
    letterSpacing: 0.05,
    lineHeight: 1.2,

    // Colors
    textColor: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.5,
    highlightColor: '#FFFF00',

    // Effects
    effect: EffectType.SHADOW,
    strokeOptions: {
      color: '#000000',
      width: 2,
    },
    shadowOptions: {
      color: 'rgba(0, 0, 0, 0.75)',
      blur: 5,
      offsetX: 2,
      offsetY: 2,
    },
    
    // Position & Animation
    position: Position.BOTTOM_CENTER,
    animation: Animation.WORD,
  });

  useEffect(() => {
    if (appState !== AppState.PROCESSING) return;

    // Update faster for smoother animation (every 200ms)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        
        // Asymptotic progress: moves 5% of the remaining distance each tick
        // This makes it fast initially and slows down naturally as it approaches 95%
        const remaining = 95 - prev;
        const increment = Math.max(0.2, remaining * 0.05); 
        
        return Math.min(prev + increment, 95);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [appState]);

  const resetState = () => {
    setMediaFile(null);
    setMediaUrl(null);
    setSubtitles(null);
    setHighlightClips(null);
    setError(null);
    setProgress(0);
    setAppState(AppState.UPLOAD);
  };
  
  const handleBack = () => {
    resetState();
  };

  const handleError = (err: unknown) => {
    console.error("An application error occurred:", err);
    const rawMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
    
    let structuredError: string;
    if (rawMessage.includes('|')) {
      structuredError = rawMessage;
    } else {
      structuredError = 'Request Failed|' + rawMessage;
    }
    
    setError(structuredError);
    setAppState(AppState.UPLOAD);
  }

  const applyStylePreset = (stylePreset: StylePreset) => {
     switch (stylePreset) {
          case StylePreset.TIKTOK:
            setStyleOptions(prev => ({
                ...prev,
                font: Font.GEOMETRIC,
                fontSize: 4.0,
                isBold: true,
                textCase: TextCase.UPPERCASE,
                textColor: '#FFFFFF',
                highlightColor: '#FFFF00',
                effect: EffectType.SHADOW,
                shadowOptions: {
                    color: 'rgba(0,0,0,0.8)',
                    blur: 8,
                    offsetX: 0,
                    offsetY: 4
                },
                position: Position.MIDDLE_CENTER,
                animation: Animation.WORD,
                lineHeight: 1.1,
                backgroundOpacity: 0,
            }));
            break;
          case StylePreset.MINIMALIST:
            setStyleOptions(prev => ({
              ...prev,
              font: Font.SANS,
              fontSize: 2.2,
              isBold: false,
              isItalic: false,
              textCase: TextCase.NORMAL,
              textColor: '#FFFFFF',
              backgroundOpacity: 0,
              effect: EffectType.NONE,
              position: Position.BOTTOM_CENTER,
              animation: Animation.NONE,
              lineHeight: 1.3,
              letterSpacing: 0,
            }));
            break;
          case StylePreset.BOLD_OUTLINE:
            setStyleOptions(prev => ({
              ...prev,
              font: Font.CONDENSED,
              fontSize: 4.5,
              isBold: true,
              textCase: TextCase.UPPERCASE,
              textColor: '#FFFF00',
              highlightColor: '#FFFFFF',
              backgroundOpacity: 0,
              effect: EffectType.OUTLINE,
              strokeOptions: {
                color: '#000000',
                width: 3,
              },
              position: Position.BOTTOM_CENTER,
              animation: Animation.KARAOKE,
              lineHeight: 1.1,
              letterSpacing: 0.05,
            }));
            break;
          case StylePreset.POP_3D:
            setStyleOptions(prev => ({
              ...prev,
              font: Font.ROUNDED,
              fontSize: 3.5,
              isBold: true,
              textCase: TextCase.NORMAL,
              textColor: '#FFFFFF',
              highlightColor: '#818cf8', // indigo-400
              backgroundOpacity: 0,
              effect: EffectType.SHADOW,
              shadowOptions: {
                color: 'rgba(0, 0, 0, 1)',
                blur: 0,
                offsetX: 4,
                offsetY: 4,
              },
              position: Position.MIDDLE_CENTER,
              animation: Animation.WORD,
              lineHeight: 1.2,
            }));
            break;
        }
  }

  const handleFileUpload = useCallback(async (file: File, targetLanguage: string, stylePreset: StylePreset, mode: AppMode) => {
    resetState();
    setMediaFile(file);
    setCurrentMode(mode);
    setAppState(AppState.PROCESSING);

    try {
      if (mode === 'subtitles') {
        const generatedSubtitles = await generateSubtitles({ mediaFile: file, targetLanguage, stylePreset });
        setProgress(100);
        setSubtitles(generatedSubtitles);
        setAppState(AppState.EDITING);
        applyStylePreset(stylePreset);
      } else {
        const clips = await generateHighlights({ mediaFile: file, targetLanguage, stylePreset });
        setProgress(100);
        setHighlightClips(clips);
        setAppState(AppState.HIGHLIGHTS);
      }
    } catch (err) {
      handleError(err);
    }
  }, []);
  
  const handleUrlSubmit = useCallback(async (url: string, targetLanguage: string, stylePreset: StylePreset, mode: AppMode) => {
    resetState();
    setMediaUrl(url);
    setCurrentMode(mode);
    setAppState(AppState.PROCESSING);
    
    try {
      if (mode === 'subtitles') {
        const generatedSubtitles = await generateSubtitles({ mediaUrl: url, targetLanguage, stylePreset });
        setProgress(100);
        setSubtitles(generatedSubtitles);
        setAppState(AppState.EDITING);
        applyStylePreset(stylePreset);
      } else {
        const clips = await generateHighlights({ mediaUrl: url, targetLanguage, stylePreset });
        setProgress(100);
        setHighlightClips(clips);
        setAppState(AppState.HIGHLIGHTS);
      }
    } catch (err) {
      handleError(err);
    }
  }, []);
  
  const getMediaSource = (): File | string => {
    if (mediaFile) return mediaFile;
    if (mediaUrl) return mediaUrl;
    throw new Error("No media source available.");
  }

  const renderContent = () => {
    switch (appState) {
      case AppState.UPLOAD:
        return (
            <div className="w-full h-full overflow-y-auto p-4 flex items-center justify-center">
                 <VideoUpload onUpload={handleFileUpload} onUrlSubmit={handleUrlSubmit} error={error} />
            </div>
        );
      case AppState.PROCESSING:
        return (
             <div className="w-full h-full overflow-y-auto p-4 flex items-center justify-center">
                <Loader message={currentMode === 'subtitles' ? "Transcribing and styling..." : "AI is watching your video to find the best moments..."} progress={progress} />
             </div>
        );
      case AppState.EDITING:
        if (subtitles) {
          return (
            <div className="w-full h-full p-4 lg:p-6 overflow-hidden flex flex-col">
              <Suspense fallback={<Loader message="Loading editor..." progress={100} />}>
                <SubtitleEditor
                mediaSource={getMediaSource()}
                subtitles={subtitles}
                setSubtitles={setSubtitles}
                styleOptions={styleOptions}
                setStyleOptions={setStyleOptions}
                onBack={handleBack}
                />
              </Suspense>
            </div>
          );
        }
        return (
            <div className="w-full h-full overflow-y-auto p-4 flex items-center justify-center">
                <VideoUpload onUpload={handleFileUpload} onUrlSubmit={handleUrlSubmit} error="Something went wrong. Please upload again." />
            </div>
        );
      case AppState.HIGHLIGHTS:
          if (highlightClips) {
              return (
                <div className="w-full h-full p-4 lg:p-6 overflow-hidden flex flex-col">
                  <Suspense fallback={<Loader message="Loading viewer..." progress={100} />}>
                    <HighlightViewer 
                      mediaSource={getMediaSource()}
                      clips={highlightClips}
                      onBack={handleBack}
                    />
                  </Suspense>
                </div>
              )
          }
          return (
             <div className="w-full h-full overflow-y-auto p-4 flex items-center justify-center">
                <VideoUpload onUpload={handleFileUpload} onUrlSubmit={handleUrlSubmit} error="Something went wrong. Please upload again." />
             </div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-[#030712] text-gray-100 flex flex-col overflow-hidden font-sans">
      <header className="w-full p-4 bg-gray-950/50 backdrop-blur-sm border-b border-gray-800 flex-shrink-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                Gemini
            </span>
            <span className="text-gray-200 font-bold">Studio</span>
          </h1>
          <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
            <GithubIcon className="w-6 h-6" />
          </a>
        </div>
      </header>
      <main className="flex-grow overflow-hidden relative w-full flex flex-col">
          {renderContent()}
      </main>
    </div>
  );
};

export default App;
