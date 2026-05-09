import React, { useState } from 'react';
import type { HighlightClip, StyleOptions } from '../types';
import { StylePreset, Font, TextCase, EffectType, Position, Animation } from '../types';
import VideoPlayer from './VideoPlayer';
import { ArrowLeftIcon, ScissorsIcon, PlayIcon, SpinnerIcon, CheckIcon, DownloadIcon } from './icons';
import { exportBurnedInVideo } from '../services/videoBurner';

interface HighlightViewerProps {
  mediaSource: File | string;
  clips: HighlightClip[];
  onBack: () => void;
}

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Default style options for export (can be hidden or dummy since we aren't burning subtitles yet for clips)
const dummyStyleOptions: StyleOptions = {
    font: Font.MODERN, fontSize: 1, isBold: false, isItalic: false, textCase: TextCase.NORMAL,
    letterSpacing: 0, lineHeight: 1, textColor: 'transparent', backgroundColor: 'transparent',
    backgroundOpacity: 0, highlightColor: 'transparent', effect: EffectType.NONE,
    strokeOptions: { color: 'transparent', width: 0 }, shadowOptions: { color: 'transparent', blur: 0, offsetX: 0, offsetY: 0 },
    position: Position.BOTTOM_CENTER, animation: Animation.NONE
};

const HighlightViewer: React.FC<HighlightViewerProps> = ({ mediaSource, clips, onBack }) => {
    const [playbackRange, setPlaybackRange] = useState<{ start: number; end: number } | null>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [exportingIndex, setExportingIndex] = useState<number | null>(null);
    const [exportProgress, setExportProgress] = useState(0);
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

    const handleClipPlay = (clip: HighlightClip, index: number) => {
        setPlaybackRange({ start: clip.start, end: clip.end });
        setActiveIndex(index);
    };
    
    const handleExportClip = async (e: React.MouseEvent, clip: HighlightClip, index: number) => {
        e.stopPropagation();
        if (exportingIndex !== null) return;
        
        setExportingIndex(index);
        setExportProgress(0);
        
        try {
            // Export without subtitles for now, acting as a smart trimmer
            const videoBlob = await exportBurnedInVideo({
                mediaSource,
                subtitles: [], 
                styleOptions: dummyStyleOptions,
                onProgress: setExportProgress,
                startTime: clip.start,
                endTime: clip.end
            });
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(videoBlob);
            const cleanTitle = clip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `gemini_highlight_${cleanTitle}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            
            // Small delay to show completion
            setTimeout(() => setExportingIndex(null), 1500);
            
        } catch (err) {
            console.error("Clip export failed", err);
            alert("Failed to export clip.");
            setExportingIndex(null);
        }
    };

    const isClipActive = activeIndex !== null;
    
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white';
        if (score >= 75) return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
        return 'bg-gray-700 text-gray-300';
    };
    
    const isPortrait = videoDimensions ? videoDimensions.height > videoDimensions.width : false;

    return (
        <div className="w-full h-full max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-6">
            <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
                <div className="flex items-center justify-start flex-shrink-0">
                    <button onClick={onBack} className="back-button">
                        <ArrowLeftIcon className="w-5 h-5"/>
                        Upload New File
                    </button>
                </div>
                <div className="w-full h-full bg-black rounded-lg overflow-hidden relative shadow-2xl border border-gray-700 video-player-bg flex items-center justify-center group">
                    <div 
                        className={`relative transition-all duration-300 ease-in-out max-w-full max-h-full ${
                            !videoDimensions ? 'w-full h-full' : 
                            (isPortrait ? 'h-full w-auto' : 'w-full h-auto')
                        }`}
                        style={videoDimensions ? { aspectRatio: `${videoDimensions.width}/${videoDimensions.height}` } : undefined}
                    >
                        <VideoPlayer 
                            mediaSource={mediaSource} 
                            playbackRange={playbackRange}
                            onVideoLoad={setVideoDimensions}
                        />
                    </div>
                </div>
            </div>

            <div className="ui-panel flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0 p-5 border-b border-gray-700 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-500/10 rounded-lg">
                             <ScissorsIcon className="w-6 h-6 text-teal-400"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Viral Highlights</h2>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wide">AI-Curated Moments</p>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4 min-h-0">
                    {clips.map((clip, index) => (
                        <div 
                            key={index}
                            className={`relative p-5 rounded-xl transition-all duration-200 cursor-pointer border group overflow-hidden ${
                                activeIndex === index 
                                ? 'bg-indigo-900/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                                : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                            }`}
                            onClick={() => handleClipPlay(clip, index)}
                        >
                            {/* Score Badge */}
                            <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-xs font-bold shadow-lg ${getScoreColor(clip.viralityScore)}`}>
                                Score: {clip.viralityScore}
                            </div>

                            <div className="flex justify-between items-start mb-2 mt-1">
                                <div className='flex-grow pr-16'>
                                    <h3 className="font-bold text-white text-lg leading-snug mb-1">{clip.title}</h3>
                                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-3">
                                        <span className="bg-gray-900/50 px-1.5 py-0.5 rounded border border-gray-700/50">{formatTime(clip.start)} - {formatTime(clip.end)}</span>
                                        <span>•</span>
                                        <span>{Math.round(clip.end - clip.start)}s duration</span>
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed">{clip.description}</p>
                                </div>
                            </div>

                            {/* Export Button Overlay */}
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={(e) => handleExportClip(e, clip, index)}
                                    disabled={exportingIndex !== null}
                                    className={`text-xs font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                        activeIndex === index ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    } ${exportingIndex === index ? 'cursor-not-allowed opacity-100' : ''}`}
                                >
                                    {exportingIndex === index ? (
                                        <>
                                            <SpinnerIcon className="w-3 h-3 animate-spin" />
                                            {Math.round(exportProgress)}%
                                        </>
                                    ) : (
                                        <>
                                            <DownloadIcon className="w-3.5 h-3.5" />
                                            Export Clip
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            {/* Progress bar for export */}
                            {exportingIndex === index && (
                                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-100" style={{ width: `${exportProgress}%`}}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HighlightViewer;