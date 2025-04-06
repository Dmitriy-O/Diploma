import cv2
import numpy as np
from scipy.interpolate import RectBivariateSpline

def bilinear_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    new_height = int(image.shape[0] * scale_factor)
    new_width = int(image.shape[1] * scale_factor)
    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)

def bicubic_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    new_height = int(image.shape[0] * scale_factor)
    new_width = int(image.shape[1] * scale_factor)
    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

def biquadratic_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
    height, width, channels = image.shape
    if channels != 3:
        raise ValueError("Изображение должно иметь 3 канала (RGB/BGR)")
    if image.dtype != np.uint8:
        raise ValueError("Тип данных изображения должен быть uint8")

    new_height = int(height * scale_factor)
    new_width = int(width * scale_factor)
    
    x = np.arange(width)
    y = np.arange(height)
    x_new = np.linspace(0, width - 1, new_width)
    y_new = np.linspace(0, height - 1, new_height)
    
    upscaled = np.zeros((new_height, new_width, channels), dtype=np.float32)
    for channel in range(channels):
        spline = RectBivariateSpline(y, x, image[:, :, channel], kx=2, ky=2)
        upscaled[:, :, channel] = spline(y_new, x_new)
    
    upscaled = np.clip(upscaled, 0, 255).astype(np.uint8)
    return upscaled

INTERPOLATION_METHODS = {
    "bilinear": bilinear_interpolation,
    "bicubic": bicubic_interpolation,
    "biquadratic": biquadratic_interpolation
}