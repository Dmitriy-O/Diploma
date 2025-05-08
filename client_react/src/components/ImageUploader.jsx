import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

// Підтримуємо лише PNG
const SUPPORTED_IMAGE_TYPES = ['image/png'];

function ImageUploader({ onFileSelect, selectedFileName, maxFileSizeMB }) {
    const [dragOver, setDragOver] = useState(false);
    const [progress, setProgress] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        console.log('File selected via input:', file);
        if (file) {
            readFile(file, onFileSelect);
        }
        event.target.value = '';
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragOver(false);
        const file = event.dataTransfer.files?.[0];
        console.log('File dropped:', file);
        if (file) {
            readFile(file, onFileSelect);
        }
    };

    const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
    const handleDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); setDragOver(true); };
    const handleDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); setDragOver(false); };

    const readFile = (file, callback) => {
        const reader = new FileReader();

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                setProgress(percent);
            }
        };

        reader.onload = () => {
            console.log('File read successfully:', file.name);
            setProgress(null);
            callback(file);
        };

        reader.onerror = () => {
            console.error('File read error:', file.name);
            setProgress(null);
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col items-center">
            <label
                htmlFor="file-upload-input"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-300 ease-in-out flex flex-col items-center justify-center space-y-2 h-36 ${dragOver ? 'border-indigo-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'}`}
            >
                {progress !== null ? (
                    <div className="w-full">
                        <div className="bg-gray-600 rounded-full h-2.5">
                            <div
                                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-300 mt-2">
                            Завантаження: {progress.toFixed(0)}%
                        </span>
                    </div>
                ) : (
                    <>
                        <Upload className={`h-8 w-8 mb-2 transition-colors ${dragOver ? 'text-indigo-400' : 'text-gray-400'}`} aria-hidden="true" />
                        <span className="text-sm font-medium text-gray-300">
                            {selectedFileName || 'Перетягніть або оберіть файл'}
                        </span>
                        <span className="text-xs text-gray-500">
                            PNG (макс. {maxFileSizeMB}MB)
                        </span>
                    </>
                )}
            </label>
            <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept={SUPPORTED_IMAGE_TYPES.join(',')}
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}

export default ImageUploader;