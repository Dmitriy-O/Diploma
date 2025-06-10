import React from 'react';
import { X } from 'lucide-react';

export default function ImageModal({ isOpen, src, alt, onClose }) {
    if (!isOpen || !src) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Модальне вікно із зображенням"
        >
            <div
                className="relative bg-gray-800/90 rounded-2xl shadow-2xl border border-gray-700 max-w-[90vw] max-h-[90vh] flex flex-col items-center p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-center w-full h-full overflow-auto">
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        loading="lazy"
                    />
                </div>
                <p className="text-gray-300 text-sm mt-4">{alt}</p>
                <button
                    onClick={onClose}
                    className="mt-4 flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Закрити модальне вікно"
                >
                    <X size={18} />
                    <span>Закрити</span>
                </button>
            </div>
        </div>
    );
}