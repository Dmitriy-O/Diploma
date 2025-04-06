import { BACKEND_URL, TASK_STATUS_URL, POLL_INTERVAL } from './constants.js';

/**
 * Отправляет запрос на бэкенд для увеличения изображения
 * @param {Object} data - Данные для отправки (image_base64, scale_factor, algorithm)
 * @returns {Promise<string>} ID задачи
 */
export async function upscaleImage(data) {
    const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
    }
    const result = await response.json();
    return result.task_id;
}

/**
 * Проверяет статус задачи и возвращает результат, когда он готов
 * @param {string} taskId - ID задачи
 * @returns {Promise<Object>} Результат задачи
 */
export async function pollTaskStatus(taskId) {
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${TASK_STATUS_URL}${taskId}`);
                if (!response.ok) {
                    throw new Error(`Ошибка при проверке статуса: ${response.status}`);
                }
                const data = await response.json();
                if (data.status === 'Готово') {
                    clearInterval(interval);
                    resolve(data.result);
                } else if (data.status === 'FAILURE') {
                    clearInterval(interval);
                    reject(new Error('Задача завершилась с ошибкой.'));
                }
            } catch (error) {
                clearInterval(interval);
                reject(error);
            }
        }, POLL_INTERVAL);
    });
}