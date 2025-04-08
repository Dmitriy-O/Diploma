import cv2
import numpy as np
from scipy.interpolate import RectBivariateSpline
import logging

logger = logging.getLogger(__name__)

def bilinear_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """Увеличивает изображение с использованием билинейной интерполяции.

    Args:
        image (np.ndarray): Исходное изображение в формате numpy массива (H, W, C).
        scale_factor (float): Коэффициент масштабирования (>1 для увеличения).

    Returns:
        np.ndarray: Увеличенное изображение.

    Raises:
        ValueError: Если входные параметры некорректны.
    """
    new_height = int(image.shape[0] * scale_factor)
    new_width = int(image.shape[1] * scale_factor)
    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)

def bicubic_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """Увеличивает изображение с использованием бикубической интерполяции.

    Args:
        image (np.ndarray): Исходное изображение в формате numpy массива (H, W, C).
        scale_factor (float): Коэффициент масштабирования (>1 для увеличения).

    Returns:
        np.ndarray: Увеличенное изображение.
    """
    new_height = int(image.shape[0] * scale_factor)
    new_width = int(image.shape[1] * scale_factor)
    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

def biquadratic_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """Увеличивает изображение с использованием биквадратичной интерполяции на основе сплайнов.

    Args:
        image (np.ndarray): Исходное изображение в формате numpy массива (H, W, C).
        scale_factor (float): Коэффициент масштабирования (>1 для увеличения).

    Returns:
        np.ndarray: Увеличенное изображение.

    Raises:
        ValueError: Если изображение не имеет 3 канала или неверный тип данных.
    """
    try:
        height, width, channels = image.shape
        if channels != 3:
            raise ValueError("Изображение должно иметь 3 канала (RGB/BGR)")
        if image.dtype != np.uint8:
            raise ValueError("Тип данных изображения должен быть uint8")

        # Используем точные размеры исходного изображения, умноженные на scale_factor
        target_height = int(height * scale_factor)
        target_width = int(width * scale_factor)
        
        x = np.arange(width)
        y = np.arange(height)
        x_new = np.linspace(0, width - 1, target_width)
        y_new = np.linspace(0, height - 1, target_height)
        
        upscaled = np.zeros((target_height, target_width, channels), dtype=np.float32)
        for channel in range(channels):
            spline = RectBivariateSpline(y, x, image[:, :, channel], kx=2, ky=2)
            upscaled[:, :, channel] = spline(y_new, x_new)
        
        upscaled = np.clip(upscaled, 0, 255).astype(np.uint8)
        logger.info(f"Биквадратная интерполяция (увеличение): {width}x{height} -> {target_width}x{target_height}")
        return upscaled
    except Exception as e:
        logger.error(f"Ошибка в биквадратной интерполяции (увеличение): {str(e)}")
        raise

def biquadratic_downscale(image: np.ndarray, scale_factor: float) -> np.ndarray:
    """Уменьшает изображение с использованием биквадратичной интерполяции.

    Args:
        image (np.ndarray): Исходное изображение в формате numpy массива (H, W, C).
        scale_factor (float): Коэффициент уменьшения (<1 для уменьшения).

    Returns:
        np.ndarray: Уменьшенное изображение.

    Raises:
        ValueError: Если изображение не имеет 3 канала или неверный тип данных.
    """
    try:
        height, width, channels = image.shape
        if channels != 3:
            raise ValueError("Изображение должно иметь 3 канала (RGB/BGR)")
        if image.dtype != np.uint8:
            raise ValueError("Тип данных изображения должен быть uint8")

        target_height = int(height * scale_factor)
        target_width = int(width * scale_factor)
        
        x = np.arange(width)
        y = np.arange(height)
        x_new = np.linspace(0, width - 1, target_width)
        y_new = np.linspace(0, height - 1, target_height)
        
        downscaled = np.zeros((target_height, target_width, channels), dtype=np.float32)
        for channel in range(channels):
            spline = RectBivariateSpline(y, x, image[:, :, channel], kx=2, ky=2)
            downscaled[:, :, channel] = spline(y_new, x_new)
        
        downscaled = np.clip(downscaled, 0, 255).astype(np.uint8)
        logger.info(f"Биквадратная интерполяция (уменьшение): {width}x{height} -> {target_width}x{target_height}")
        return downscaled
    except Exception as e:
        logger.error(f"Ошибка в биквадратной интерполяции (уменьшение): {str(e)}")
        raise

INTERPOLATION_METHODS = {
    "bilinear": bilinear_interpolation,
    "bicubic": bicubic_interpolation,
    "biquadratic": biquadratic_interpolation
}