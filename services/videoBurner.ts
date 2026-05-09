
import { EffectType } from '../types';
import type { Subtitle, StyleOptions, Position } from '../types';

interface BurnerOptions {
  mediaSource: File | string;
  subtitles: Subtitle[];
  styleOptions: StyleOptions;
  onProgress: (progress: number) => void;
  startTime?: number;
  endTime?: number;
}

const FRAME_RATE = 30; // Target a higher frame rate for smoother capture

// Helper to get an object URL from either a File or a string URL
const getObjectURL = (mediaSource: File | string): { url: string; needsRevoke: boolean } => {
  if (typeof mediaSource === 'string') {
    return { url: mediaSource, needsRevoke: false };
  }
  return { url: URL.createObjectURL(mediaSource), needsRevoke: true };
};

// Translates CSS-like position to canvas coordinates and alignment
const getPositionProps = (
  position: Position,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline } => {
  let x = canvasWidth / 2;
  let y = canvasHeight / 2;
  let textAlign: CanvasTextAlign = 'center';
  let textBaseline: CanvasTextBaseline = 'middle';
  const margin = Math.min(canvasWidth, canvasHeight) * 0.05; // 5% margin

  // Horizontal alignment
  if (position.includes('LEFT')) {
    textAlign = 'left';
    x = margin;
  } else if (position.includes('RIGHT')) {
    textAlign = 'right';
    x = canvasWidth - margin;
  }

  // Vertical alignment
  if (position.includes('TOP')) {
    textBaseline = 'top';
    y = margin;
  } else if (position.includes('BOTTOM')) {
    textBaseline = 'bottom';
    y = canvasHeight - margin;
  }

  return { x, y, textAlign, textBaseline };
};

// Applies all styling from StyleOptions to the canvas context
const applyStylesToContext = (ctx: CanvasRenderingContext2D, styleOptions: StyleOptions) => {
  const {
    font, fontSize, isBold, isItalic, textColor, effect,
    strokeOptions, shadowOptions, letterSpacing, lineHeight, textCase
  } = styleOptions;
  
  // Font styling
  const fontSizePx = fontSize * 16; // A simple rem to px conversion
  ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSizePx}px ${font}`;
  ctx.fillStyle = textColor;
  ctx.letterSpacing = `${letterSpacing * fontSizePx}px`;

  // Effects
  ctx.shadowColor = 'transparent'; // Reset shadow
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (effect === EffectType.SHADOW) {
    ctx.shadowColor = shadowOptions.color;
    ctx.shadowBlur = shadowOptions.blur;
    ctx.shadowOffsetX = shadowOptions.offsetX;
    ctx.shadowOffsetY = shadowOptions.offsetY;
  } else if (effect === EffectType.OUTLINE) {
    ctx.strokeStyle = strokeOptions.color;
    ctx.lineWidth = strokeOptions.width;
  }
};

const drawSubtitle = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, styleOptions: StyleOptions) => {
    const { effect, textCase, backgroundOpacity, backgroundColor, lineHeight } = styleOptions;
    const transformedText = textCase === 'uppercase' ? text.toUpperCase() : text;
    const lines = transformedText.split('\n');
    const fontSizePx = styleOptions.fontSize * 16;
    const lineHeightPx = fontSizePx * lineHeight;

    // Background box
    if (backgroundOpacity > 0) {
        ctx.save();
        const textMetrics = lines.map(line => ctx.measureText(line));
        const totalHeight = lines.length * lineHeightPx;
        const maxWidth = Math.max(...textMetrics.map(m => m.width));
        
        ctx.fillStyle = backgroundColor;
        ctx.globalAlpha = backgroundOpacity;

        // Adjust position based on text alignment
        let rectX = x;
        if (ctx.textAlign === 'center') rectX -= maxWidth / 2;
        if (ctx.textAlign === 'right') rectX -= maxWidth;

        let rectY = y;
        if (ctx.textBaseline === 'middle') rectY -= totalHeight / 2;
        if (ctx.textBaseline === 'bottom') rectY -= totalHeight;

        ctx.fillRect(rectX - (fontSizePx*0.2), rectY - (fontSizePx*0.2), maxWidth + (fontSizePx*0.4), totalHeight + (fontSizePx*0.4));
        ctx.restore();
    }
    
    // Draw text line by line
    lines.forEach((line, index) => {
        const lineY = y + index * lineHeightPx;
        if (effect === EffectType.OUTLINE) {
            ctx.strokeText(line, x, lineY);
        }
        ctx.fillText(line, x, lineY);
    });
};

/**
 * Renders a video with burned-in subtitles.
 * Revised to use a single video element with hijacked audio routing for better sync and stability.
 */
export const exportBurnedInVideo = async ({ mediaSource, subtitles, styleOptions, onProgress, startTime = 0, endTime }: BurnerOptions): Promise<Blob> => {
    // Create AudioContext immediately to capture user gesture
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    return new Promise((resolve, reject) => {
        const { url, needsRevoke } = getObjectURL(mediaSource);

        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = url;
        video.preload = 'auto';
        // Do not mute, but volume=1. createMediaElementSource will route audio away from speakers.
        video.volume = 1; 

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
            if (needsRevoke) URL.revokeObjectURL(url);
            if (audioCtx.state !== 'closed') audioCtx.close();
            return reject(new Error('Could not get 2D context from canvas.'));
        }

        let mediaRecorder: MediaRecorder;
        const recordedChunks: Blob[] = [];
        let frameRequestCallbackId: number;
        let sourceNode: MediaElementAudioSourceNode | null = null;
        let dest: MediaStreamAudioDestinationNode | null = null;

        const cleanup = () => {
            if (needsRevoke) URL.revokeObjectURL(url);
            if (audioCtx.state !== 'closed') audioCtx.close();
            if (frameRequestCallbackId) video.cancelVideoFrameCallback(frameRequestCallbackId);
            
            video.pause();
            video.src = '';
            video.load(); // Force release of resources
            
            if (sourceNode) {
                try { sourceNode.disconnect(); } catch (e) {}
            }
        };

        video.onloadedmetadata = async () => {
            try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const videoDuration = video.duration;
                const finalEndTime = endTime && endTime > 0 ? Math.min(endTime, videoDuration) : videoDuration;
                const start = startTime || 0;

                if (start >= finalEndTime) {
                    throw new Error("Invalid time range: Start time is after end time.");
                }

                // 1. Setup Audio Graph
                try {
                    // Ensure context is running (browser might suspend it)
                    if (audioCtx.state === 'suspended') {
                        await audioCtx.resume();
                    }
                    
                    sourceNode = audioCtx.createMediaElementSource(video);
                    dest = audioCtx.createMediaStreamDestination();
                    sourceNode.connect(dest);
                } catch (audioErr) {
                    console.warn("Audio setup failed (likely CORS or format issue):", audioErr);
                    // We continue without audio if it fails, rather than blocking the whole export
                }
                
                const audioTrack = dest ? dest.stream.getAudioTracks()[0] : undefined;

                // 2. Setup Recorder
                const canvasStream = canvas.captureStream(FRAME_RATE);
                const tracks = [...canvasStream.getVideoTracks()];
                if (audioTrack) {
                    tracks.push(audioTrack);
                }

                const combinedStream = new MediaStream(tracks);
                
                // Detect supported MIME type
                const mimeTypes = [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm',
                    'video/mp4'
                ];
                
                const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
                
                if (!selectedMimeType) {
                    throw new Error("This browser does not support video recording formats (WebM or MP4).");
                }

                mediaRecorder = new MediaRecorder(combinedStream, { 
                    mimeType: selectedMimeType,
                    videoBitsPerSecond: 5000000 // 5 Mbps target
                });

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: selectedMimeType });
                    cleanup();
                    resolve(blob);
                };

                mediaRecorder.onerror = (event) => {
                    console.error("MediaRecorder error:", event);
                    cleanup();
                    reject(new Error("Recording failed due to a browser error."));
                };

                // 3. Render Loop
                const renderFrame = (now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
                    const currentTime = metadata.mediaTime;

                    if (currentTime >= finalEndTime || video.ended) {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                        return;
                    }

                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Draw Subtitles
                    if (subtitles && subtitles.length > 0) {
                        const activeSubtitle = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
                        if (activeSubtitle) {
                            applyStylesToContext(ctx, styleOptions);
                            const { x, y, textAlign, textBaseline } = getPositionProps(styleOptions.position, canvas.width, canvas.height);
                            ctx.textAlign = textAlign;
                            ctx.textBaseline = textBaseline;
                            drawSubtitle(ctx, activeSubtitle.text, x, y, styleOptions);
                        }
                    }

                    // Update Progress
                    const sliceDuration = finalEndTime - start;
                    const progress = Math.max(0, Math.min(100, ((currentTime - start) / sliceDuration) * 100));
                    onProgress(progress);

                    if (mediaRecorder.state === 'recording') {
                        frameRequestCallbackId = video.requestVideoFrameCallback(renderFrame);
                    }
                };

                // 4. Start Playback & Recording
                video.currentTime = start;
                
                const onSeeked = async () => {
                    video.removeEventListener('seeked', onSeeked);
                    try {
                        mediaRecorder.start(1000); // 1s timeslice to keep memory usage managed
                        await video.play();
                        frameRequestCallbackId = video.requestVideoFrameCallback(renderFrame);
                    } catch (playErr) {
                        cleanup();
                        reject(new Error("Failed to start video playback. The browser might be blocking autoplay."));
                    }
                };
                
                video.addEventListener('seeked', onSeeked);

            } catch (err) {
                cleanup();
                reject(err);
            }
        };

        video.onerror = () => {
            cleanup();
            reject(new Error("Failed to load the video file. It might be corrupt or the format is unsupported."));
        };
    });
};
