
import React, { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Subtitle, StyleOptions, SrtExportOptions, Word } from '../types';
import VideoPlayer from './VideoPlayer';
import StyleControls from './StyleControls';
import SubtitleTimeline from './SubtitleTimeline';
import ExportModal from './ExportModal';
import { exportToSRT, exportToVTT } from '../services/subtitleService';
import { exportBurnedInVideo } from '../services/videoBurner';
import { ArrowLeftIcon, DownloadIcon, VideoIcon, SpinnerIcon, CheckIcon } from './icons';

interface SubtitleEditorProps {
  mediaSource: File | string;
  subtitles: Subtitle[];
  setSubtitles: Dispatch<SetStateAction<Subtitle[] | null>>;
  styleOptions: StyleOptions;
  setStyleOptions: Dispatch<SetStateAction<StyleOptions>>;
  onBack: () => void;
}

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  mediaSource,
  subtitles,
  setSubtitles,
  styleOptions,
  setStyleOptions,
  onBack
}) => {
  const [isSrtModalOpen, setIsSrtModalOpen] = useState(false);
  const [srtExportOptions, setSrtExportOptions] = useState<SrtExportOptions>({
    type: 'lines',
    maxCharsPerLine: 42,
    maxLinesPerCard: 2,
  });
  const [activeTab, setActiveTab] = useState<'style' | 'timeline'>('style');
  const [exportState, setExportState] = useState<'idle' | 'rendering' | 'success'>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hasClamped, setHasClamped] = useState(false);
  
  const isWordAnimationAvailable = subtitles.length > 0 && !!subtitles[0].words && subtitles[0].words.length > 0;
  
  useEffect(() => {
    // This effect runs once when the video duration is known. It clamps any subtitle
    // timestamps that might exceed the actual video length, which can happen with
    // subtitles generated from URLs where duration isn't known beforehand.
    if (videoDuration && subtitles && !hasClamped) {
      const needsClamping = subtitles.some(sub => sub.end > videoDuration || sub.start > videoDuration);

      if (needsClamping) {
        console.log(`[Client] Clamping ${subtitles.length} subtitles to video duration of ${videoDuration}s.`);
        setHasClamped(true); // Prevent this from running more than once

        const clamp = (value: number) => Math.min(value, videoDuration);

        const clampedSubtitles = subtitles.map(sub => {
            if (sub.start >= videoDuration) {
                return null;
            }
            const clampedSub = { ...sub };
            clampedSub.end = clamp(sub.end);
            clampedSub.start = Math.min(sub.start, clampedSub.end);

            if (clampedSub.words) {
                clampedSub.words = clampedSub.words.map(word => {
                    if (word.start >= videoDuration) {
                        return null;
                    }
                    const clampedWord = { ...word };
                    clampedWord.end = clamp(word.end);
                    clampedWord.start = Math.min(word.start, clampedWord.end);
                    return clampedWord;
                }).filter((word): word is Word => word !== null);
            }
            
            return clampedSub;
        }).filter((sub): sub is Subtitle => sub !== null);

        console.log(`[Client] Clamped subtitles. New count: ${clampedSubtitles.length}`);
        setSubtitles(clampedSubtitles);
      }
    }
  }, [videoDuration, subtitles, setSubtitles, hasClamped]);

  const downloadFile = (content: string, fileName: string, isUrl: boolean = false) => {
    const a = document.createElement('a');
    a.href = isUrl ? content : URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!isUrl) {
      URL.revokeObjectURL(a.href);
    }
  };

  const handleSrtExport = () => {
    const fileNameBase = mediaSource instanceof File ? mediaSource.name.split('.').slice(0, -1).join('.') : 'video_from_link';
    const content = exportToSRT(subtitles, srtExportOptions);
    const fileName = `${fileNameBase}.srt`;
    downloadFile(content, fileName);
    setIsSrtModalOpen(false);
  };
  
  const handleVttExport = () => {
    const fileNameBase = mediaSource instanceof File ? mediaSource.name.split('.').slice(0, -1).join('.') : 'video_from_link';
    const content = exportToVTT(subtitles);
    const fileName = `${fileNameBase}.vtt`;
    downloadFile(content, fileName);
  };
  
  const handleUpdateSubtitle = (index: number, updates: Partial<Subtitle>) => {
    if (!subtitles) return;
    const newSubtitles = [...subtitles];
    const updatedSubtitle = { ...newSubtitles[index], ...updates };
    
    // If manual timing changes happen, we clear word-level timestamps to prevent desync
    if (updates.start !== undefined || updates.end !== undefined) {
        updatedSubtitle.words = [];
    }
    
    newSubtitles[index] = updatedSubtitle;
    setSubtitles(newSubtitles);
  };

  const handleBurnedInExport = async () => {
    if (exportState !== 'idle') return;

    alert('Video rendering will now begin. This is a CPU-intensive process that may take several minutes and could make your browser sluggish. Please keep this tab open and do not interact with other parts of the page.');
    setExportState('rendering');
    setExportProgress(0);

    try {
      const videoBlob = await exportBurnedInVideo({
        mediaSource,
        subtitles,
        styleOptions,
        onProgress: setExportProgress,
      });

      setExportState('success');
      const fileNameBase = mediaSource instanceof File ? mediaSource.name.split('.').slice(0, -1).join('.') : 'video_from_link';
      const fileName = `${fileNameBase}_subtitled.webm`;
      downloadFile(URL.createObjectURL(videoBlob), fileName, true);

      setTimeout(() => {
        setExportState('idle');
      }, 3000);

    } catch (err) {
      console.error("Failed to export burned-in video:", err);
      alert(`Export failed: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
      setExportState('idle');
    }
  };
  
  const isPortrait = videoDimensions ? videoDimensions.height > videoDimensions.width : false;

  return (
    <>
      <div className="w-full h-full max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-6">
        <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-start flex-shrink-0">
              <button onClick={onBack} className="back-button">
                  <ArrowLeftIcon className="w-5 h-5"/>
                  Upload New File
              </button>
          </div>
          <div className="w-full h-full bg-black rounded-lg overflow-hidden relative shadow-2xl border border-gray-700 video-player-bg flex items-center justify-center">
            <div 
                className={`relative transition-all duration-300 ${
                    !videoDimensions ? 'w-full h-full' : 
                    (isPortrait ? 'h-full w-auto' : 'w-full h-auto')
                } max-w-full max-h-full shadow-2xl`}
                style={videoDimensions ? { aspectRatio: `${videoDimensions.width}/${videoDimensions.height}` } : undefined}
            >
                <VideoPlayer 
                  mediaSource={mediaSource} 
                  subtitles={subtitles} 
                  styleOptions={styleOptions}
                  onDurationChange={setVideoDuration}
                  onVideoLoad={setVideoDimensions}
                />
            </div>
          </div>
        </div>
        
        <div className="ui-panel flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 p-3">
            <div className="tab-container">
                <button 
                  onClick={() => setActiveTab('style')}
                  className={`tab-button ${activeTab === 'style' ? 'active' : ''}`}
                  aria-pressed={activeTab === 'style'}
                >
                  Style
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                  aria-pressed={activeTab === 'timeline'}
                >
                  Timeline
                </button>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 min-h-0">
            {activeTab === 'style' ? (
              <StyleControls 
                options={styleOptions} 
                setOptions={setStyleOptions}
                isWordAnimationAvailable={isWordAnimationAvailable}
              />
            ) : (
              <SubtitleTimeline subtitles={subtitles} onUpdateSubtitle={handleUpdateSubtitle} />
            )}
          </div>

          <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800/50 space-y-3">
             <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setIsSrtModalOpen(true)} className="action-button btn-secondary">
                    <DownloadIcon className="w-5 h-5" />
                    Export SRT
                 </button>
                 <button onClick={handleVttExport} className="action-button btn-secondary">
                    <DownloadIcon className="w-5 h-5" />
                    Export VTT
                 </button>
             </div>
              <button
                onClick={handleBurnedInExport}
                disabled={exportState === 'rendering'}
                className={`action-button overflow-hidden relative ${
                    exportState === 'success' ? 'btn-tertiary' : 'btn-primary'
                } ${exportState === 'rendering' ? 'opacity-75 cursor-wait' : ''}`}
              >
                  {exportState === 'idle' && (
                      <>
                          <VideoIcon className="w-5 h-5" />
                          Export Burned-in Video
                      </>
                  )}
                  {exportState === 'rendering' && (
                      <>
                        <div className="absolute top-0 left-0 h-full bg-white/10" style={{ width: `${exportProgress}%`, transition: 'width 0.1s linear' }}></div>
                        <div className="relative z-10 flex items-center justify-center gap-2">
                           <SpinnerIcon className="w-5 h-5 animate-spin" />
                           <span>Rendering... {Math.round(exportProgress)}%</span>
                        </div>
                      </>
                  )}
                  {exportState === 'success' && (
                      <>
                          <CheckIcon className="w-5 h-5" />
                          Export Successful!
                      </>
                  )}
              </button>
          </div>
        </div>
      </div>
      <ExportModal 
        isOpen={isSrtModalOpen}
        onClose={() => setIsSrtModalOpen(false)}
        onConfirm={handleSrtExport}
        exportOptions={srtExportOptions}
        setExportOptions={setSrtExportOptions}
        isWordLevelAvailable={isWordAnimationAvailable}
      />
    </>
  );
};

export default SubtitleEditor;
