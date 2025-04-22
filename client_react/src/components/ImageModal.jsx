import React, { useEffect } from 'react';
import { X } from 'lucide-react';

function ImageModal({ src, alt, isOpen, onClose }) {
    useEffect(() => {
        const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
        if (isOpen) { document.addEventListener('keydown', handleEscape); }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={alt || 'Увеличенное изображение'}
        >
            <div
                className="relative max-w-5xl w-auto max-h-[90vh] overflow-hidden bg-gray-800 p-2 rounded-lg shadow-2xl border border-gray-600"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    id="modal-image"
                    src={src}
                    alt={alt || 'Увеличенное изображение'}
                    className="block max-w-full max-h-[calc(90vh-4rem)] object-contain rounded"
                />
                <button
                    id="modal-close"
                    onClick={onClose}
                    className="absolute top-2 right-2 bg-gray-700/80 hover:bg-gray-600/90 text-white p-2 rounded-full shadow-lg transition-all duration-300"
                    aria-label="Закрыть"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}

export default ImageModal;