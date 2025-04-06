import { SUPPORTED_IMAGE_TYPES, MAX_FILE_SIZE } from './constants.js';

/**
 * Конвертирует файл в Base64
 * @param {File} file - Файл для конвертации
 * @returns {Promise<string>} Base64-строка
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Проверяет, является ли файл допустимым изображением
 * @param {File} file - Файл для проверки
 * @returns {boolean} Поддерживается ли тип файла
 */
export function isValidImageType(file) {
    return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Проверяет размер файла
 * @param {File} file - Файл для проверки
 * @returns {boolean} Соответствует ли размер ограничению
 */
export function isValidFileSize(file) {
    return file.size <= MAX_FILE_SIZE;
}