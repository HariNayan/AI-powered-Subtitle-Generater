# AI Video Subtitle Generator

An AI-powered web tool that automatically transcribes videos, generates styled subtitles (optimized for platforms like TikTok/Reels), and automatically extracts the best highlight clips from your content using the Gemini 2.5 API.

## Features

- **Auto-Transcription**: Leverage Gemini 2.5 Flash to automatically transcribe audio and video files. 
- **Auto-Translation**: Translate spoken words into your target language on-the-fly.
- **Dynamic Styling**: Pick from multiple high-converting presets (TikTok, Minimalist, Bold Outline) to make your subtitles pop.
- **Keyword Highlights & Emojis**: Automatically emphasize key words or inject relevant emojis into the transcript.
- **Viral Highlight Extraction**: Automatically analyze videos to find the best 15-60 second clips, ranked by "Virality Score", so you can easily repurpose content for TikTok, Youtube Shorts, or Instagram Reels.
- **Client-Side Exporting**: Burn subtitles into the video or export them as standard `.srt` / `.vtt` files instantly.

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **AI Integration**: [Google Gen AI SDK](https://github.com/google/genai-js) + **Gemini 2.5 Flash**

## Getting Started

1. Clone the repository and install the dependencies.
   ```bash
   npm install
   ```
2. Create a `.env.local` file at the root of the project and add your Gemini API Key.
   ```env
   GEMINI_API_KEY=your-api-key
   ```
3. Run the development server.
   ```bash
   npm run dev
   ```

## Production Build

To build the tool for production, simply run:
```bash
npm run build
```
This command bundles your application for production deployment, taking full advantage of code-splitting (using React Lazy loading) and optimized Vite bundling.

## Performance Optimization

- Heavy components (`SubtitleEditor`, `HighlightViewer`) are lazily loaded to drastically improve the initial Time To Interactive (TTI).
- Tailwind CSS is statically compiled.
- Uses direct API streaming when possible and chunks interactions to prevent browser main-thread freezes.
