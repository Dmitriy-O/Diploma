import React, { useState } from 'react';
import { Download, Eye, Image as ImageIcon, BarChartHorizontal } from 'lucide-react';

function ResultCard({ method, data, onImageClick, onDownloadClick }) {
    const [viewMode, setViewMode] = useState('upscaled');

    if (!data || !data.upscaled_image_base64 || !data.diff_image_base64 || !data.hist_base64 || !data.upscaled_shape) {
        return (
            <div className="text-center result-card border border-red-500 p-4 rounded-lg bg-gray-700/80 backdrop-blur-sm shadow-lg">
                <h4 className="text-md font-semibold text-red-400 mb-2">{method.charAt(0).toUpperCase() + method.slice(1)}</h4>
                <p className="text-red-400 text-sm">Помилка: Неповні дані</p>
            </div>
        );
    }

    const displayPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? "∞" : (typeof data.psnr === 'number' ? data.psnr.toFixed(2) : 'Н/Д');
    const displaySsim = (typeof data.ssim === 'number') ? data.ssim.toFixed(3) : 'Н/Д';
    const displayMse = (typeof data.mse === 'number') ? data.mse.toFixed(2) : 'Н/Д';
    const displayGradientDiff = (typeof data.gradient_diff === 'number') ? data.gradient_diff.toFixed(2) : 'Н/Д';
    const shape = data.upscaled_shape;
    const processingTime = data.processing_time ? `${data.processing_time.toFixed(2)} сек` : 'Н/Д';

    const handleDownload = (e, imageSrc) => {
        e.stopPropagation();
        onDownloadClick(method, imageSrc || data.upscaled_image_base64);
    };

    const getImageSrc = () => {
        switch (viewMode) {
            case 'diff': return data.diff_image_base64;
            case 'hist': return data.hist_base64;
            case 'upscaled':
            default: return data.upscaled_image_base64;
        }
    };

    const getImageAlt = () => {
        switch (viewMode) {
            case 'diff': return `Різниця (${method})`;
            case 'hist': return `Гістограма помилок (${method})`;
            case 'upscaled':
            default: return `Збільшене (${method})`;
        }
    };

    const images = [
        { src: data.upscaled_image_base64, alt: `Збільшене (${method})`, label: 'Рез.' },
        { src: data.diff_image_base64, alt: `Різниця (${method})`, label: 'Різн.' },
        { src: data.hist_base64, alt: `Гістограма помилок (${method})`, label: 'Гіст.' },
    ];

    return (
        <div className="text-center result-card bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-600 flex flex-col h-full transition-shadow hover:shadow-indigo-500/20">
            <h4 className="text-lg font-semibold text-gray-100 mb-3">{method.charAt(0).toUpperCase() + method.slice(1)}</h4>
            {viewMode === 'all' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    {images.map((image, index) => (
                        <div key={index} className="relative group">
                            <div
                                className="w-full h-48 bg-gray-600 rounded-lg flex items-center justify-center border border-gray-500 overflow-hidden cursor-pointer"
                                onClick={() => {
                                    console.log(`Opening modal for ${image.alt}, src: ${image.src}`);
                                    onImageClick(image.src, image.alt);
                                }}
                            >
                                <img
                                    src={image.src}
                                    alt={image.alt}
                                    className="max-h-full max-w-full object-contain"
                                    loading="lazy"
                                />
                                <button
                                    onClick={(e) => handleDownload(e, image.src)}
                                    className="download-button absolute top-1 right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                                    title={`Завантажити ${image.label}`}
                                    aria-label={`Завантажити ${image.label} (${method})`}
                                >
                                    <Download size={14} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{image.label}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="flex-grow w-full h-64 md:h-72 bg-gray-600 rounded-lg flex items-center justify-center border border-gray-500 overflow-hidden relative group cursor-pointer mb-3 image-container"
                    onClick={() => {
                        console.log(`Opening modal for ${getImageAlt()}, src: ${getImageSrc()}`);
                        onImageClick(getImageSrc(), getImageAlt());
                    }}
                >
                    <img
                        src={getImageSrc()}
                        alt={getImageAlt()}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                    />
                    <button
                        onClick={(e) => handleDownload(e)}
                        className="download-button absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                        title="Завантажити результат"
                        aria-label={`Завантажити результат ${method}`}
                    >
                        <Download size={18} />
                    </button>
                </div>
            )}
            <div className="flex justify-center space-x-2 mb-3 flex-wrap gap-2">
                <button
                    onClick={() => setViewMode('upscaled')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'upscaled' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                    title="Показати результат"
                >
                    <ImageIcon size={14} className="inline mr-1"/> Рез.
                </button>
                <button
                    onClick={() => setViewMode('diff')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'diff' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                    title="Показати різницю"
                >
                    <Eye size={14} className="inline mr-1"/> Різн.
                </button>
                <button
                    onClick={() => setViewMode('hist')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'hist' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                    title="Показати гістограму помилок"
                >
                    <BarChartHorizontal size={14} className="inline mr-1"/> Гіст.
                </button>
                <button
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'all' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                    title="Показати всі результати"
                >
                    <Eye size={14} className="inline mr-1"/> Усі
                </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1 mt-auto">
                <p>Новий розмір: {shape[0]} x {shape[1]} пікселів</p>
                <p>
                    <span title="Peak Signal-to-Noise Ratio" className="cursor-help">PSNR:</span>{' '}
                    <span className="font-medium text-gray-200">{displayPsnr}</span> дБ |{' '}
                    <span title="Structural Similarity Index Measure" className="cursor-help">SSIM:</span>{' '}
                    <span className="font-medium text-gray-200">{displaySsim}</span>
                </p>
                <p>
                    <span title="Mean Squared Error" className="cursor-help">MSE:</span>{' '}
                    <span className="font-medium text-gray-200">{displayMse}</span> |{' '}
                    <span title="Gradient Difference" className="cursor-help">Grad. Diff:</span>{' '}
                    <span className="font-medium text-gray-200">{displayGradientDiff}</span>
                </p>
                <p>
                    <span title="Час обробки методу інтерполяції">Час:</span>{' '}
                    <span className="font-medium text-gray-200">{processingTime}</span>
                </p>
            </div>
        </div>
    );
}

export default ResultCard;