export const BACKEND_URL = 'http://127.0.0.1:8000/upscale_all_methods/';
export const TASK_STATUS_URL = 'http://127.0.0.1:8000/task/';
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const ERROR_TIMEOUT = 5000; // 5 секунд для автоскрытия ошибок
export const POLL_INTERVAL = 1000; // Интервал опроса статуса задачи (1 секунда)