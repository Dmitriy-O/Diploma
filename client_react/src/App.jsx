import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Upload, Wand2, X, Download, Eye, Image as ImageIcon, BarChartHorizontal } from 'lucide-react'; // Добавлены иконки

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Constants (Убедитесь, что URL верные) ---
const BACKEND_URL = 'http://127.0.0.1:8000/upscale_all_methods/';
const TASK_STATUS_URL = 'http://127.0.0.1:8000/task/';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const POLL_INTERVAL = 2000; // Опрос каждые 2 секунды
const MAX_POLL_ATTEMPTS = 60; // Максимум 2 минуты опроса

// --- API Utility Functions ---
async function startUpscaleTask(base64Image, scaleFactor) {
    const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ image_base64: base64Image, scale_factor: scaleFactor, algorithm: "all" }),
    });
    if (!response.ok) {
        let errorData = { detail: `Ошибка сервера: ${response.status}` };
        try { errorData = await response.json(); } catch (e) { /* ignore */ }
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
    }
    const result = await response.json();
    if (!result || typeof result.task_id !== 'string') { throw new Error('Не удалось получить корректный ID задачи.'); }
    return result.task_id;
}

async function checkTaskStatus(taskId) {
    const response = await fetch(`${TASK_STATUS_URL}${taskId}`);
    if (!response.ok && response.status !== 404) { throw new Error(`Ошибка при проверке статуса: ${response.status}`); }
    if (response.status === 404) { return { status: 'PENDING' }; }
    return await response.json();
}

// --- Helper Functions ---
function fileToBase64(file) { /* ... (remains the same) ... */
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- React Components ---

// Loader Component
function Loader({ message }) { /* ... (remains the same, styling via Tailwind) ... */
    return (
        <div className="flex justify-center items-center mt-6" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-400"></div>
            <span className="ml-3 text-gray-300">{message || 'Обработка...'}</span>
        </div>
    );
}

// Error Message Component
function ErrorMessage({ message, details, onClose }) { /* ... (remains the same, styling via Tailwind) ... */
    if (!message) return null;
    return (
        <div className="mt-6 p-4 md:p-6 bg-red-900 bg-opacity-80 border border-red-700 text-red-200 rounded-xl backdrop-blur-sm relative shadow-lg">
            <p className="font-semibold">{message}</p>
            {details && <p className="text-sm mt-2 break-words">{details}</p>}
            <button onClick={onClose} className="absolute top-2 right-2 text-red-300 hover:text-red-100 p-1 rounded-full hover:bg-red-800/50 transition-colors" aria-label="Закрыть ошибку">
                <X size={20} />
            </button>
        </div>
    );
}

// Image Uploader Component (Improved Styling)
function ImageUploader({ onFileSelect, selectedFileName, maxFileSizeMB }) {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null); // Ref for file input

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) { onFileSelect(file); }
        event.target.value = ''; // Reset input
    };
    const handleDrop = (event) => { /* ... (drag/drop logic) ... */
        event.preventDefault(); event.stopPropagation(); setDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) { onFileSelect(file); }
    };
    const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
    const handleDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); setDragOver(true); };
    const handleDragLeave = (event) => { event.preventDefault(); event.stopPropagation(); setDragOver(false); };

    return (
        <div className="flex flex-col items-center">
            <label
                htmlFor="file-upload-input" // Changed ID to avoid conflict if reused
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-300 ease-in-out flex flex-col items-center justify-center space-y-2 h-36 ${dragOver ? 'border-indigo-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'}`}
            >
                <Upload className={`h-8 w-8 mb-2 transition-colors ${dragOver ? 'text-indigo-400' : 'text-gray-400'}`} aria-hidden="true" />
                <span className="text-sm font-medium text-gray-300">
                    {selectedFileName || 'Перетащите или выберите файл'}
                </span>
                 <span className="text-xs text-gray-500">
                     PNG, JPG, WEBP (макс. {maxFileSizeMB}MB)
                 </span>
            </label>
            <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept={SUPPORTED_IMAGE_TYPES.join(',')}
                className="hidden"
                onChange={handleFileChange}
            />
             {/* Optional: Display selected file name below */}
             {/* {selectedFileName && <p className="text-xs text-gray-400 mt-2 text-center truncate w-full px-2">Выбрано: {selectedFileName}</p>} */}
        </div>
    );
}

// Controls Component (Improved Layout)
function Controls({ scaleFactor, onScaleChange, onUpscale, isProcessing, isFileSelected }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end bg-gray-700/50 p-4 rounded-xl border border-gray-600">
             <div className="sm:col-span-2">
                <label htmlFor="scale-factor" className="block text-sm font-medium text-gray-300 mb-1">Коэффициент увеличения:</label>
                <input
                    type="number"
                    id="scale-factor"
                    value={scaleFactor}
                    min="1.1" max="8" step="0.1"
                    onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                    className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-all duration-300"
                    disabled={isProcessing}
                />
            </div>
            <div className="sm:col-span-1">
                <button
                    id="upscale-button"
                    onClick={onUpscale}
                    disabled={isProcessing || !isFileSelected}
                    className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-3 px-5 rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <Wand2 className="mr-2 h-5 w-5" aria-hidden="true" />
                    Увеличить
                </button>
            </div>
        </div>
    );
}

// Result Card Component (Displays Diff & Histogram)
function ResultCard({ method, data, onImageClick, onDownloadClick }) {
    const [viewMode, setViewMode] = useState('upscaled'); // 'upscaled', 'diff', 'hist'

    // Basic validation
    if (!data || !data.upscaled_image_base64 || !data.diff_image_base64 || !data.hist_base64 || !data.upscaled_shape) {
        return ( /* ... error card ... */
             <div className="text-center result-card border border-red-500 p-4 rounded-lg bg-gray-700/80 backdrop-blur-sm shadow-lg">
                <h4 className="text-md font-semibold text-red-400 mb-2">{method.charAt(0).toUpperCase() + method.slice(1)}</h4>
                <p className="text-red-400 text-sm">Ошибка: Неполные данные</p>
            </div>
        );
    }

    const displayPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? "∞" : (typeof data.psnr === 'number' ? data.psnr.toFixed(2) : 'N/A');
    const displaySsim = (typeof data.ssim === 'number') ? data.ssim.toFixed(3) : 'N/A';
    const shape = data.upscaled_shape;

    const handleDownload = (e) => { e.stopPropagation(); onDownloadClick(method, data.upscaled_image_base64); };

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
            case 'diff': return `Разница (${method})`;
            case 'hist': return `Гистограмма ошибок (${method})`;
            case 'upscaled':
            default: return `Увеличенное (${method})`;
        }
    };

    return (
        <div className="text-center result-card bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-600 flex flex-col h-full transition-shadow hover:shadow-indigo-500/20">
            <h4 className="text-lg font-semibold text-gray-100 mb-3">{method.charAt(0).toUpperCase() + method.slice(1)}</h4>
            {/* Image Display Area */}
            <div
                className="flex-grow w-full h-64 md:h-72 bg-gray-600 rounded-lg flex items-center justify-center border border-gray-500 overflow-hidden relative group cursor-pointer mb-3 image-container"
                onClick={() => onImageClick(getImageSrc(), getImageAlt())} // Pass alt text
            >
                <img
                    src={getImageSrc()}
                    alt={getImageAlt()}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                />
                {/* Download Button (always visible on hover) */}
                 <button
                    onClick={handleDownload}
                    className="download-button absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    title="Скачать результат"
                    aria-label={`Скачать результат ${method}`}
                 >
                    <Download size={18} />
                </button>
            </div>
            {/* View Mode Toggles */}
            <div className="flex justify-center space-x-2 mb-3">
                 <button
                     onClick={() => setViewMode('upscaled')}
                     className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'upscaled' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                     title="Показать результат"
                 >
                    <ImageIcon size={14} className="inline mr-1"/> Рез.
                </button>
                 <button
                     onClick={() => setViewMode('diff')}
                     className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'diff' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                     title="Показать разницу"
                 >
                     <Eye size={14} className="inline mr-1"/> Разн.
                </button>
                 <button
                     onClick={() => setViewMode('hist')}
                     className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'hist' ? 'bg-teal-500 text-white font-semibold' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                     title="Показать гистограмму ошибок"
                 >
                     <BarChartHorizontal size={14} className="inline mr-1"/> Гист.
                 </button>
            </div>
            {/* Metrics */}
            <div className="text-sm text-gray-400 space-y-1 mt-auto"> {/* mt-auto pushes metrics down */}
                <p>Новый размер: {shape[0]} x {shape[1]} px</p>
                <p>
                    <span title="Peak Signal-to-Noise Ratio" className="cursor-help">PSNR:</span> <span className="font-medium text-gray-200">{displayPsnr}</span> dB |{' '}
                    <span title="Structural Similarity Index Measure" className="cursor-help">SSIM:</span> <span className="font-medium text-gray-200">{displaySsim}</span>
                </p>
            </div>
        </div>
    );
}

// Metrics Table Component (Improved Styling)
function MetricsTable({ results, bestPsnrMethod, bestSsimMethod }) { /* ... (logic remains same, styling improved) ... */
     return (
        <div className="mt-10">
            <h4 className="text-xl font-semibold text-gray-100 mb-4 text-center">Сравнение метрик</h4>
            <div className="overflow-x-auto bg-gray-700/80 backdrop-blur-sm rounded-xl p-1 md:p-4 shadow-lg border border-gray-600 max-w-3xl mx-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-600/50">
                        <tr>
                            <th scope="col" className="px-4 py-3 rounded-tl-lg">Метод</th>
                            <th scope="col" className="px-4 py-3">PSNR (dB)</th>
                            <th scope="col" className="px-4 py-3 rounded-tr-lg">SSIM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(results).map(([method, data], index, arr) => {
                            const displayPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? "∞" : (typeof data.psnr === 'number' ? data.psnr.toFixed(2) : 'N/A');
                            const displaySsim = (typeof data.ssim === 'number') ? data.ssim.toFixed(3) : 'N/A';
                            const isBestPsnr = method === bestPsnrMethod;
                            const isBestSsim = method === bestSsimMethod;
                            const isLastRow = index === arr.length - 1;
                            return (
                                <tr
                                    key={method}
                                    className={`transition-colors duration-200 hover:bg-gray-600/40 ${!isLastRow ? 'border-b border-gray-600' : ''}`}
                                >
                                    <th scope="row" className={`px-4 py-3 font-medium whitespace-nowrap ${isLastRow ? 'rounded-bl-lg' : ''}`}>
                                        {method.charAt(0).toUpperCase() + method.slice(1)}
                                    </th>
                                    <td className={`px-4 py-3 ${isBestPsnr ? 'font-bold text-indigo-300' : ''}`}>{displayPsnr}</td>
                                    <td className={`px-4 py-3 ${isBestSsim ? 'font-bold text-teal-300' : ''} ${isLastRow ? 'rounded-br-lg' : ''}`}>{displaySsim}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Chart Component (Improved Styling/Options)
function MetricChart({ title, data, label, backgroundColor, borderColor }) { /* ... (logic same, options improved) ... */
     const chartData = { labels: data.labels, datasets: [{ label: label, data: data.values, backgroundColor: backgroundColor || 'rgba(99, 102, 241, 0.7)', borderColor: borderColor || 'rgba(99, 102, 241, 1)', borderWidth: 1, borderRadius: 4 }] };
     const options = {
        responsive: true, maintainAspectRatio: false,
        scales: {
            y: { beginAtZero: true, title: { display: true, text: label, color: '#9ca3af' }, ticks: { color: '#9ca3af', precision: label === 'SSIM' ? 2 : 0 }, grid: { color: 'rgba(75, 85, 99, 0.5)' }, suggestedMax: label === 'SSIM' ? 1 : undefined },
            x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
        },
        plugins: {
            legend: { display: false }, // Hide legend if only one dataset
            title: { display: false },
             tooltip: {
                enabled: true, backgroundColor: 'rgba(31, 41, 55, 0.9)', titleColor: '#e5e7eb', bodyColor: '#d1d5db', borderColor: '#4b5563', borderWidth: 1, padding: 10, boxPadding: 3,
                callbacks: { label: (context) => `${context.dataset.label}: ${context.formattedValue}` }
            }
        },
        animation: { duration: 500, easing: 'easeOutQuart' } // Add animation
    };
    return (
         <div className="flex flex-col">
            <h4 className="text-xl font-semibold text-gray-100 mb-4 text-center">{title}</h4>
            <div className="bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-600 h-64 md:h-80 flex-grow">
                 <Bar options={options} data={chartData} />
            </div>
        </div>
    );
}

// Modal Component (Improved Styling)
function ImageModal({ src, alt, isOpen, onClose }) { /* ... (logic same, styling improved) ... */
    useEffect(() => {
        const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
        if (isOpen) { document.addEventListener('keydown', handleEscape); }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4 animate-fade-in"
            onClick={onClose} role="dialog" aria-modal="true" aria-label={alt || 'Увеличенное изображение'}
        >
            <div className="relative max-w-5xl w-auto max-h-[90vh] overflow-hidden bg-gray-800 p-2 rounded-lg shadow-2xl border border-gray-600" onClick={(e) => e.stopPropagation()}>
                <img id="modal-image" src={src} alt={alt || 'Увеличенное изображение'} className="block max-w-full max-h-[calc(90vh-4rem)] object-contain rounded" />
                <button id="modal-close" onClick={onClose} className="absolute top-2 right-2 bg-gray-700/80 hover:bg-gray-600/90 text-white p-2 rounded-full shadow-lg transition-all duration-300" aria-label="Закрыть">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}

// --- Main App Component ---
function App() {
    // State hooks remain largely the same
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalImageBase64, setOriginalImageBase64] = useState(null);
    const [originalDimensions, setOriginalDimensions] = useState(null);
    const [scaleFactor, setScaleFactor] = useState(2.0);
    const [taskId, setTaskId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pollingStatus, setPollingStatus] = useState('');
    const [results, setResults] = useState(null); // Stores the full result object from backend
    const [error, setError] = useState({ message: null, details: null });
    const [modalImage, setModalImage] = useState({ src: null, alt: null });

    const pollingIntervalRef = useRef(null);
    const pollAttemptCountRef = useRef(0);

    // Cleanup polling effect
    useEffect(() => { return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); }; }, []);

    // Polling Logic Effect
    useEffect(() => {
        if (!taskId) return;
        // ... (polling logic remains the same as react-frontend-v1) ...
         if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
         pollAttemptCountRef.current = 0; setPollingStatus('PENDING'); setIsProcessing(true);
         setError({ message: null, details: null }); setResults(null);

         pollingIntervalRef.current = setInterval(async () => {
             if (pollAttemptCountRef.current >= MAX_POLL_ATTEMPTS) {
                 setError({ message: 'Превышено время ожидания ответа.', details: `Задача ${taskId} не завершилась.` });
                 setPollingStatus('TIMEOUT'); setIsProcessing(false); setTaskId(null); clearInterval(pollingIntervalRef.current); return;
             }
             pollAttemptCountRef.current += 1; console.log(`Polling attempt ${pollAttemptCountRef.current} for ${taskId}`);
             try {
                 const statusData = await checkTaskStatus(taskId);
                 if (statusData.status === 'Готово') {
                     console.log("Task SUCCESS:", statusData.result); clearInterval(pollingIntervalRef.current); setPollingStatus('SUCCESS');
                     if (statusData.result && typeof statusData.result.results === 'object') { setResults(statusData.result); }
                     else { console.error("Invalid result structure:", statusData.result); setError({ message: 'Структура результата некорректна.', details: JSON.stringify(statusData.result) }); setResults(null); }
                     setIsProcessing(false); setTaskId(null);
                 } else if (statusData.status === 'FAILURE') {
                     console.error("Task FAILURE:", statusData.error); clearInterval(pollingIntervalRef.current);
                     setError({ message: 'Ошибка обработки на сервере.', details: statusData.error || 'Неизвестная ошибка.' });
                     setPollingStatus('FAILURE'); setIsProcessing(false); setTaskId(null);
                 } else { setPollingStatus(statusData.status || 'PENDING'); }
             } catch (pollError) {
                 console.error("Polling error:", pollError); clearInterval(pollingIntervalRef.current);
                 setError({ message: 'Ошибка при опросе статуса.', details: pollError.message });
                 setPollingStatus('ERROR'); setIsProcessing(false); setTaskId(null);
             }
         }, POLL_INTERVAL);
         return () => clearInterval(pollingIntervalRef.current);
    }, [taskId]);

    // Event Handlers (remain mostly the same, ensure state updates)
     const handleFileSelect = useCallback(async (file) => { /* ... (same as v1, ensures state reset and loading) ... */
         setError({ message: null, details: null }); setResults(null); setTaskId(null);
         setSelectedFile(null); setOriginalImageBase64(null); setOriginalDimensions(null); setIsProcessing(true);
         if (!file) { setIsProcessing(false); return; }
         if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) { setError({ message: 'Неподдерживаемый формат файла.', details: 'Выберите PNG, JPG или WEBP.' }); setIsProcessing(false); return; }
         if (file.size > MAX_FILE_SIZE) { setError({ message: 'Файл слишком большой.', details: `Макс. ${MAX_FILE_SIZE / 1024 / 1024}MB.` }); setIsProcessing(false); return; }
         try {
             const base64 = await fileToBase64(file); setOriginalImageBase64(base64); setSelectedFile(file);
             const img = new Image();
             img.onload = () => { setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight }); setIsProcessing(false); };
             img.onerror = () => { setError({ message: 'Не удалось загрузить превью.', details: 'Файл поврежден?' }); setOriginalImageBase64(null); setSelectedFile(null); setIsProcessing(false); }
             img.src = base64;
         } catch (readError) { console.error("File read error:", readError); setError({ message: 'Не удалось прочитать файл.', details: readError.message }); setOriginalImageBase64(null); setSelectedFile(null); setIsProcessing(false); }
     }, []);
     const handleUpscale = useCallback(async () => { /* ... (same as v1, triggers task start) ... */
         if (!originalImageBase64 || isProcessing) return;
         console.log("Starting upscale process..."); setError({ message: null, details: null }); setResults(null);
         setIsProcessing(true); setPollingStatus('INITIATED');
         try { const newTaskId = await startUpscaleTask(originalImageBase64, scaleFactor); setTaskId(newTaskId); }
         catch (apiError) { console.error("Upscale initiation error:", apiError); setError({ message: 'Ошибка при запуске задачи.', details: apiError.message }); setIsProcessing(false); setPollingStatus('ERROR'); }
     }, [originalImageBase64, scaleFactor, isProcessing]);
     const handleDownload = useCallback((method, base64) => { /* ... (same as v1) ... */
          if (!base64 || !selectedFile) return;
          const link = document.createElement('a'); link.href = base64;
          const mimeMatch = base64.match(/data:image\/(\w+);/); const extension = mimeMatch ? mimeMatch[1] : 'png';
          const originalFileName = selectedFile.name.split('.').slice(0, -1).join('.') || 'image';
          link.download = `${originalFileName}_upscaled_${method}_x${scaleFactor}.${extension}`;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
     }, [selectedFile, scaleFactor]);

    // Prepare Chart Data (logic remains same)
    const chartData = { psnr: { labels: [], values: [] }, ssim: { labels: [], values: [] }, bestPsnrMethod: '', bestSsimMethod: '' };
    if (results?.results) { /* ... (same logic as v1 to populate chartData) ... */
         let bestPsnr = -Infinity; let bestSsim = -Infinity;
         Object.entries(results.results).forEach(([method, data]) => {
            const label = method.charAt(0).toUpperCase() + method.slice(1);
            chartData.psnr.labels.push(label); chartData.ssim.labels.push(label);
            const currentPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? Infinity : (typeof data.psnr === 'number' ? data.psnr : -Infinity);
            const currentSsim = (typeof data.ssim === 'number') ? data.ssim : -Infinity;
             chartData.psnr.values.push(currentPsnr === Infinity ? null : currentPsnr);
             chartData.ssim.values.push(currentSsim === -Infinity ? null : currentSsim);
             if (currentPsnr > bestPsnr) { bestPsnr = currentPsnr; chartData.bestPsnrMethod = method; }
             if (currentSsim > bestSsim) { bestSsim = currentSsim; chartData.bestSsimMethod = method; }
        });
    }

    // --- Render ---
    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-poppins text-gray-100 relative overflow-hidden bg-gray-900">
            {/* Improved Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-900/80 to-gray-900 animate-gradient background-size-200"></div>

            {/* Main Container */}
            <div className="container max-w-7xl w-full bg-gray-800/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700 p-6 md:p-10 relative z-10">
                {/* Header */}
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400 pb-1">Image Upscaler</h1>
                    <p className="text-gray-400 mt-2 text-base sm:text-lg">Сравнение методов интерполяции</p>
                </header>

                {/* Main Content Area */}
                <div className="space-y-8 md:space-y-10">
                     {/* Top Section: Uploader & Controls */}
                     <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                         <div className="lg:col-span-1">
                             <ImageUploader
                                onFileSelect={handleFileSelect}
                                selectedFileName={selectedFile?.name}
                                maxFileSizeMB={MAX_FILE_SIZE / 1024 / 1024}
                            />
                        </div>
                        <div className="lg:col-span-2">
                             <Controls
                                scaleFactor={scaleFactor}
                                onScaleChange={setScaleFactor}
                                onUpscale={handleUpscale}
                                isProcessing={isProcessing}
                                isFileSelected={!!selectedFile}
                            />
                        </div>
                     </section>

                    {/* Loader */}
                    {isProcessing && <Loader message={pollingStatus === 'PENDING' ? `Опрос статуса (${pollAttemptCountRef.current})...` : (pollingStatus === 'INITIATED' ? 'Запуск задачи...' : 'Обработка файла...')} />}

                    {/* Error Message */}
                    <ErrorMessage message={error.message} details={error.details} onClose={() => setError({ message: null, details: null })} />

                    {/* Original Image Preview */}
                     <section className="text-center">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Оригинал</h3>
                        <div className="w-full max-w-xl mx-auto h-64 sm:h-80 md:h-96 bg-gray-700/50 rounded-xl flex items-center justify-center border border-gray-600 overflow-hidden shadow-lg">
                            {originalImageBase64 ? (
                                <img id="original-image-preview" src={originalImageBase64} alt="Оригинал" className="max-h-full max-w-full object-contain cursor-pointer transition-transform hover:scale-105" onClick={() => setModalImage({ src: originalImageBase64, alt: 'Оригинал' })} />
                            ) : (
                                <span id="original-placeholder" className="text-gray-500">{isProcessing && !originalImageBase64 ? 'Загрузка...' : 'Изображение не выбрано'}</span>
                            )}
                        </div>
                        {originalDimensions && ( <p id="original-dimensions" className="text-sm text-gray-400 mt-3">Размер: {originalDimensions.width} x {originalDimensions.height} px</p> )}
                    </section>

                    {/* Results Section - Conditional Rendering */}
                    {results && pollingStatus === 'SUCCESS' && (
                        <section id="results-section" className="space-y-10 md:space-y-12 animate-fade-in pt-6 border-t border-gray-700">
                            <h3 className="text-2xl md:text-3xl font-semibold text-gray-100 text-center">Результаты Сравнения</h3>

                            {/* Result Cards Grid */}
                            <div id="results-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {Object.entries(results.results).map(([method, data]) => (
                                    <ResultCard key={method} method={method} data={data} onImageClick={setModalImage} onDownloadClick={handleDownload} />
                                ))}
                            </div>

                            {/* Metrics Table */}
                             <MetricsTable results={results.results} bestPsnrMethod={chartData.bestPsnrMethod} bestSsimMethod={chartData.bestSsimMethod} />

                            {/* Charts */}
                            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <MetricChart title="PSNR" label="PSNR (dB)" data={chartData.psnr} backgroundColor='rgba(99, 102, 241, 0.7)' borderColor='rgba(99, 102, 241, 1)' />
                                <MetricChart title="SSIM" label="SSIM" data={chartData.ssim} backgroundColor='rgba(16, 185, 129, 0.7)' borderColor='rgba(16, 185, 129, 1)' />
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Image Modal */}
            <ImageModal isOpen={!!modalImage.src} src={modalImage.src} alt={modalImage.alt} onClose={() => setModalImage({ src: null, alt: null })} />

             {/* Add global styles/animations */}
             <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient { animation: gradient 15s ease infinite; }
                .background-size-200 { background-size: 200% 200%; }
             `}</style>
        </div>
    );
}

export default App;