# AI Video Subtitle Generator 🎬🤖

An AI-powered web application that allows creators to automatically generate, style, and export captions for their videos. Built with React, TypeScript, and Google's Gemini API, this tool turns raw videos into engaging, social-media-ready content in minutes.

## ✨ Features

- **🤖 AI-Powered Subtitles**: Highly accurate, automatic caption generation using the Gemini AI model.
- **🎨 Advanced Customization**: Fully customize your captions with adjustable fonts, sizing, colors, strokes, and drop shadows to match your brand.
- **🪄 1-Click Style Presets**: Instantly apply popular caption styles like *TikTok*, *Minimalist*, *Bold Outline*, and *Pop 3D*.
- **⚡ Dynamic Animations**: Keep viewers engaged with word-by-word reveals and karaoke-style text tracking.
- **✂️ Auto-Highlights**: AI intelligently analyzes your video to generate the most engaging highlight clips.
- **💾 Flexible Export**: Download your finished subtitles in standard `.SRT` or `.VTT` formats to use in any video editor (Premiere, Final Cut, CapCut, etc.).

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Deployment:** [Your deployment platform, e.g., Vercel / Netlify / Cloud Run]

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-subtitle-generator.git
   cd ai-subtitle-generator
Install dependencies:
code
Bash
npm install
Set up environment variables:
Create a .env file in the root directory and add your Gemini API Key:
code
Env
GEMINI_API_KEY=your_api_key_here
Start the development server:
code
Bash
npm run dev
Open your browser and navigate to http://localhost:3000.
💡 How to Use
Upload: Drag and drop your video file into the upload zone.
Process: Wait a few moments while the AI analyzes the audio and generates the transcript.
Customize: Use the style editor to change fonts, colors, and animations, or pick a pre-made preset.
Export: Download the .SRT or .VTT file and import it into your favorite video editing software!
