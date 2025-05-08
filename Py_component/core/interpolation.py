import cv2
import numpy as np
from scipy.interpolate import RectBivariateSpline
import logging

# Налаштування логування
logger = logging.getLogger(__name__)

def check_opencv_build():
    """Виводить інформацію про версію та збірку OpenCV."""
    logger.info(f"Версія OpenCV: {cv2.__version__}")
    logger.info("Інформація про збірку OpenCV:")
    logger.info(cv2.getBuildInformation())

# Виклик функції для перевірки збірки OpenCV
check_opencv_build()

def validate_image(image: np.ndarray, scale_factor: float, method_name: str) -> tuple[int, int]:
    """
    Перевіряє коректність вхідного зображення та scale_factor.

    Args:
        image (np.ndarray): Вхідне зображення у форматі numpy масиву (H, W, C).
        scale_factor (float): Коефіцієнт масштабування.
        method_name (str): Назва методу для логування.

    Returns:
        tuple[int, int]: Нові розміри (висота, ширина).

    Raises:
        ValueError: Якщо параметри некорректні.
    """
    if not isinstance(image, np.ndarray) or len(image.shape) != 3 or image.shape[2] != 3:
        raise ValueError("Зображення повинно бути RGB/BGR (3 канали)")
    if image.dtype != np.uint8:
        raise ValueError("Тип даних зображення має бути uint8")
    if scale_factor <= 0:
        raise ValueError("Коефіцієнт масштабування має бути позитивним")

    height, width = image.shape[:2]
    target_height = int(height * scale_factor)
    target_width = int(width * scale_factor)
    
    if target_height < 1 or target_width < 1:
        raise ValueError("Нові розміри зображення мають бути більше 0")

    logger.info(f"{method_name}: {width}x{height} -> {target_width}x{target_height}")
    return target_height, target_width

def bilinear_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """
    Масштабує зображення за допомогою білінейної інтерполяції.

    Args:
        image (np.ndarray): Вхідне зображення у форматі numpy масиву (H, W, C).
        scale_factor (float): Коефіцієнт масштабування (>1 для збільшення, <1 для зменшення).

    Returns:
        np.ndarray: Масштабоване зображення.

    Raises:
        ValueError: Якщо вхідні параметри некорректні.
    """
    try:
        target_height, target_width = validate_image(image, scale_factor, "Білінейна інтерполяція")
        return cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_LINEAR)
    except Exception as e:
        logger.error(f"Помилка в білінейній інтерполяції: {str(e)}")
        raise

def bicubic_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """
    Масштабує зображення за допомогою бікубічної інтерполяції.

    Args:
        image (np.ndarray): Вхідне зображення у форматі numpy масиву (H, W, C).
        scale_factor (float): Коефіцієнт масштабування (>1 для збільшення, <1 для зменшення).

    Returns:
        np.ndarray: Масштабоване зображення.

    Raises:
        ValueError: Якщо вхідні параметри некорректні.
    """
    try:
        target_height, target_width = validate_image(image, scale_factor, "Бікубічна інтерполяція")
        return cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_CUBIC)
    except Exception as e:
        logger.error(f"Помилка в бікубічній інтерполяції: {str(e)}")
        raise

def biquadratic_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """
    Масштабує зображення за допомогою біквадратичної інтерполяції на основі сплайнів.

    Args:
        image (np.ndarray): Вхідне зображення у форматі numpy масиву (H, W, C).
        scale_factor (float): Коефіцієнт масштабування (>1 для збільшення, <1 для зменшення).

    Returns:
        np.ndarray: Масштабоване зображення.

    Raises:
        ValueError: Якщо вхідні параметри некорректні.
    """
    try:
        target_height, target_width = validate_image(image, scale_factor, f"Біквадратична інтерполяція {'(зменшення)' if scale_factor < 1 else '(збільшення)'}")
        
        height, width, channels = image.shape
        x = np.arange(width)
        y = np.arange(height)
        x_new = np.linspace(0, width - 1, target_width)
        y_new = np.linspace(0, height - 1, target_height)
        
        # Створюємо масив для масштабованого зображення
        scaled = np.zeros((target_height, target_width, channels), dtype=np.float32)
        
        # Інтерполюємо кожен канал окремо
        for channel in range(channels):
            # Використовуємо біквадратичний сплайн (kx=2, ky=2)
            spline = RectBivariateSpline(y, x, image[:, :, channel], kx=2, ky=2)
            scaled[:, :, channel] = spline(y_new, x_new)
        
        # Обрізаємо значення до діапазону [0, 255] і конвертуємо в uint8
        scaled = np.clip(scaled, 0, 255).astype(np.uint8)
        return scaled
    except Exception as e:
        logger.error(f"Помилка в біквадратичній інтерполяції: {str(e)}")
        raise

# Словник методів інтерполяції
INTERPOLATION_METHODS = {
    "bilinear": bilinear_interpolation,
    "bicubic": bicubic_interpolation,
    "biquadratic": biquadratic_interpolation
}