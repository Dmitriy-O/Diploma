// Инициализация DOM элементов
const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const originalImagePreview = document.getElementById('original-image-preview');
const originalPlaceholder = document.getElementById('original-placeholder');
const originalDimensions = document.getElementById('original-dimensions');

const scaleFactorInput = document.getElementById('scale-factor');
const upscaleButton = document.getElementById('upscale-button');

const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');

const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const metricsTable = document.getElementById('metrics-table');
const psnrChartCanvas = document.getElementById('psnr-chart');
const ssimChartCanvas = document.getElementById('ssim-chart');

const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const modalClose = document.getElementById('modal-close');

// Переменные состояния
let originalImageBase64 = null;
let isProcessing = false;
let psnrChart = null;
let ssimChart = null;

// URL бэкенда
const BACKEND_URL = 'http://127.0.0.1:8000/upscale_all_methods/';

// Функция для конвертации файла в Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Функция для управления индикатором загрузки
function toggleLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
        upscaleButton.disabled = true;
        upscaleButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
    } else {
        loader.classList.add('hidden');
        upscaleButton.disabled = !originalImageBase64 || isProcessing;
        if (originalImageBase64 && !isProcessing) {
            upscaleButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
        }
    }
}

// Функция для отображения ошибки
function showError(message, details) {
    errorMessage.classList.remove('hidden');
    errorMessage.querySelector('p').textContent = message;
    errorDetails.textContent = details || '';
    gsap.to(errorMessage, { opacity: 1, y: 0, duration: 0.5 });
    resultsSection.classList.add('hidden');
}

// Функция для скрытия ошибки
function hideError() {
    gsap.to(errorMessage, { opacity: 0, y: 20, duration: 0.5, onComplete: () => {
        errorMessage.classList.add('hidden');
        errorDetails.textContent = '';
    }});
}

// Функция для сброса области результатов
function resetResultsArea() {
    resultsSection.classList.add('hidden');
    resultsContainer.innerHTML = '';
    metricsTable.innerHTML = '';
    if (psnrChart) psnrChart.destroy();
    if (ssimChart) ssimChart.destroy();
}

// Функция для открытия модального окна
function openModal(src) {
    modalImage.src = src;
    modal.classList.remove('hidden');
    gsap.fromTo(modalImage, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' });
}

// Функция для закрытия модального окна
function closeModal() {
    gsap.to(modalImage, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power3.in', onComplete: () => {
        modal.classList.add('hidden');
        modalImage.src = '#';
    }});
}

// Анимация появления элементов при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    gsap.from('header', { opacity: 0, y: -50, duration: 1, ease: 'power3.out' });
    gsap.from('.container > div', { opacity: 0, y: 20, stagger: 0.2, duration: 1, ease: 'power3.out', delay: 0.5 });
});

// Обработчик события для загрузки файла
fileUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showError('Неподдерживаемый формат файла.', 'Пожалуйста, выберите PNG, JPG или WEBP.');
        fileUpload.value = '';
        return;
    }

    hideError();
    resetResultsArea();
    fileNameDisplay.textContent = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;

    try {
        originalImageBase64 = await fileToBase64(file);
        originalImagePreview.src = originalImageBase64;
        originalImagePreview.classList.remove('hidden');
        originalPlaceholder.classList.add('hidden');
        upscaleButton.disabled = false;
        upscaleButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');

        originalImagePreview.onload = () => {
            originalDimensions.textContent = `Размер: ${originalImagePreview.naturalWidth} x ${originalImagePreview.naturalHeight} px`;
            gsap.from(originalImagePreview, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'back.out(1.7)' });
        };
    } catch (error) {
        showError('Не удалось прочитать файл.', error.message);
        originalImageBase64 = null;
        upscaleButton.disabled = true;
        upscaleButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
        fileNameDisplay.textContent = 'Выберите изображение';
        originalImagePreview.classList.add('hidden');
        originalPlaceholder.classList.remove('hidden');
        originalDimensions.textContent = '';
    }
});

// Обработчик события для кнопки "Увеличить"
upscaleButton.addEventListener('click', async () => {
    if (!originalImageBase64) {
        showError('Пожалуйста, сначала выберите изображение.');
        return;
    }

    if (isProcessing) {
        showError('Запрос уже выполняется.', 'Пожалуйста, дождитесь завершения текущей обработки.');
        return;
    }

    hideError();
    resetResultsArea();
    toggleLoader(true);
    isProcessing = true;

    const scaleFactor = parseFloat(scaleFactorInput.value);

    if (isNaN(scaleFactor) || scaleFactor <= 1.0) {
        showError('Некорректный коэффициент увеличения.', 'Значение должно быть числом больше 1.');
        toggleLoader(false);
        isProcessing = false;
        return;
    }

    const requestBody = {
        image_base64: originalImageBase64,
        scale_factor: scaleFactor,
        algorithm: "bicubic" // Поле всё ещё требуется, но не используется
    };

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            let errorMessage = 'Неизвестная ошибка';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (parseError) {
                errorMessage = `Ошибка сервера: ${response.status}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('Response from backend:', result);

        if (!result.results || typeof result.results !== 'object') {
            throw new Error('Некорректный ответ от сервера: отсутствуют результаты.');
        }

        // Определяем лучшие метрики и собираем данные для графиков
        let bestPsnr = -Infinity;
        let bestSsim = -Infinity;
        let bestPsnrMethod = '';
        let bestSsimMethod = '';
        const methods = [];
        const psnrValues = [];
        const ssimValues = [];

        for (const [method, data] of Object.entries(result.results)) {
            methods.push(method.charAt(0).toUpperCase() + method.slice(1));
            psnrValues.push(data.psnr);
            ssimValues.push(data.ssim);

            if (data.psnr > bestPsnr) {
                bestPsnr = data.psnr;
                bestPsnrMethod = method;
            }
            if (data.ssim > bestSsim) {
                bestSsim = data.ssim;
                bestSsimMethod = method;
            }
        }

        // Отображаем результаты
        resultsSection.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        metricsTable.innerHTML = '';

        for (const [method, data] of Object.entries(result.results)) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'text-center';
            resultDiv.innerHTML = `
                <h4 class="text-md font-semibold text-gray-200 mb-2">${method.charAt(0).toUpperCase() + method.slice(1)}</h4>
                <div class="w-full h-96 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden relative group cursor-pointer">
                    <img src="${data.upscaled_image_base64}" alt="Увеличенное изображение (${method})" class="max-h-full max-w-full object-contain">
                    <button data-method="${method}" class="download-button absolute bottom-3 right-3 bg-indigo-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" title="Скачать результат">
                        <i data-lucide="download" class="h-5 w-5"></i>
                    </button>
                </div>
                <div class="w-full h-96 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden relative group cursor-pointer mt-4">
                    <img src="${data.diff_image_base64}" alt="Разница (${method})" class="max-h-full max-w-full object-contain">
                </div>
                <div class="text-sm text-gray-400 mt-2 space-y-1">
                    <p>Новый размер: ${data.upscaled_shape[0]} x ${data.upscaled_shape[1]} px</p>
                    <p>${data.message}</p>
                </div>
            `;
            resultsContainer.appendChild(resultDiv);

            // Добавляем метрики в таблицу
            const row = document.createElement('tr');
            row.className = `${method === bestPsnrMethod ? 'best-psnr' : ''} ${method === bestSsimMethod ? 'best-ssim' : ''}`;
            row.innerHTML = `
                <td class="px-4 py-2 text-left">${method.charAt(0).toUpperCase() + method.slice(1)}</td>
                <td class="px-4 py-2 text-left">${data.psnr.toFixed(2)}</td>
                <td class="px-4 py-2 text-left">${data.ssim.toFixed(3)}</td>
            `;
            metricsTable.appendChild(row);

            // Анимация появления
            gsap.from(resultDiv.querySelectorAll('img'), { opacity: 0, scale: 0.9, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.2 });
            gsap.from(resultDiv.querySelectorAll('p'), { opacity: 0, y: 10, stagger: 0.1, duration: 0.5, ease: 'power3.out', delay: 0.3 });
        }

        // Создаём графики
        psnrChart = new Chart(psnrChartCanvas, {
            type: 'bar',
            data: {
                labels: methods,
                datasets: [{
                    label: 'PSNR (dB)',
                    data: psnrValues,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'PSNR (dB)',
                            color: '#d1d5db'
                        },
                        ticks: {
                            color: '#d1d5db'
                        },
                        grid: {
                            color: '#4b5563'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#d1d5db'
                        },
                        grid: {
                            color: '#4b5563'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#d1d5db'
                        }
                    }
                }
            }
        });

        ssimChart = new Chart(ssimChartCanvas, {
            type: 'bar',
            data: {
                labels: methods,
                datasets: [{
                    label: 'SSIM',
                    data: ssimValues,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        title: {
                            display: true,
                            text: 'SSIM',
                            color: '#d1d5db'
                        },
                        ticks: {
                            color: '#d1d5db'
                        },
                        grid: {
                            color: '#4b5563'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#d1d5db'
                        },
                        grid: {
                            color: '#4b5563'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#d1d5db'
                        }
                    }
                }
            }
        });

        lucide.createIcons();
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            showError('Не удалось подключиться к серверу.', 'Проверьте, запущен ли бэкенд на http://127.0.0.1:8000.');
        } else {
            showError('Ошибка при обработке запроса.', error.message);
        }
    } finally {
        toggleLoader(false);
        isProcessing = false;
    }
});

// Обработчик клика для увеличенного просмотра
document.addEventListener('click', (event) => {
    const img = event.target.closest('img');
    if (img && (img.id === 'original-image-preview' || img.parentElement.classList.contains('group'))) {
        openModal(img.src);
    }
});

// Обработчик для кнопок "Скачать"
document.addEventListener('click', (event) => {
    if (event.target.closest('.download-button')) {
        const button = event.target.closest('.download-button');
        const method = button.getAttribute('data-method');
        const upscaledImageBase64 = button.closest('div').querySelector('img').src;
        if (!upscaledImageBase64) {
            return;
        }

        const link = document.createElement('a');
        link.href = upscaledImageBase64;
        const mimeMatch = upscaledImageBase64.match(/data:image\/(\w+);/);
        const extension = mimeMatch ? mimeMatch[1] : 'png';
        const scaleFactor = scaleFactorInput.value;
        const fileName = fileNameDisplay.textContent.split('.')[0];
        link.download = `${fileName}_upscaled_${method}_x${scaleFactor}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

// Обработчик закрытия модального окна
modalClose.addEventListener('click', closeModal);

// Закрытие модального окна при клике вне изображения
modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Инициализация иконок Lucide
lucide.createIcons();