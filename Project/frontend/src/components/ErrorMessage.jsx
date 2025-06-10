import React from 'react';
import { X } from 'lucide-react';

function ErrorMessage({ message, details, onClose }) {
    if (!message) return null;
    return (
        <div className="mt-6 p-4 md:p-6 bg-red-900 bg-opacity-80 border border-red-700 text-red-200 rounded-xl backdrop-blur-sm relative shadow-lg">
            <p className="font-semibold">{message}</p>
            {details && <p className="text-sm mt-2 break-words">{details}</p>}
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-red-300 hover:text-red-100 p-1 rounded-full hover:bg-red-800/50 transition-colors"
                aria-label="Закрити помилку"
            >
                <X size={20} />
            </button>
        </div>
    );
}

export default ErrorMessage;