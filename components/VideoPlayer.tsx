import React, { useState, useEffect, useRef } from 'react';
import type { Subtitle, StyleOptions, Word, Position } from '../types';
import { Animation, EffectType } from '../types';
import { PlayIcon, PauseIcon, VolumeUpIcon, VolumeMutedIcon } from './icons';

interface VideoPlayerProps {
  mediaSource: File | string;
  subtitles?: Subtitle[];
  styleOptions?: StyleOptions;
  playbackRange?: { start: number; end: number } | null;
  onDurationChange?: (duration: number) => void;
  onVideoLoad?: (meta: { width: number; height: number; duration: number }) => void;
}

const SUBTITLE_PRELOAD_SECONDS = 0.5; // Show subtitles 500ms early to improve perceived sync

// Helper function to convert HEX to RGBA for opacity
const hexToRgba = (hex: string, opacity: number): string => {
    if (hex === 'transparent' || opacity === 0) {
        return 'rgba(0,0,0,0)';
    }
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${opacity})`;
    }
    // Handle cases where the color might already be in rgb/rgba format from defaults
    if (hex.startsWith('rgb')) {
        const parts = hex.substring(hex.indexOf('(') + 1, hex.indexOf(')')).split(',');
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
    }
    return hex; // Fallback
};

// Helper function to generate the text effect style
const getEffectStyle = (styleOptions: StyleOptions): React.CSSProperties => {
    const { effect, strokeOptions, shadowOptions } = styleOptions;
    
    switch (effect) {
        case EffectType.SHADOW:
            return {
                textShadow: `${shadowOptions.offsetX}px ${shadowOptions.offsetY}px ${shadowOptions.blur}px ${shadowOptions.color}`,
            };
        case EffectType.OUTLINE:
            const { color, width } = strokeOptions;
            if (width <= 0) return { textShadow: 'none' };
            // Create a "stroke" effect using multiple text shadows
            const shadows = [
                `-${width}px -${width}px 0 ${color}`, `${width}px -${width}px 0 ${color}`,
                `-${width}px  ${width}px 0 ${color}`, `${width}px  ${width}px 0 ${color}`,
                `-${width}px 0 0 ${color}`, `${width}px 0 0 ${color}`,
                `0 -${width}px 0 ${color}`, `0 ${width}px 0 ${color}`
            ].join(', ');

            return { textShadow: shadows };
        case EffectType.NONE:
        default:
            return { textShadow: 'none' };
    }
};

const renderTextWithHighlights = (text: string, highlightColor: string): React.ReactNode => {
    if (!text.includes('**')) {
        return text;
    }
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={index} style={{ color: highlightColor, fontWeight: 900 }}>
                            {part.substring(2, part.length - 2)}
                        </strong>
                    );
                }
                return part;
            })}
        </>
    );
};

// Determines text alignment based on the broader position setting
const getTextAlign = (position: Position): 'left' | 'center' | 'right' => {
  if (position.includes('LEFT')) return 'left';
  if (position.includes('RIGHT')) return 'right';
  return 'center';
};

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return '00:00';
    }
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${minutes}:${secs}`;
    }
    return `${minutes}:${secs}`;
};


// Define component outside to prevent re-creation on re-renders
const SubtitleDisplay: React.FC<{
    activeSubtitle: Subtitle | null;
    styleOptions: StyleOptions;
    currentTime: number;
}> = ({ activeSubtitle, styleOptions, currentTime }) => {
    if (!activeSubtitle) return null;

    const baseClasses = `px-4 py-2 rounded-md transition-all duration-200 ${styleOptions.isBold ? 'font-bold' : ''} ${styleOptions.isItalic ? 'italic' : ''}`;

    const dynamicStyles: React.CSSProperties = {
        backgroundColor: hexToRgba(styleOptions.backgroundColor, styleOptions.backgroundOpacity),
        fontSize: `${styleOptions.fontSize}rem`,
        fontFamily: styleOptions.font,
        textTransform: styleOptions.textCase,
        letterSpacing: `${styleOptions.letterSpacing}em`,
        lineHeight: styleOptions.lineHeight,
        textAlign: getTextAlign(styleOptions.position),
        ...getEffectStyle(styleOptions),
    };

    const renderContent = () => {
        if (styleOptions.animation === Animation.KARAOKE) {
            const duration = activeSubtitle.end - activeSubtitle.start;
            const progress = (currentTime - activeSubtitle.start) / duration;
            const gradientPercentage = Math.max(0, Math.min(100, progress * 100));

            return (
                <span
                    style={{
                        background: `linear-gradient(to right, ${styleOptions.highlightColor} ${gradientPercentage}%, ${styleOptions.textColor} ${gradientPercentage}%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                    }}
                >
                    {renderTextWithHighlights(activeSubtitle.text, styleOptions.highlightColor)}
                </span>
            );
        }

        if (styleOptions.animation === Animation.WORD && activeSubtitle.words && activeSubtitle.words.length > 0) {
            return (
                <span>
                    {activeSubtitle.words.map((word: Word, index: number) => (
                        <span
                            key={index}
                            style={{
                                color: currentTime >= word.start ? styleOptions.highlightColor : styleOptions.textColor,
                                transition: 'color 0.1s ease-in-out',
                            }}
                        >
                            {word.word}{' '}
                        </span>
                    ))}
                </span>
            );
        }
        
        // Fallback for NONE animation or if word data is missing
        return <span style={{ color: styleOptions.textColor }}>{renderTextWithHighlights(activeSubtitle.text, styleOptions.highlightColor)}</span>;
    };

    return (
        <div className={`absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex ${styleOptions.position} pointer-events-none`}>
            <div className={`max-w-4xl ${baseClasses}`} style={dynamicStyles}>
                {renderContent()}
            </div>
        </div>
    );
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ mediaSource, subtitles, styleOptions, playbackRange, onDurationChange, onVideoLoad }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const frameCallbackIdRef = useRef<number | null>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [activeSubtitle, setActiveSubtitle] = useState<Subtitle | null>(null);
    const [isControlsVisible, setIsControlsVisible] = useState(false);
    const [showPlayPauseIndicator, setShowPlayPauseIndicator] = useState(false);

    const videoObjectFitClass = 'object-contain';

    const videoSrc = typeof mediaSource === 'string' 
        ? mediaSource 
        : (objectUrlRef.current || (objectUrlRef.current = URL.createObjectURL(mediaSource)));

    const hideControls = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = window.setTimeout(() => {
            if (isPlaying) {
                 setIsControlsVisible(false);
            }
        }, 2000);
    };

    const showControls = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        setIsControlsVisible(true);
        if(isPlaying) {
            hideControls();
        }
    };
    
    const togglePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
        
        setShowPlayPauseIndicator(true);
        setTimeout(() => setShowPlayPauseIndicator(false), 500);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const seekTime = Number(e.target.value);
        video.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const newVolume = Number(e.target.value);
        video.volume = newVolume;
        setVolume(newVolume);
        video.muted = newVolume === 0;
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        const currentlyMuted = !video.muted;
        video.muted = currentlyMuted;
        setIsMuted(currentlyMuted);

        if (!currentlyMuted && video.volume === 0) {
            const newVolume = 0.5;
            video.volume = newVolume;
            setVolume(newVolume);
        }
    };

    // Main update loop using requestVideoFrameCallback for perfectly synchronized subtitle display.
    // This is more accurate than the 'timeupdate' event, which fires less frequently.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // --- Per-frame processing logic ---
        const processFrame = (now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
            const mediaTime = metadata.mediaTime;
            setCurrentTime(mediaTime);

            // Update active subtitle
            if (subtitles) {
                // By checking for the subtitle slightly ahead of time, we compensate for potential
                // transcription delays from the AI and improve perceived synchronization.
                const currentSubtitle = subtitles.find(sub => mediaTime >= (sub.start - SUBTITLE_PRELOAD_SECONDS) && mediaTime <= sub.end) || null;
                // Avoid re-renders if the active subtitle hasn't changed
                setActiveSubtitle(prev => {
                    if (prev?.start === currentSubtitle?.start && prev?.text === currentSubtitle?.text) {
                        return prev;
                    }
                    return currentSubtitle;
                });
            }

            // Handle playback range for highlight clips
            if (playbackRange && mediaTime >= playbackRange.end && !video.seeking) {
                video.pause();
                video.currentTime = playbackRange.start;
            }

            // Re-register the callback to continue the loop while the video is playing
            frameCallbackIdRef.current = video.requestVideoFrameCallback(processFrame);
        };
        
        const startLoop = () => {
            if (frameCallbackIdRef.current) {
                video.cancelVideoFrameCallback(frameCallbackIdRef.current);
            }
            frameCallbackIdRef.current = video.requestVideoFrameCallback(processFrame);
        };

        const stopLoop = () => {
            if (frameCallbackIdRef.current) {
                video.cancelVideoFrameCallback(frameCallbackIdRef.current);
                frameCallbackIdRef.current = null;
            }
        };

        // --- Event Listeners ---
        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            onDurationChange?.(video.duration);
            onVideoLoad?.({
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration
            });
        };
        const handlePlay = () => {
            setIsPlaying(true);
            hideControls();
            startLoop(); // Start the high-precision loop on play
        };
        const handlePause = () => {
            setIsPlaying(false);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            setIsControlsVisible(true);
            stopLoop(); // Stop the loop on pause or end
        };
        const handleVolume = () => {
            if (video) {
                setIsMuted(video.muted);
                setVolume(video.volume);
            }
        };

        // Bind event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handlePause);
        video.addEventListener('volumechange', handleVolume);

        setIsControlsVisible(true); // Show controls on initial load

        // Cleanup
        return () => {
            stopLoop(); // Stop any running loops on unmount
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handlePause);
            video.removeEventListener('volumechange', handleVolume);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [subtitles, playbackRange, onDurationChange, onVideoLoad]); // Re-run effect when subtitles/range/callback change
    
    // Effect to handle seeking to the start of a highlight clip
    useEffect(() => {
        const video = videoRef.current;
        if (video && playbackRange) {
            video.currentTime = playbackRange.start;
            video.play();
        }
    }, [playbackRange]);

    // Effect for cleaning up the object URL
    useEffect(() => {
        const url = objectUrlRef.current;
        return () => { if (url) URL.revokeObjectURL(url); };
    }, []);
    
    const progressStyle = {
        background: `linear-gradient(to right, var(--color-primary) ${ (currentTime / duration) * 100 }%, rgba(255, 255, 255, 0.3) ${ (currentTime / duration) * 100 }%)`
    };

    return (
        <div 
            ref={containerRef}
            className={`video-container w-full h-full relative bg-black ${isControlsVisible ? 'controls-visible' : ''} ${showPlayPauseIndicator ? 'show-play-pause-indicator' : ''}`}
            onMouseMove={showControls}
            onMouseLeave={() => isPlaying && hideControls()}
        >
            <video
                ref={videoRef}
                src={videoSrc}
                className={`w-full h-full ${videoObjectFitClass}`}
                onClick={togglePlayPause}
                onDoubleClick={() => videoRef.current?.requestFullscreen()}
            />
            
            <div className="video-controls-overlay">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="seek-bar"
                    style={progressStyle}
                />
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <button onClick={togglePlayPause} className="video-control-button" aria-label={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                        </button>
                        <div className="flex items-center gap-2 group">
                             <button onClick={toggleMute} className="video-control-button" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                                {isMuted || volume === 0 ? <VolumeMutedIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                                aria-label="Volume control"
                            />
                        </div>
                    </div>
                    <div className="text-sm font-mono text-white">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>
            </div>

            <div className="play-pause-overlay">
              {!isPlaying ? <PlayIcon className="w-8 h-8 text-white"/> : <PauseIcon className="w-8 h-8 text-white"/>}
            </div>

            {activeSubtitle && styleOptions && (
                <SubtitleDisplay 
                    activeSubtitle={activeSubtitle} 
                    styleOptions={styleOptions} 
                    currentTime={currentTime}
                />
            )}
        </div>
    );
};

export default VideoPlayer;