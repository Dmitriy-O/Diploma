import React, { useState, useCallback, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import Controls from './components/Controls';
import ResultCard from './components/ResultCard';
import MetricsTable from './components/MetricsTable';
import MetricChart from './components/MetricChart';
import ImageModal from './components/ImageModal';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import useTaskPolling from './hooks/useTaskPolling';

// Підтримуємо лише PNG
const SUPPORTED_IMAGE_TYPES = ['image/png'];
const BACKEND_URL = 'http://127.0.0.1:8000/upscale_all_methods/';
const AVERAGE_TIMES_URL = 'http://127.0.0.1:8000/average_times/';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function startUpscaleTask(base64Image, scaleFactor) {
    const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ image_base64: base64Image, scale_factor: scaleFactor, algorithm: "all" }),
    });
    if (!response.ok) {
        let errorData = { detail: `Помилка сервера: ${response.status}` };
        try { errorData = await response.json(); } catch (e) { /* ignore */ }
        throw new Error(errorData.detail || `Помилка сервера: ${response.status}`);
    }
    const result = await response.json();
    if (!result || typeof result.task_id !== 'string') { throw new Error('Не вдалося отримати коректний ID завдання.'); }
    return result.task_id;
}

async function fetchAverageTimes() {
    const response = await fetch(AVERAGE_TIMES_URL);
    if (!response.ok) {
        throw new Error('Не вдалося завантажити середні часи обробки.');
    }
    const data = await response.json();
    if (data.status !== 'success') {
        throw new Error(data.error || 'Помилка при завантаженні середніх часів.');
    }
    return data.average_times || {};
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
    const [reducedImageBase64, setReducedImageBase64] = useState(null);
    const [reducedDimensions, setReducedDimensions] = useState(null);
    const [scaleFactor, setScaleFactor] = useState(2.0);
    const [taskId, setTaskId] = useState(null);
    const [modalImage, setModalImage] = useState({ src: null, alt: null });
    const [isFileLoading, setIsFileLoading] = useState(false);
    const [sortBy, setSortBy] = useState('psnr');
    const [averageTimes, setAverageTimes] = useState({});
    const [averageTimesError, setAverageTimesError] = useState(null);

    const {
        status: pollingStatus,
        progress,
        result,
        error,
        isProcessing,
        setError,
        clearError,
    } = useTaskPolling(taskId);

    useEffect(() => {
        const loadAverageTimes = async () => {
            try {
                const avgTimes = await fetchAverageTimes();
                console.log('Дані з бекенду (averageTimes):', avgTimes);
                setAverageTimes(avgTimes);
                setAverageTimesError(null);
            } catch (err) {
                console.error("Помилка завантаження середніх часів:", err.message);
                setAverageTimes({});
                setAverageTimesError('Не вдалося завантажити середні часи обробки. Спробуйте пізніше.');
            }
        };
        loadAverageTimes();
    }, []);

    useEffect(() => {
        if (result?.reduced_image_base64) {
            setReducedImageBase64(result.reduced_image_base64);
            setReducedDimensions(result.reduced_dimensions);
        }
    }, [result]);

    const handleFileSelect = useCallback(async (file) => {
        console.log('handleFileSelect called with file:', file);
        clearError();
        setTaskId(null);
        setSelectedFile(null);
        setOriginalImageBase64(null);
        setOriginalDimensions(null);
        setReducedImageBase64(null);
        setReducedDimensions(null);
        setIsFileLoading(true);
        if (!file) {
            console.log('No file provided');
            setIsFileLoading(false);
            return;
        }
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            console.log('Unsupported file type:', file.type);
            setError({ message: 'Непідтримуваний формат файлу.', details: 'Виберіть PNG.' });
            setIsFileLoading(false);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            console.log('File too large:', file.size);
            setError({ message: 'Файл занадто великий.', details: `Макс. ${MAX_FILE_SIZE / 1024 / 1024} МБ.` });
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
                setError({ message: 'Не вдалося завантажити попередній перегляд.', details: 'Файл пошкоджений?' });
                setOriginalImageBase64(null);
                setSelectedFile(null);
                setIsFileLoading(false);
            };
            img.src = base64;
        } catch (readError) {
            console.error("File read error in handleFileSelect:", readError);
            setError({ message: 'Не вдалося прочитати файл.', details: readError.message });
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
            setError({ message: 'Помилка при запуску завдання.', details: apiError.message });
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

    const chartData = { 
        psnr: { labels: [], values: [] }, 
        ssim: { labels: [], values: [] }, 
        gradient: { labels: [], values: [] }, 
        mse: { labels: [], values: [] }, 
        time: { labels: [], values: [] }, 
        bestPsnrMethod: '', 
        bestSsimMethod: '', 
        bestMseMethod: '', 
        bestGradientMethod: '', 
        bestTimeMethod: '' 
    };
    if (result?.results) {
        let bestPsnr = -Infinity;
        let bestSsim = -Infinity;
        let bestMse = Infinity;
        let bestGradient = Infinity;
        let bestTime = Infinity;
        Object.entries(result.results).forEach(([method, data]) => {
            chartData.psnr.labels.push(method);
            chartData.ssim.labels.push(method);
            chartData.gradient.labels.push(method);
            chartData.mse.labels.push(method);
            chartData.time.labels.push(method);
            const currentPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? Infinity : (typeof data.psnr === 'number' ? data.psnr : -Infinity);
            const currentSsim = (typeof data.ssim === 'number') ? data.ssim : -Infinity;
            const currentMse = (typeof data.mse === 'number') ? data.mse : Infinity;
            const currentGradient = (typeof data.gradient_diff === 'number') ? data.gradient_diff : Infinity;
            const currentTime = (typeof data.processing_time === 'number') ? data.processing_time : Infinity;
            chartData.psnr.values.push(currentPsnr === Infinity ? null : currentPsnr);
            chartData.ssim.values.push(currentSsim === -Infinity ? null : currentSsim);
            chartData.gradient.values.push(currentGradient);
            chartData.mse.values.push(currentMse);
            chartData.time.values.push(currentTime);
            if (currentPsnr > bestPsnr) {
                bestPsnr = currentPsnr;
                chartData.bestPsnrMethod = method;
            }
            if (currentSsim > bestSsim) {
                bestSsim = currentSsim;
                chartData.bestSsimMethod = method;
            }
            if (currentMse < bestMse) {
                bestMse = currentMse;
                chartData.bestMseMethod = method;
            }
            if (currentGradient < bestGradient) {
                bestGradient = currentGradient;
                chartData.bestGradientMethod = method;
            }
            if (currentTime < bestTime) {
                bestTime = currentTime;
                chartData.bestTimeMethod = method;
            }
        });
    }

    const sortedResults = result?.results
        ? Object.entries(result.results).sort(([, a], [, b]) => {
              if (sortBy === 'psnr') return (b.psnr === "infinity" ? Infinity : b.psnr) - (a.psnr === "infinity" ? Infinity : a.psnr);
              if (sortBy === 'ssim') return b.ssim - a.ssim;
              if (sortBy === 'time') return a.processing_time - b.processing_time;
              if (sortBy === 'gradient') return a.gradient_diff - b.gradient_diff;
              if (sortBy === 'mse') return a.mse - b.mse;
              return 0;
          })
        : [];

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-poppins text-gray-100 relative overflow-hidden bg-gray-900">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-900/80 to-gray-900 animate-gradient background-size-200"></div>
            <div className="container max-w-7xl w-full bg-gray-800/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700 p-6 md:p-10 relative z-10">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400 pb-1">Збільшувач Зображень</h1>
                    <p className="text-gray-400 mt-2 text-base sm:text-lg">Порівняння методів інтерполяції</p>
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
                                isProcessing={isProcessing || isFileLoading}
                                isFileSelected={!!selectedFile}
                            />
                        </div>
                    </section>
                    {(isProcessing || isFileLoading) && (
                        <Loader
                            message={
                                isFileLoading
                                    ? 'Завантаження файлу...'
                                    : pollingStatus === 'PROGRESS'
                                    ? `Обробка (${Math.round(progress)}%)...`
                                    : pollingStatus === 'INITIATED'
                                    ? 'Запуск завдання...'
                                    : 'Обробка файлу...'
                            }
                            progress={pollingStatus === 'PROGRESS' ? progress : null}
                        />
                    )}
                    <ErrorMessage message={error.message} details={error.details} onClose={clearError} />
                    {reducedImageBase64 && (
                        <section className="text-center">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4">Зменшене зображення (Метод найближчого сусіда)</h3>
                            <div className="w-full max-w-xl mx-auto h-64 sm:h-80 md:h-96 bg-gray-700/50 rounded-xl flex items-center justify-center border border-gray-600 overflow-hidden shadow-lg">
                                <img
                                    id="reduced-image-preview"
                                    src={reducedImageBase64}
                                    alt="Зменшене зображення"
                                    className="max-h-full max-w-full object-contain cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => setModalImage({ src: reducedImageBase64, alt: 'Зменшене зображення' })}
                                />
                            </div>
                            {reducedDimensions && (
                                <p id="reduced-dimensions" className="text-sm text-gray-400 mt-3">
                                    Розмір: {reducedDimensions[0]} x {reducedDimensions[1]} пікселів
                                </p>
                            )}
                        </section>
                    )}
                    <section className="text-center">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Оригінал</h3>
                        <div className="w-full max-w-xl mx-auto h-64 sm:h-80 md:h-96 bg-gray-700/50 rounded-xl flex items-center justify-center border border-gray-600 overflow-hidden shadow-lg">
                            {originalImageBase64 ? (
                                <img
                                    id="original-image-preview"
                                    src={originalImageBase64}
                                    alt="Оригінал"
                                    className="max-h-full max-w-full object-contain cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => setModalImage({ src: originalImageBase64, alt: 'Оригінал' })}
                                />
                            ) : (
                                <span id="original-placeholder" className="text-gray-500">{(isProcessing || isFileLoading) && !originalImageBase64 ? 'Завантаження...' : 'Зображення не вибрано'}</span>
                            )}
                        </div>
                        {originalDimensions && (
                            <p id="original-dimensions" className="text-sm text-gray-400 mt-3">
                                Розмір: {originalDimensions.width} x {originalDimensions.height} пікселів
                            </p>
                        )}
                    </section>
                    {averageTimes && Object.keys(averageTimes).length > 0 ? (
                        <section className="text-center pt-6 border-t border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4">Середні часи обробки</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {Object.entries(averageTimes).map(([method, stats]) => (
                                    <div key={method} className="bg-gray-700 rounded-lg p-4">
                                        <p className="text-gray-300 font-medium">{method}</p>
                                        <p className="text-gray-400">Час: {stats.avg_time.toFixed(2)} сек</p>
                                        <p className="text-gray-400">MSE: {stats.avg_mse.toFixed(2)}</p>
                                        <p className="text-gray-500 text-sm">Дані на основі {stats.image_count} зображень</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : averageTimesError ? (
                        <section className="text-center pt-6 border-t border-gray-700">
                            <p className="text-red-400">{averageTimesError}</p>
                        </section>
                    ) : null}
                    {result && pollingStatus === 'SUCCESS' && result.results && (
                        <section id="results-section" className="space-y-10 md:space-y-12 animate-fade-in pt-6 border-t border-gray-700">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <h3 className="text-2xl md:text-3xl font-semibold text-gray-100">Результати Порівняння</h3>
                                <div className="relative inline-block text-left">
                                    <label htmlFor="sort-select" className="sr-only">Сортувати за</label>
                                    <select
                                        id="sort-select"
                                        value={sortBy}
                                        onChange={(e) => {
                                            console.log('Sort by changed to:', e.target.value);
                                            setSortBy(e.target.value);
                                        }}
                                        className="appearance-none w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-lg py-2 px-4 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all hover:bg-gray-600 cursor-pointer"
                                        aria-label="Сортувати результати за критерієм"
                                    >
                                        <option value="psnr">За PSNR (найкращий зверху)</option>
                                        <option value="ssim">За SSIM (найкращий зверху)</option>
                                        <option value="mse">За MSE (менший зверху)</option>
                                        <option value="gradient">За Gradient Diff (менший зверху)</option>
                                        <option value="time">За часом (швидший зверху)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div id="results-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {sortedResults.map(([method, data]) => (
                                    <ResultCard
                                        key={method}
                                        method={method}
                                        methodDisplay={method}
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
                                bestMseMethod={chartData.bestMseMethod}
                                bestGradientMethod={chartData.bestGradientMethod}
                                bestTimeMethod={chartData.bestTimeMethod}
                            />
                            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <MetricChart
                                    title="PSNR"
                                    label="PSNR (дБ)"
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
                                <MetricChart
                                    title="Різниця градієнтів"
                                    label="Різниця градієнтів"
                                    data={chartData.gradient}
                                    backgroundColor='rgba(255, 99, 132, 0.7)'
                                    borderColor='rgba(255, 99, 132, 1)'
                                />
                                <MetricChart
                                    title="MSE"
                                    label="MSE"
                                    data={chartData.mse}
                                    backgroundColor='rgba(255, 159, 64, 0.7)'
                                    borderColor='rgba(255, 159, 64, 1)'
                                />
                                <MetricChart
                                    title="Час обробки"
                                    label="Час (сек)"
                                    data={chartData.time}
                                    backgroundColor='rgba(255, 206, 86, 0.7)'
                                    borderColor='rgba(255, 206, 86, 1)'
                                />
                            </div>
                        </section>
                    )}
                    {pollingStatus === 'FAILURE' && (
                        <div className="text-center text-red-400">
                            <p>Не вдалося обробити зображення.</p>
                            <p>Спробуйте ще раз або виберіть інше зображення.</p>
                        </div>
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
                select {
                    background: linear-gradient(145deg, #2d2d3a, #1e1e27);
                    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.3), inset -2px -2px 5px rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                }
                select:hover {
                    background: linear-gradient(145deg, #3a3a4a, #252531);
                }
                select:focus {
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
                }
                option {
                    background: #2d2d3a;
                    color: #d1d5db;
                }
            `}</style>
        </div>
    );
}

export default App;