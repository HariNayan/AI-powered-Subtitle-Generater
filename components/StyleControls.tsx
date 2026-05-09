import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { StyleOptions } from '../types';
import { Font, Position, Animation, EffectType, TextCase } from '../types';
import { NoColorIcon } from './icons';

interface StyleControlsProps {
  options: StyleOptions;
  setOptions: Dispatch<SetStateAction<StyleOptions>>;
  isWordAnimationAvailable: boolean;
}

interface ControlGroupProps {
  label: string;
  children: React.ReactNode;
}

const ControlGroup: React.FC<ControlGroupProps> = ({ label, children }) => (
  <fieldset className="border border-gray-700 rounded-lg p-4">
    <legend className="text-sm font-semibold text-gray-300 px-2">{label}</legend>
    {children}
  </fieldset>
);

const fontOptions = [
  { name: 'Modern (Poppins)', value: Font.MODERN },
  { name: 'Sans Serif (Inter)', value: Font.SANS },
  { name: 'Geometric (Montserrat)', value: Font.GEOMETRIC },
  { name: 'Rounded (Lato)', value: Font.ROUNDED },
  { name: 'Condensed (Oswald)', value: Font.CONDENSED },
  { name: 'Serif (Merriweather)', value: Font.SERIF },
  { name: 'Monospace (Roboto Mono)', value: Font.MONO },
  { name: 'Script (Lobster)', value: Font.SCRIPT },
];

const StyleControls: React.FC<StyleControlsProps> = ({ options, setOptions, isWordAnimationAvailable }) => {
  const handleStyleChange = <K extends keyof StyleOptions>(key: K, value: StyleOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleNestedChange = <T extends 'strokeOptions' | 'shadowOptions', K extends keyof StyleOptions[T]>(
    group: T, key: K, value: StyleOptions[T][K]
  ) => {
    setOptions(prev => ({
        ...prev,
        [group]: { ...prev[group], [key]: value }
    }));
  };
  
  const isBgTransparent = options.backgroundOpacity === 0;

  const getValidHex = (color: string) => {
    if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
        return color;
    }
    // Check if it's an rgba string and convert to hex (ignoring alpha)
    if (color.startsWith('rgba')) {
        const parts = color.substring(color.indexOf('(') + 1, color.indexOf(')')).split(',').map(s => parseInt(s.trim(), 10));
        return `#${parts[0].toString(16).padStart(2, '0')}${parts[1].toString(16).padStart(2, '0')}${parts[2].toString(16).padStart(2, '0')}`;
    }
    return '#000000'; // Fallback
  };

  return (
    <div className="space-y-4">
      {/* --- FONT STYLE --- */}
      <ControlGroup label="Font Style">
        <div className="flex flex-col gap-4">
          <select 
              value={options.font} 
              onChange={e => handleStyleChange('font', e.target.value as Font)}
              className="font-select"
          >
            {fontOptions.map(font => (
              <option key={font.name} value={font.value} style={{ fontFamily: font.value, fontSize: '1.25rem' }}>
                {font.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleStyleChange('isBold', !options.isBold)} className={`control-button ${options.isBold ? 'active' : ''}`}>Bold</button>
            <button onClick={() => handleStyleChange('isItalic', !options.isItalic)} className={`control-button ${options.isItalic ? 'active' : ''}`}>Italic</button>
          </div>
           <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleStyleChange('textCase', TextCase.NORMAL)} className={`control-button ${options.textCase === TextCase.NORMAL ? 'active' : ''}`}>Normal</button>
            <button onClick={() => handleStyleChange('textCase', TextCase.UPPERCASE)} className={`control-button ${options.textCase === TextCase.UPPERCASE ? 'active' : ''}`}>UPPERCASE</button>
          </div>
        </div>
      </ControlGroup>
      
      {/* --- SIZE & SPACING --- */}
      <ControlGroup label="Size & Spacing">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Size (Zoom)</label>
            <div className="flex items-center gap-4">
                <input 
                    type="range" min="0.5" max="12" step="0.1" value={options.fontSize} 
                    onChange={e => handleStyleChange('fontSize', parseFloat(e.target.value))}
                    className="w-full"
                />
                <div className="relative">
                    <input 
                        type="number" min="0.5" max="12" step="0.1" value={options.fontSize}
                        onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) handleStyleChange('fontSize', val);
                        }}
                        className="w-24 bg-gray-800 border border-gray-600 rounded-md py-1.5 pl-3 pr-8 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">rem</span>
                </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Letter Spacing</label>
            <div className="flex items-center gap-3">
              <input 
                  type="range" min="-0.05" max="0.2" step="0.005" value={options.letterSpacing} 
                  onChange={e => handleStyleChange('letterSpacing', parseFloat(e.target.value))}
                  className="w-full"
              />
              <span className="text-sm text-gray-300 w-16 text-center bg-gray-800 border border-gray-600 rounded-md py-1">{options.letterSpacing.toFixed(3)}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Line Height</label>
            <div className="flex items-center gap-3">
              <input 
                  type="range" min="0.8" max="2" step="0.05" value={options.lineHeight} 
                  onChange={e => handleStyleChange('lineHeight', parseFloat(e.target.value))}
                  className="w-full"
              />
              <span className="text-sm text-gray-300 w-16 text-center bg-gray-800 border border-gray-600 rounded-md py-1">{options.lineHeight.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </ControlGroup>

      {/* --- COLORS --- */}
      <ControlGroup label="Colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Text</label>
            <div className="color-input-wrapper" style={{ backgroundColor: options.textColor }}>
              <input type="color" value={options.textColor} onChange={e => handleStyleChange('textColor', e.target.value)} className="color-input" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Highlight</label>
            <div className="color-input-wrapper" style={{ backgroundColor: options.highlightColor }}>
              <input type="color" value={options.highlightColor} onChange={e => handleStyleChange('highlightColor', e.target.value)} className="color-input" />
            </div>
          </div>
        </div>
        <div className="mt-4">
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Background</label>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => handleStyleChange('backgroundOpacity', isBgTransparent ? 0.5 : 0)} 
                    className={`flex-shrink-0 w-10 h-10 rounded-md border-2 transition-colors ${isBgTransparent ? 'bg-transparent checkerboard-bg border-gray-500 hover:border-gray-400' : 'border-transparent'}`}
                    style={{ backgroundColor: isBgTransparent ? undefined : options.backgroundColor }}
                    title={isBgTransparent ? "Enable background" : "Disable background"}
                >
                    {isBgTransparent && <NoColorIcon className="w-6 h-6 m-auto text-gray-400" />}
                </button>
                <div className="color-input-wrapper" style={{ backgroundColor: options.backgroundColor, opacity: isBgTransparent ? 0.3 : 1 }}>
                    <input type="color" value={getValidHex(options.backgroundColor)} onChange={e => handleStyleChange('backgroundColor', e.target.value)} className="color-input" disabled={isBgTransparent} />
                </div>
            </div>
        </div>
        <div className="mt-3">
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Background Opacity</label>
            <input 
                type="range" min="0" max="1" step="0.01" value={options.backgroundOpacity} 
                onChange={e => handleStyleChange('backgroundOpacity', parseFloat(e.target.value))}
                className="w-full"
            />
        </div>
      </ControlGroup>

      {/* --- EFFECTS --- */}
      <ControlGroup label="Effects">
        <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={() => handleStyleChange('effect', EffectType.NONE)} className={`control-button ${options.effect === EffectType.NONE ? 'active' : ''}`}>None</button>
            <button onClick={() => handleStyleChange('effect', EffectType.SHADOW)} className={`control-button ${options.effect === EffectType.SHADOW ? 'active' : ''}`}>Shadow</button>
            <button onClick={() => handleStyleChange('effect', EffectType.OUTLINE)} className={`control-button ${options.effect === EffectType.OUTLINE ? 'active' : ''}`}>Outline</button>
        </div>
        {options.effect === EffectType.SHADOW && (
          <div className="space-y-3 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 w-16">Color</label>
              <div className="color-input-wrapper h-8" style={{ backgroundColor: options.shadowOptions.color }}>
                <input type="color" value={getValidHex(options.shadowOptions.color)} onChange={e => handleNestedChange('shadowOptions', 'color', e.target.value)} className="color-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-medium text-gray-400 block mb-1">Blur</label>
                    <input type="range" min="0" max="20" step="1" value={options.shadowOptions.blur} onChange={e => handleNestedChange('shadowOptions', 'blur', parseFloat(e.target.value))} />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-400 block mb-1">X Offset</label>
                    <input type="range" min="-10" max="10" step="1" value={options.shadowOptions.offsetX} onChange={e => handleNestedChange('shadowOptions', 'offsetX', parseFloat(e.target.value))} />
                </div>
                 <div>
                    <label className="text-xs font-medium text-gray-400 block mb-1">Y Offset</label>
                    <input type="range" min="-10" max="10" step="1" value={options.shadowOptions.offsetY} onChange={e => handleNestedChange('shadowOptions', 'offsetY', parseFloat(e.target.value))} />
                </div>
            </div>
          </div>
        )}
        {options.effect === EffectType.OUTLINE && (
            <div className="space-y-3 pt-2 border-t border-gray-700">
                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400 w-16">Color</label>
                    <div className="color-input-wrapper h-8" style={{ backgroundColor: options.strokeOptions.color }}>
                        <input type="color" value={getValidHex(options.strokeOptions.color)} onChange={e => handleNestedChange('strokeOptions', 'color', e.target.value)} className="color-input" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-400 block mb-1">Thickness</label>
                    <input type="range" min="0" max="5" step="0.5" value={options.strokeOptions.width} onChange={e => handleNestedChange('strokeOptions', 'width', parseFloat(e.target.value))} />
                </div>
            </div>
        )}
      </ControlGroup>

      {/* --- POSITION & ANIMATION --- */}
      <ControlGroup label="Position & Animation">
          <div className="space-y-4">
              <div>
                  <label className="text-xs font-medium text-gray-400 block mb-2">Position</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-gray-800 rounded-lg">
                      {[
                          Position.TOP_LEFT, Position.TOP_CENTER, Position.TOP_RIGHT,
                          Position.MIDDLE_LEFT, Position.MIDDLE_CENTER, Position.MIDDLE_RIGHT,
                          Position.BOTTOM_LEFT, Position.BOTTOM_CENTER, Position.BOTTOM_RIGHT
                      ].map(pos => (
                          <button
                              key={pos}
                              onClick={() => handleStyleChange('position', pos)}
                              className={`flex items-center justify-center h-10 rounded-md transition-colors ${options.position === pos ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                              title={pos.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                              aria-label={`Set position to ${pos.replace('_', ' ')}`}
                          >
                              <div className={`w-3 h-3 rounded-full transition-colors ${options.position === pos ? 'bg-white' : 'bg-gray-500'}`} />
                          </button>
                      ))}
                  </div>
              </div>
              <div>
                  <label className="text-xs font-medium text-gray-400 block mb-2">Animation</label>
                  <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleStyleChange('animation', Animation.NONE)} className={`control-button ${options.animation === Animation.NONE ? 'active' : ''}`}>None</button>
                      <button onClick={() => handleStyleChange('animation', Animation.KARAOKE)} className={`control-button ${options.animation === Animation.KARAOKE ? 'active' : ''}`}>Karaoke</button>
                      <button 
                        onClick={() => handleStyleChange('animation', Animation.WORD)} 
                        className={`control-button ${options.animation === Animation.WORD ? 'active' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                        disabled={!isWordAnimationAvailable}
                        title={!isWordAnimationAvailable ? "Requires a preset with word-level data (e.g., Standard, TikTok)." : ""}
                      >
                        Word
                      </button>
                  </div>
              </div>
          </div>
      </ControlGroup>
    </div>
  );
};

export default StyleControls;