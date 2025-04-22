import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import Controls from './components/Controls';
import ResultCard from './components/ResultCard';
import MetricsTable from './components/MetricsTable';
import MetricChart from './components/MetricChart';
import ImageModal from './components/ImageModal';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import useTaskPolling from './hooks/useTaskPolling';

const BACKEND_URL = 'http://127.0.0.1:8000/upscale_all_methods/';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalImageBase64, setOriginalImageBase64] = useState(null);
    const [originalDimensions, setOriginalDimensions] = useState(null);
    const [scaleFactor, setScaleFactor] = useState(2.0);
    const [taskId, setTaskId] = useState(null);
    const [modalImage, setModalImage] = useState({ src: null, alt: null });
    const [isFileLoading, setIsFileLoading] = useState(false); // ← Новое состояние для загрузки файла

    const {
        status: pollingStatus,
        progress,
        result,
        error,
        isProcessing,
        setError,
        clearError,
    } = useTaskPolling(taskId);

    const handleFileSelect = useCallback(async (file) => {
        console.log('handleFileSelect called with file:', file);
        clearError();
        setTaskId(null);
        setSelectedFile(null);
        setOriginalImageBase64(null);
        setOriginalDimensions(null);
        setIsFileLoading(true); // ← Используем новое состояние
        if (!file) {
            console.log('No file provided');
            setIsFileLoading(false);
            return;
        }
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            console.log('Unsupported file type:', file.type);
            setError({ message: 'Неподдерживаемый формат файла.', details: 'Выберите PNG, JPG или WEBP.' });
            setIsFileLoading(false);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            console.log('File too large:', file.size);
            setError({ message: 'Файл слишком большой.', details: `Макс. ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
            setIsFileLoading(false);
            return;
        }
        try {
            const base64 = await fileToBase64(file);
            console.log('File converted to base64');
            setOriginalImageBase64(base64);
            setSelectedFile(file);
            const img = new Image();
            img.onload = () => {
                console.log('Image loaded, dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                setIsFileLoading(false);
            };
            img.onerror = () => {
                console.error('Image load error');
                setError({ message: 'Не удалось загрузить превью.', details: 'Файл поврежден?' });
                setOriginalImageBase64(null);
                setSelectedFile(null);
                setIsFileLoading(false);
            };
            img.src = base64;
        } catch (readError) {
            console.error("File read error in handleFileSelect:", readError);
            setError({ message: 'Не удалось прочитать файл.', details: readError.message });
            setOriginalImageBase64(null);
            setSelectedFile(null);
            setIsFileLoading(false);
        }
    }, [clearError, setError]);

    const handleUpscale = useCallback(async () => {
        if (!originalImageBase64 || isProcessing || isFileLoading) return;
        console.log("Starting upscale process...");
        clearError();
        try {
            const newTaskId = await startUpscaleTask(originalImageBase64, scaleFactor);
            setTaskId(newTaskId);
        } catch (apiError) {
            console.error("Upscale initiation error:", apiError);
            setError({ message: 'Ошибка при запуске задачи.', details: apiError.message });
        }
    }, [originalImageBase64, scaleFactor, isProcessing, isFileLoading, clearError, setError]);

    const handleDownload = useCallback((method, base64) => {
        if (!base64 || !selectedFile) return;
        const link = document.createElement('a');
        link.href = base64;
        const mimeMatch = base64.match(/data:image\/(\w+);/);
        const extension = mimeMatch ? mimeMatch[1] : 'png';
        const originalFileName = selectedFile.name.split('.').slice(0, -1).join('.') || 'image';
        link.download = `${originalFileName}_upscaled_${method}_x${scaleFactor}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [selectedFile, scaleFactor]);

    const chartData = { psnr: { labels: [], values: [] }, ssim: { labels: [], values: [] }, bestPsnrMethod: '', bestSsimMethod: '' };
    if (result?.results) {
        let bestPsnr = -Infinity;
        let bestSsim = -Infinity;
        Object.entries(result.results).forEach(([method, data]) => {
            const label = method.charAt(0).toUpperCase() + method.slice(1);
            chartData.psnr.labels.push(label);
            chartData.ssim.labels.push(label);
            const currentPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? Infinity : (typeof data.psnr === 'number' ? data.psnr : -Infinity);
            const currentSsim = (typeof data.ssim === 'number') ? data.ssim : -Infinity;
            chartData.psnr.values.push(currentPsnr === Infinity ? null : currentPsnr);
            chartData.ssim.values.push(currentSsim === -Infinity ? null : currentSsim);
            if (currentPsnr > bestPsnr) {
                bestPsnr = currentPsnr;
                chartData.bestPsnrMethod = method;
            }
            if (currentSsim > bestSsim) {
                bestSsim = currentSsim;
                chartData.bestSsimMethod = method;
            }
        });
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-poppins text-gray-100 relative overflow-hidden bg-gray-900">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-900/80 to-gray-900 animate-gradient background-size-200"></div>
            <div className="container max-w-7xl w-full bg-gray-800/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700 p-6 md:p-10 relative z-10">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400 pb-1">Image Upscaler</h1>
                    <p className="text-gray-400 mt-2 text-base sm:text-lg">Сравнение методов интерполяции</p>
                </header>
                <div className="space-y-8 md:space-y-10">
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
                                isProcessing={isProcessing || isFileLoading} // ← Учитываем оба состояния
                                isFileSelected={!!selectedFile}
                            />
                        </div>
                    </section>
                    {(isProcessing || isFileLoading) && (
                        <Loader
                            message={
                                isFileLoading
                                    ? 'Загрузка файла...'
                                    : pollingStatus === 'PROGRESS'
                                    ? `Обработка (${Math.round(progress)}%)...`
                                    : pollingStatus === 'INITIATED'
                                    ? 'Запуск задачи...'
                                    : 'Обработка файла...'
                            }
                            progress={pollingStatus === 'PROGRESS' ? progress : null}
                        />
                    )}
                    <ErrorMessage message={error.message} details={error.details} onClose={clearError} />
                    <section className="text-center">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Оригинал</h3>
                        <div className="w-full max-w-xl mx-auto h-64 sm:h-80 md:h-96 bg-gray-700/50 rounded-xl flex items-center justify-center border border-gray-600 overflow-hidden shadow-lg">
                            {originalImageBase64 ? (
                                <img
                                    id="original-image-preview"
                                    src={originalImageBase64}
                                    alt="Оригинал"
                                    className="max-h-full max-w-full object-contain cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => setModalImage({ src: originalImageBase64, alt: 'Оригинал' })}
                                />
                            ) : (
                                <span id="original-placeholder" className="text-gray-500">{(isProcessing || isFileLoading) && !originalImageBase64 ? 'Загрузка...' : 'Изображение не выбрано'}</span>
                            )}
                        </div>
                        {originalDimensions && (
                            <p id="original-dimensions" className="text-sm text-gray-400 mt-3">
                                Размер: {originalDimensions.width} x {originalDimensions.height} px
                            </p>
                        )}
                    </section>
                    {result && pollingStatus === 'SUCCESS' && result.results && (
    <section id="results-section" className="space-y-10 md:space-y-12 animate-fade-in pt-6 border-t border-gray-700">
        <h3 className="text-2xl md:text-3xl font-semibold text-gray-100 text-center">Результаты Сравнения</h3>
        <div id="results-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Object.entries(result.results).map(([method, data]) => (
                <ResultCard
                    key={method}
                    method={method}
                    data={data}
                    onImageClick={(src, alt) => {
                        console.log('Setting modal image:', src, alt);
                        setModalImage({ src, alt });
                    }}
                    onDownloadClick={handleDownload}
                />
            ))}
        </div>
        <MetricsTable
            results={result.results}
            bestPsnrMethod={chartData.bestPsnrMethod}
            bestSsimMethod={chartData.bestSsimMethod}
        />
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <MetricChart
                title="PSNR"
                label="PSNR (dB)"
                data={chartData.psnr}
                backgroundColor='rgba(99, 102, 241, 0.7)'
                borderColor='rgba(99, 102, 241, 1)'
            />
            <MetricChart
                title="SSIM"
                label="SSIM"
                data={chartData.ssim}
                backgroundColor='rgba(16, 185, 129, 0.7)'
                borderColor='rgba(16, 185, 129, 1)'
            />
        </div>
    </section>
)}
                </div>
            </div>
            <ImageModal
                isOpen={modalImage.src !== null}
                src={modalImage.src}
                alt={modalImage.alt}
                onClose={() => setModalImage({ src: null, alt: null })}
            />
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