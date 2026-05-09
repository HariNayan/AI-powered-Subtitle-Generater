
import type { Subtitle, Word, StylePreset, SrtExportOptions, HighlightClip } from '../types';
import { processVideoForSubtitles, generateVideoHighlights as serverGenerateHighlights } from '../server/videoProcessor';

const MAX_FILE_SIZE_MB = 1000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface SubtitleRequest {
    mediaFile?: File;
    mediaUrl?: string;
    targetLanguage: string;
    stylePreset: StylePreset;
}

const validateFileSize = (file: File) => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    throw new Error(`File Too Large|Your file is ${fileSizeMB}MB, which exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please upload a smaller file.`);
  }
};

/**
 * Client-side entry point for generating subtitles.
 */
export const generateSubtitles = async (options: SubtitleRequest): Promise<Subtitle[]> => {
  const { mediaFile, mediaUrl } = options;

  if (mediaFile) {
    validateFileSize(mediaFile);
  } else if (!mediaUrl) {
    throw new Error("No media source provided.");
  }

  try {
    const subtitles = await processVideoForSubtitles(options);
    return subtitles;
  } catch (error) {
    console.error("Error during subtitle processing:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("An unknown error occurred on the server.");
  }
};

/**
 * Client-side entry point for generating highlights.
 */
export const generateHighlights = async (options: SubtitleRequest): Promise<HighlightClip[]> => {
    const { mediaFile, mediaUrl } = options;
  
    if (mediaFile) {
      validateFileSize(mediaFile);
    } else if (!mediaUrl) {
      throw new Error("No media source provided.");
    }
  
    try {
      const clips = await serverGenerateHighlights(options);
      return clips;
    } catch (error) {
      console.error("Error during highlight generation:", error);
      if (error instanceof Error) {
          throw new Error(error.message);
      }
      throw new Error("An unknown error occurred on the server.");
    }
};


const formatTimestamp = (seconds: number, format: 'srt' | 'vtt'): string => {
    if (isNaN(seconds) || seconds < 0) {
        seconds = 0;
    }

    const date = new Date(0);
    date.setSeconds(seconds);

    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');

    const separator = format === 'srt' ? ',' : '.';
    return `${hours}:${minutes}:${secs}${separator}${ms}`;
};

const rewrapSubtitles = (subtitles: Subtitle[], maxCharsPerLine: number, maxLinesPerCard: number): Subtitle[] => {
    const newSubtitles: Subtitle[] = [];

    for (const sub of subtitles) {
        const words = sub.text.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) continue;

        // 1. Create lines based on maxCharsPerLine
        const lines: string[] = [];
        let currentLine = '';
        for (const word of words) {
            if (currentLine.length === 0) {
                currentLine = word;
            } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
                currentLine += ` ${word}`;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        // 2. Create cards based on maxLinesPerCard
        const cards: string[] = [];
        for (let i = 0; i < lines.length; i += maxLinesPerCard) {
            const chunk = lines.slice(i, i + maxLinesPerCard);
            cards.push(chunk.join('\n'));
        }

        // 3. Distribute duration and create new Subtitle objects
        const originalDuration = sub.end - sub.start;
        const durationPerCard = cards.length > 0 ? originalDuration / cards.length : 0;

        for (let i = 0; i < cards.length; i++) {
            newSubtitles.push({
                text: cards[i],
                start: sub.start + (i * durationPerCard),
                end: sub.start + ((i + 1) * durationPerCard),
            });
        }
    }

    return newSubtitles;
};

export const exportToSRT = (subtitles: Subtitle[], options: SrtExportOptions): string => {
  if (options.type === 'words') {
    const words: Word[] = subtitles.flatMap(sub => sub.words || []);
    if (words.length === 0) {
        return exportToSRT(subtitles, { ...options, type: 'lines' });
    }
    return words.map((word, index) => {
      const startTime = formatTimestamp(word.start, 'srt');
      const endTime = formatTimestamp(word.end, 'srt');
      return `${index + 1}\n${startTime} --> ${endTime}\n${word.word}\n`;
    }).join('\n');
  }
  
  let subtitlesToExport = subtitles;
  if (options.type === 'lines' && options.maxCharsPerLine > 0 && options.maxLinesPerCard > 0) {
      subtitlesToExport = rewrapSubtitles(subtitles, options.maxCharsPerLine, options.maxLinesPerCard);
  }

  return subtitlesToExport.map((sub, index) => {
    const startTime = formatTimestamp(sub.start, 'srt');
    const endTime = formatTimestamp(sub.end, 'srt');
    return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
  }).join('\n');
};

export const exportToVTT = (subtitles: Subtitle[]): string => {
  const header = "WEBVTT\n\n";
  const body = subtitles.map((sub) => {
    const startTime = formatTimestamp(sub.start, 'vtt');
    const endTime = formatTimestamp(sub.end, 'vtt');
    return `${startTime} --> ${endTime}\n${sub.text}\n`;
  }).join('\n');
  return header + body;
};
