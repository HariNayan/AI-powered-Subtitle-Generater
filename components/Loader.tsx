
import React from 'react';

interface LoaderProps {
  message: string;
  progress: number;
}

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  const displayProgress = Math.round(progress);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 ui-panel w-full max-w-lg">
      <svg
        className="animate-spin h-12 w-12 text-indigo-400 mb-6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <h2 className="text-xl font-semibold text-white">{message}</h2>
      <p className="text-gray-400 mt-2 max-w-sm">The AI is working its magic. Please keep this tab open. Larger files may take a bit longer.</p>

      <div className="w-full mt-8">
        <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${displayProgress}%` }}
            role="progressbar"
            aria-valuenow={displayProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>
        <p className="text-right text-sm text-gray-300 mt-2 font-mono tracking-wider">
          {displayProgress}%
        </p>
      </div>
    </div>
  );
};

export default Loader;