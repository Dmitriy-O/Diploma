import React from 'react';

function Loader({ message, progress }) {
    return (
        <div className="flex flex-col items-center justify-center mt-6 space-y-2" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-400"></div>
            <span className="text-gray-300">{message || 'Обработка...'}</span>
            {progress !== null && (
                <div className="w-48 bg-gray-600 rounded-full h-2.5">
                    <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

export default Loader;