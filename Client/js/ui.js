import { ERROR_TIMEOUT } from './constants.js';

/**
 * Управляет индикатором загрузки
 * @param {boolean} show - Показать или скрыть
 * @param {string} [message] - Сообщение для отображения
 */
export function toggleLoader(show, message = 'Обработка изображения...') {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    if (show) {
        loaderText.textContent = message;
        loader.classList.remove('hidden');
        gsap.to(loader, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
    } else {
        gsap.to(loader, { opacity: 0, scale: 0.8, duration: 0.5, ease: 'power3.in', onComplete: () => loader.classList.add('hidden') });
    }
}

/**
 * Показывает сообщение об ошибке
 * @param {string} message - Основное сообщение
 * @param {string} [details] - Детали ошибки
 */
export function showError(message, details) {
    const errorMessage = document.getElementById('error-message');
    const errorDetails = document.getElementById('error-details');
    errorMessage.querySelector('p').textContent = message;
    errorDetails.textContent = details || '';
    errorMessage.classList.remove('hidden');
    gsap.to(errorMessage, { opacity: 1, y: 0, duration: 0.5 });
    setTimeout(() => hideError(), ERROR_TIMEOUT);
}

/**
 * Скрывает сообщение об ошибке
 */
export function hideError() {
    const errorMessage = document.getElementById('error-message');
    gsap.to(errorMessage, { opacity: 0, y: 20, duration: 0.5, onComplete: () => {
        errorMessage.classList.add('hidden');
        errorMessage.querySelector('p').textContent = '';
        document.getElementById('error-details').textContent = '';
    }});
}

/**
 * Сбрасывает область результатов
 */
export function resetResultsArea() {
    const resultsSection = document.getElementById('results-section');
    const resultsContainer = document.getElementById('results-container');
    const metricsTable = document.getElementById('metrics-table');
    resultsSection.classList.add('hidden');
    resultsContainer.innerHTML = '';
    metricsTable.innerHTML = '';
    if (window.psnrChart) window.psnrChart.destroy();
    if (window.ssimChart) window.ssimChart.destroy();
}

/**
 * Открывает модальное окно с изображением
 * @param {string} src - URL изображения
 */
export function openModal(src) {
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    modalImage.src = src;
    modal.classList.remove('hidden');
    gsap.fromTo(modalImage, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' });
}

/**
 * Закрывает модальное окно
 */
export function closeModal() {
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    gsap.to(modalImage, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power3.in', onComplete: () => {
        modal.classList.add('hidden');
        modalImage.src = '#';
    }});
}

/**
 * Создаёт графики PSNR и SSIM
 * @param {string[]} methods - Список методов
 * @param {number[]} psnrValues - Значения PSNR
 * @param {number[]} ssimValues - Значения SSIM
 */
export function createCharts(methods, psnrValues, ssimValues) {
    const psnrChartCanvas = document.getElementById('psnr-chart');
    const ssimChartCanvas = document.getElementById('ssim-chart');

    window.psnrChart = new Chart(psnrChartCanvas, {
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
                y: { beginAtZero: true, title: { display: true, text: 'PSNR (dB)', color: '#d1d5db' }, ticks: { color: '#d1d5db' }, grid: { color: '#4b5563' } },
                x: { ticks: { color: '#d1d5db' }, grid: { color: '#4b5563' } }
            },
            plugins: { legend: { labels: { color: '#d1d5db' } } }
        }
    });

    window.ssimChart = new Chart(ssimChartCanvas, {
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
                y: { beginAtZero: true, max: 1, title: { display: true, text: 'SSIM', color: '#d1d5db' }, ticks: { color: '#d1d5db' }, grid: { color: '#4b5563' } },
                x: { ticks: { color: '#d1d5db' }, grid: { color: '#4b5563' } }
            },
            plugins: { legend: { labels: { color: '#d1d5db' } } }
        }
    });
}