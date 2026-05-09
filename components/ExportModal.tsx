import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CloseIcon, DocumentTextIcon, ChatBubbleBottomCenterTextIcon } from './icons';
import type { SrtExportOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  exportOptions: SrtExportOptions;
  setExportOptions: Dispatch<SetStateAction<SrtExportOptions>>;
  isWordLevelAvailable: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  exportOptions,
  setExportOptions,
  isWordLevelAvailable,
}) => {
  if (!isOpen) return null;
  
  const handleNumericChange = (key: 'maxCharsPerLine' | 'maxLinesPerCard', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
       setExportOptions(prev => ({ ...prev, [key]: numValue }));
    }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
        onClick={onClose}
    >
      <div 
        className="ui-panel w-full max-w-md p-6 m-4 text-white relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-bold mb-2">SRT Export Options</h3>
        <p className="text-gray-400 mb-6">Choose the level of detail for your subtitle file.</p>
        
        <div className="flex flex-col gap-4">
          <div 
            onClick={() => setExportOptions(prev => ({...prev, type: 'lines'}))}
            className={`option-card ${exportOptions.type === 'lines' ? 'active' : ''}`}
          >
            <DocumentTextIcon className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
            <div className="text-left w-full">
                <h4 className="font-semibold">Standard Lines</h4>
                <p className="text-sm text-gray-400">Exports full subtitle lines. Compatible with most video players.</p>
                <div className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-2 transition-opacity ${exportOptions.type === 'lines' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div>
                        <label htmlFor="max-chars" className="text-xs text-gray-300 block mb-1">Max chars/line</label>
                        <input 
                            id="max-chars"
                            type="number"
                            value={exportOptions.maxCharsPerLine}
                            onChange={e => handleNumericChange('maxCharsPerLine', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="max-lines" className="text-xs text-gray-300 block mb-1">Max lines/card</label>
                        <input 
                            id="max-lines"
                            type="number"
                            value={exportOptions.maxLinesPerCard}
                            onChange={e => handleNumericChange('maxLinesPerCard', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>
          </div>
          <button
            onClick={() => {
                if (isWordLevelAvailable) {
                    setExportOptions(prev => ({...prev, type: 'words'}));
                }
            }}
            className={`option-card ${exportOptions.type === 'words' ? 'active' : ''} ${!isWordLevelAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isWordLevelAvailable}
            title={!isWordLevelAvailable ? "Word-level data is not available for the current subtitle preset." : "Export each word as a separate subtitle entry"}
          >
            <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-teal-400 flex-shrink-0" />
            <div className="text-left">
                <h4 className="font-semibold">Word-by-Word</h4>
                <p className="text-sm text-gray-400">Exports each word with its own timestamp. Useful for karaoke animations or detailed analysis.</p>
                {!isWordLevelAvailable && <p className="text-xs text-amber-400 mt-1">Not available for this preset.</p>}
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold">
            Confirm & Download
          </button>
        </div>
      </div>
      <style>{`
        .option-card {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            border: 2px solid var(--color-border);
            background-color: #1f2937; /* gray-800 */
            border-radius: 0.5rem;
            text-align: left;
            transition: all 0.2s;
            cursor: pointer;
        }
        .option-card:hover:not(:disabled) {
            border-color: var(--color-border-hover);
            background-color: #374151; /* gray-700 */
        }
        .option-card.active {
            border-color: var(--color-primary);
            background-color: rgba(79, 70, 229, 0.2);
        }
        .option-card:disabled:hover {
             border-color: var(--color-border);
             background-color: #1f2937;
        }
      `}</style>
    </div>
  );
};

export default ExportModal;