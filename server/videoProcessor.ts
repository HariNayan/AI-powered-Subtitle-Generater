
import { GoogleGenAI, Type } from "@google/genai";
import type { Subtitle, Word, HighlightClip } from '../types';
import { StylePreset } from '../types';

/**
 * NOTE: This file represents a server-side process.
 * In a real application, this code would run on a backend server (e.g., Node.js).
 * It would receive the uploaded file, process it (e.g., extract audio with FFmpeg),
 * and then make the call to the Gemini API.
 */

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface SubtitleRequest {
    mediaFile?: File;
    mediaUrl?: string;
    targetLanguage: string;
    stylePreset: StylePreset;
}

type GenerativePart = { inlineData: { mimeType: string; data: string } } | { fileData: { mimeType: string, fileUri: string } };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Uploads a file to the Gemini File API and waits for it to be processed.
 */
const uploadFileToGemini = async (file: File): Promise<{
    fileData: { mimeType: string; fileUri: string };
    duration: number | null;
}> => {
    console.log(`[Server] Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) to File API...`);
    
    const uploadResult = await ai.files.upload({
        file: file,
    });
    
    console.log(`[Server] File uploaded: ${uploadResult.name}. State: ${uploadResult.state}. Polling for ACTIVE state...`);

    const maxRetries = 60; // Increased retries since we poll faster
    let retryCount = 0;

    while (retryCount < maxRetries) {
        const fileState = await ai.files.get({ name: uploadResult.name });
        console.log(`[Server] Polling attempt ${retryCount + 1}: File ${fileState.name} is in state ${fileState.state}`);

        if (fileState.state === 'ACTIVE') {
            console.log(`[Server] File is now ACTIVE and ready to use.`);
            const durationSeconds = (fileState.videoMetadata?.videoDuration as any)?.seconds;
            const duration = durationSeconds ? parseFloat(durationSeconds.toString()) : null;
            if (duration) {
                console.log(`[Server] Video duration found: ${duration} seconds.`);
            } else {
                console.warn(`[Server] Could not determine video duration from File API metadata.`);
            }
            return {
                fileData: {
                    mimeType: fileState.mimeType,
                    fileUri: fileState.uri,
                },
                duration,
            };
        } else if (fileState.state === 'FAILED') {
            console.error(`[Server] File processing failed for ${uploadResult.name}.`, fileState);
            throw new Error('File Processing Failed|The AI service failed to process the uploaded file. It might be corrupted or in an unsupported format.');
        }

        retryCount++;
        // Check every 1 second to be as responsive as possible
        await sleep(1000);
    }
    
    console.error(`[Server] File processing timed out after ${maxRetries} seconds for ${uploadResult.name}.`);
    try {
        await ai.files.delete({ name: uploadResult.name });
    } catch (deleteError) {
        console.error(`[Server] Failed to clean up timed-out file ${uploadResult.name}:`, deleteError);
    }
    
    throw new Error('Processing Timeout|File processing is taking too long and has timed out. This can happen with very large or complex files. Please try again with a smaller file.');
};


const urlToGenerativePart = async (url: string): Promise<GenerativePart> => {
    try {
        console.log(`[Server] Fetching content from URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Link Error|Failed to fetch from the provided URL (Status: ${response.status}). Please ensure you are using a direct, publicly accessible link to a video file.`);
        }
        const blob = await response.blob();
        const mimeType = blob.type;

        if (!mimeType.startsWith('video/') && !mimeType.startsWith('audio/')) {
            throw new Error(`Invalid File Type|The linked content is not a valid video or audio file. Found MIME type: ${mimeType}.`);
        }
        
        const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (!result || typeof result !== 'string' || !result.includes(',')) {
                     reject(new Error("Browser Memory Error|The browser failed to read the linked media, likely because the file is too large. Please try a direct upload of a smaller file."));
                     return;
                }
                const base64data = result.split(',')[1];
                if (base64data) {
                    resolve(base64data);
                } else {
                    reject(new Error("Browser Memory Error|Failed to extract media data from the provided link, likely because the file is too large for browser processing. Please download the file and use the 'Upload File' option."));
                }
            };
            reader.onerror = (error) => {
                 console.error("FileReader error on fetched content:", error);
                 reject(new Error("Browser Memory Error|A browser error occurred while processing the linked content, likely due to its size."));
            };
            reader.readAsDataURL(blob);
        });

        console.log(`[Server] Successfully fetched and encoded ${mimeType} content.`);
        return {
            inlineData: {
                mimeType,
                data,
            },
        };
    } catch (error) {
        console.error(`[Server] Error fetching URL content:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        if (errorMessage.includes('Failed to fetch')) {
             throw new Error(`Link Error|Could not fetch the video from the link due to a network or security (CORS) issue. Please ensure the link is direct and publicly accessible.`);
        }
        throw error;
    }
};

const subtitleSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING, description: 'The full text of the subtitle line.' },
            start: { type: Type.NUMBER, description: 'The start time of the subtitle in seconds.' },
            end: { type: Type.NUMBER, description: 'The end time of the subtitle in seconds.' },
            words: {
                type: Type.ARRAY,
                description: 'Optional word-level timestamps for the subtitle line. Omit if not applicable for the style.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        start: { type: Type.NUMBER },
                        end: { type: Type.NUMBER },
                    },
                    required: ['word', 'start', 'end']
                }
            }
        },
        required: ['text', 'start', 'end']
    }
};

const highlightSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'A short, catchy title for the viral clip.' },
            description: { type: Type.STRING, description: 'A brief reason why this moment is engaging.' },
            start: { type: Type.NUMBER, description: 'Start time in seconds.' },
            end: { type: Type.NUMBER, description: 'End time in seconds.' },
            viralityScore: { type: Type.NUMBER, description: 'A score from 1 to 100 indicating how likely this clip is to go viral on social media.' }
        },
        required: ['title', 'description', 'start', 'end', 'viralityScore']
    }
};

const handleApiError = (error: unknown): Error => {
    console.error('[Server] Gemini API call failed:', error);
    let structuredError = "AI Error|The AI service failed to process the video. Please try again later.";
    
    const errorMessage = (error instanceof Error) ? error.message : JSON.stringify(error);

    if (errorMessage.toLowerCase().includes('exceeds the maximum') || errorMessage.toLowerCase().includes('too long')) {
        structuredError = 'Video Too Long|The video is too long for the AI to process. Please use a shorter video (typically under 15 minutes).';
    } else if (errorMessage.includes('xhr error') || errorMessage.includes('500') || errorMessage.includes('FETCH_ERROR')) {
         structuredError = 'Network Error|A network error occurred. Please check your connection or try a smaller file.';
    } else if (errorMessage.includes('API_KEY_INVALID')) {
        structuredError = 'API Key Error|Your API key appears to be invalid.';
    } else if (errorMessage.toLowerCase().includes('quota')) {
        structuredError = 'Quota Exceeded|The API quota has been exceeded.';
    } else if (error instanceof Error && errorMessage.includes('|')) {
        structuredError = errorMessage;
    } else if (error instanceof Error) {
        structuredError = `Processing Error|${errorMessage}`;
    }
    
    return new Error(structuredError);
};


export const processVideoForSubtitles = async (options: SubtitleRequest): Promise<Subtitle[]> => {
  const { mediaFile, mediaUrl, targetLanguage, stylePreset } = options;
  console.log(`[Server] Processing for subtitles with preset: ${stylePreset}`);

  try {
      let mediaPart: GenerativePart;
      let videoDuration: number | null = null;
      
      if (mediaFile) {
          const result = await uploadFileToGemini(mediaFile);
          mediaPart = { fileData: result.fileData };
          videoDuration = result.duration;
      } else {
          mediaPart = await urlToGenerativePart(mediaUrl!);
      }

      let prompt: string;
      const languageInstruction = (targetLanguage && targetLanguage !== 'original')
          ? `Transcribe the spoken words in the provided file, and then translate the transcription into fluent ${targetLanguage}. The final subtitles must be in ${targetLanguage}.`
          : `Transcribe the spoken words in the provided file (which could be video or audio).`;

      const baseInstruction = `${languageInstruction} The subtitles should be concise and broken into logical lines. Ensure the timestamps (start and end) are sequential and do not overlap incorrectly. Provide the output as a JSON array that matches the specified schema.`;
      
      switch (stylePreset) {
        case StylePreset.TIKTOK:
            prompt = `${baseInstruction}
            STYLE INSTRUCTIONS:
            - Generate short, punchy, and engaging subtitle lines suitable for social media like TikTok.
            - Each subtitle object should represent a very short phrase or sentence.
            - CRITICALLY IMPORTANT: You MUST include accurate word-level timestamps.`;
            break;
        case StylePreset.KEYWORDS:
            prompt = `${baseInstruction}
            STYLE INSTRUCTIONS:
            - Identify the most important keywords or phrases in each subtitle line.
            - In the 'text' field, wrap these keywords with double asterisks. For example: "This is a **very important** message."
            - Do NOT include word-level timestamps; the 'words' array should be omitted for this style.`;
            break;
        case StylePreset.EMOJIS:
            prompt = `${baseInstruction}
            STYLE INSTRUCTIONS:
            - Analyze the sentiment and context of each subtitle line.
            - Append one or two relevant emojis to the end of the 'text' field for each line to add expressiveness.
            - Do NOT include word-level timestamps; the 'words' array should be omitted for this style.`;
            break;
        case StylePreset.STANDARD:
        default:
            prompt = `${baseInstruction}
            STYLE INSTRUCTIONS:
            - Generate standard, high-quality subtitles.
            - CRITICALLY IMPORTANT: You MUST include accurate word-level timestamps for every line.`;
            break;
      }

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }, mediaPart] }],
          config: {
              responseMimeType: 'application/json',
              responseSchema: subtitleSchema,
              thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for faster transcription
          }
      });

      const jsonText = response.text.trim();
      
      if (!jsonText.startsWith('[') || !jsonText.endsWith(']')) {
          throw new Error("AI Response Error|Failed to parse subtitles from the AI.");
      }

      const generatedSubtitles = JSON.parse(jsonText) as Subtitle[];
      
      if (videoDuration !== null && videoDuration > 0) {
           // Simple clamping logic
           const clamp = (value: number) => Math.min(value, videoDuration!);
           return generatedSubtitles.map((sub): Subtitle | null => {
               if (sub.start >= videoDuration!) return null;
               return {
                   ...sub,
                   end: clamp(sub.end),
                   start: Math.min(sub.start, clamp(sub.end)),
                   words: sub.words?.map(w => {
                       if (w.start >= videoDuration!) return null;
                       return { ...w, end: clamp(w.end), start: Math.min(w.start, clamp(w.end)) };
                   }).filter((w): w is Word => w !== null)
               };
           }).filter((sub): sub is Subtitle => sub !== null);
      }

      return generatedSubtitles;

  } catch (error) {
    throw handleApiError(error);
  }
};

export const generateVideoHighlights = async (options: SubtitleRequest): Promise<HighlightClip[]> => {
  const { mediaFile, mediaUrl } = options;
  console.log(`[Server] Processing for highlights`);

  try {
      let mediaPart: GenerativePart;
      let videoDuration: number | null = null;

      if (mediaFile) {
          const result = await uploadFileToGemini(mediaFile);
          mediaPart = { fileData: result.fileData };
          videoDuration = result.duration;
      } else {
          mediaPart = await urlToGenerativePart(mediaUrl!);
      }

      const prompt = `You are an expert video editor specializing in creating viral social media content (TikTok/Reels/Shorts). 
      Analyze the provided video and identify the 3 to 5 most engaging, funny, or important segments.
      
      For each segment:
      1. Provide a catchy, clickbait-style 'title'.
      2. Provide a brief 'description' explaining why this moment is good.
      3. Provide precise 'start' and 'end' timestamps (in seconds).
      4. Provide a 'viralityScore' from 1 to 100 (where 100 is extremely viral), based on humor, shock value, emotional hook, or relatability.
      
      The clips should be relatively short (15-60 seconds) and stand alone as interesting content.
      Return a JSON array matching the schema.`;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }, mediaPart] }],
          config: {
              responseMimeType: 'application/json',
              responseSchema: highlightSchema,
              thinkingConfig: { thinkingBudget: 1024 }, 
          }
      });

      const jsonText = response.text.trim();
      if (!jsonText.startsWith('[') || !jsonText.endsWith(']')) {
           throw new Error("AI Response Error|Failed to parse highlights from the AI.");
      }

      const clips = JSON.parse(jsonText) as HighlightClip[];
      return clips;
      
  } catch (error) {
      throw handleApiError(error);
  }
};
