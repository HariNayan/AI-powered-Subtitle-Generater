
export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  EDITING = 'EDITING',
  HIGHLIGHTS = 'HIGHLIGHTS',
}

export type AppMode = 'subtitles' | 'highlights';

export enum StylePreset {
  STANDARD = 'STANDARD',
  TIKTOK = 'TIKTOK',
  KEYWORDS = 'KEYWORDS',
  EMOJIS = 'EMOJIS',
  MINIMALIST = 'MINIMALIST',
  BOLD_OUTLINE = 'BOLD_OUTLINE',
  POP_3D = 'POP_3D',
}

export enum Font {
  SANS = "'Inter', sans-serif",
  SERIF = "'Merriweather', serif",
  MODERN = "'Poppins', sans-serif",
  MONO = "'Roboto Mono', monospace",
  SCRIPT = "'Lobster', cursive",
  CONDENSED = "'Oswald', sans-serif",
  GEOMETRIC = "'Montserrat', sans-serif",
  ROUNDED = "'Lato', sans-serif",
}

export enum Position {
  TOP_LEFT = 'items-start justify-start',
  TOP_CENTER = 'items-start justify-center',
  TOP_RIGHT = 'items-start justify-end',
  MIDDLE_LEFT = 'items-center justify-start',
  MIDDLE_CENTER = 'items-center justify-center',
  MIDDLE_RIGHT = 'items-center justify-end',
  BOTTOM_LEFT = 'items-end justify-start',
  BOTTOM_CENTER = 'items-end justify-center',
  BOTTOM_RIGHT = 'items-end justify-end',
}

export enum Animation {
  NONE = 'NONE',
  KARAOKE = 'KARAOKE',
  WORD = 'WORD',
}

export enum EffectType {
  NONE = 'NONE',
  SHADOW = 'SHADOW',
  OUTLINE = 'OUTLINE',
}

export enum TextCase {
  NORMAL = 'none',
  UPPERCASE = 'uppercase',
}

export interface StyleOptions {
  font: Font;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  textCase: TextCase;
  
  // Spacing
  letterSpacing: number;
  lineHeight: number;

  // Colors
  textColor: string;
  backgroundColor: string; // Stored as HEX
  backgroundOpacity: number; // Range 0-1
  highlightColor: string;
  
  // Effects
  effect: EffectType;
  strokeOptions: {
    color: string;
    width: number;
  };
  shadowOptions: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  
  // Position & Animation
  position: Position;
  animation: Animation;
}

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface Subtitle {
  text: string;
  start: number;
  end: number;
  words?: Word[];
}

export interface SrtExportOptions {
  type: 'lines' | 'words';
  maxCharsPerLine: number;
  maxLinesPerCard: number;
}

export interface HighlightClip {
  title: string;
  description: string;
  start: number;
  end: number;
  viralityScore: number;
}
