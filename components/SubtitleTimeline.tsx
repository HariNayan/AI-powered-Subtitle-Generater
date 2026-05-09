
import React, { useState, useRef, useEffect } from 'react';
import type { Subtitle } from '../types';
import { PlusSmallIcon, MinusSmallIcon, ClockIcon } from './icons';

interface SubtitleTimelineProps {
  subtitles: Subtitle[];
  onUpdateSubtitle: (index: number, updates: Partial<Subtitle>) => void;
}

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        seconds = 0;
    }
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secs}.${ms}`;
};

// Parses HH:MM:SS.mmm to seconds
const parseTime = (timeStr: string): number | null => {
    const regex = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;
    const match = timeStr.match(regex);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

const SubtitleTimeline: React.FC<SubtitleTimelineProps> = ({ subtitles, onUpdateSubtitle }) => {
    const [textEditingIndex, setTextEditingIndex] = useState<number | null>(null);
    const [timeEditingIndex, setTimeEditingIndex] = useState<number | null>(null);
    
    const [editText, setEditText] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Scroll into view when editing starts
    useEffect(() => {
        const targetIndex = textEditingIndex ?? timeEditingIndex;
        if (targetIndex !== null) {
            const currentItemRef = itemRefs.current[targetIndex];
            if (currentItemRef) {
                currentItemRef.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }
        if (textEditingIndex !== null && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [textEditingIndex, timeEditingIndex]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [editText, textEditingIndex]);

    // --- Text Editing Handlers ---
    const handleTextEditStart = (index: number, text: string) => {
        setTimeEditingIndex(null); // Close time editor if open
        setTextEditingIndex(index);
        setEditText(text);
    };

    const handleTextSave = (index: number) => {
        if (editText.trim() && editText.trim() !== subtitles[index].text) {
            onUpdateSubtitle(index, { text: editText.trim() });
        }
        setTextEditingIndex(null);
    };

    const handleTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleTextSave(index);
        }
        if (event.key === 'Escape') {
            setTextEditingIndex(null);
        }
    };

    // --- Time Editing Handlers ---
    const handleTimeEditStart = (index: number, sub: Subtitle) => {
        setTextEditingIndex(null); // Close text editor if open
        setTimeEditingIndex(index);
        setEditStartTime(formatTime(sub.start));
        setEditEndTime(formatTime(sub.end));
    };

    const handleTimeSave = (index: number) => {
        const start = parseTime(editStartTime);
        const end = parseTime(editEndTime);

        if (start !== null && end !== null) {
            onUpdateSubtitle(index, { start, end });
        }
        setTimeEditingIndex(null);
    };
    
    const adjustTime = (type: 'start' | 'end', amount: number) => {
        if (type === 'start') {
            const current = parseTime(editStartTime);
            if (current !== null) setEditStartTime(formatTime(Math.max(0, current + amount)));
        } else {
            const current = parseTime(editEndTime);
            if (current !== null) setEditEndTime(formatTime(Math.max(0, current + amount)));
        }
    };

    const filteredSubtitles = subtitles.map((sub, index) => ({ sub, index })).filter(
        item => item.sub.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="sticky top-0 z-10 bg-[#111827] pb-2 pt-1">
                 <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search subtitles..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {filteredSubtitles.length} matches
                         </span>
                    )}
                 </div>
            </div>

            <div className="flex flex-col gap-3">
                {filteredSubtitles.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-sm">
                        No subtitles found matching "{searchQuery}"
                    </div>
                ) : (
                    filteredSubtitles.map(({ sub, index }) => (
                        <div 
                            key={`${index}-${sub.start}`} 
                            ref={el => { itemRefs.current[index] = el; }}
                            className={`group p-3 rounded-lg flex flex-col gap-2 text-sm transition-all duration-200 border ${
                                textEditingIndex === index || timeEditingIndex === index
                                    ? 'bg-gray-800 border-indigo-500 shadow-lg'
                                    : 'bg-gray-800/60 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                            }`}
                        >
                            {/* Timeline Row */}
                            <div className="flex gap-4 w-full">
                                {/* Time Badge / Editor */}
                                {timeEditingIndex === index ? (
                                     <div className="w-full bg-black/40 p-3 rounded-lg border border-indigo-500/50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-xs text-indigo-300 mb-1 block font-semibold">Start Time</label>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => adjustTime('start', -0.1)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><MinusSmallIcon className="w-4 h-4"/></button>
                                                    <input 
                                                        type="text" 
                                                        value={editStartTime} 
                                                        onChange={e => setEditStartTime(e.target.value)}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-center font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    <button onClick={() => adjustTime('start', 0.1)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><PlusSmallIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-indigo-300 mb-1 block font-semibold">End Time</label>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => adjustTime('end', -0.1)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><MinusSmallIcon className="w-4 h-4"/></button>
                                                    <input 
                                                        type="text" 
                                                        value={editEndTime} 
                                                        onChange={e => setEditEndTime(e.target.value)}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-center font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    <button onClick={() => adjustTime('end', 0.1)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><PlusSmallIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setTimeEditingIndex(null)} className="text-xs px-3 py-1 rounded hover:bg-gray-700 text-gray-400">Cancel</button>
                                            <button onClick={() => handleTimeSave(index)} className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium">Save Changes</button>
                                        </div>
                                     </div>
                                ) : (
                                    <button 
                                        onClick={() => handleTimeEditStart(index, sub)}
                                        className="font-mono text-xs text-indigo-300/80 flex flex-col justify-center items-center flex-shrink-0 w-28 bg-black/30 rounded-md py-2 transition-colors hover:bg-indigo-900/20 hover:text-indigo-200 border border-transparent hover:border-indigo-500/30 group-hover:bg-black/50"
                                        title="Click to fine-tune timing"
                                    >
                                        <span>{formatTime(sub.start)}</span>
                                        <ClockIcon className='w-3 h-3 my-0.5 opacity-50' />
                                        <span>{formatTime(sub.end)}</span>
                                    </button>
                                )}

                                {/* Text Display / Editor */}
                                {!timeEditingIndex && (
                                    <div className="flex-grow min-w-0 py-1">
                                        {textEditingIndex === index ? (
                                            <div>
                                                <textarea
                                                    ref={textareaRef}
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    onBlur={() => handleTextSave(index)}
                                                    onKeyDown={(e) => handleTextKeyDown(e, index)}
                                                    className="w-full bg-gray-900 text-white p-2 rounded-md resize-none border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 overflow-hidden"
                                                    rows={1}
                                                    autoFocus
                                                />
                                                <p className="text-[10px] text-amber-500/80 mt-1 px-1 flex items-center gap-1">
                                                    ⚠ Editing text disables karaoke animation for this line.
                                                </p>
                                            </div>
                                        ) : (
                                            <p 
                                                onClick={() => handleTextEditStart(index, sub.text)}
                                                className="cursor-pointer text-gray-300 p-2 rounded-md h-full flex items-center hover:bg-gray-700/50 transition-colors"
                                                title="Click to edit text"
                                            >
                                                {sub.text}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SubtitleTimeline;
