# # core/interpolation.py
# import cv2
# import numpy as np
# from scipy.interpolate import RegularGridInterpolator

# def bilinear_interpolation(image: np.ndarray, scale_factor: float) -> np.ndarray:
#     new_height = int(image.shape[0] * scale_factor)
#     new_width = int(image.shape[1] * scale_factor)
#     return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)

# # Кубический сплайн для вычисления весов
# def cubic_kernel(x):
#     x = abs(x)
#     if x <= 1:
#         return 1.5 * x**3 - 2.5 * x**2 + 1
#     elif x < 2:
#         return -0.5 * x**3 + 2.5 * x**2 - 4 * x + 2
#     else:
#         return 0

# # Функция бикубической интерполяции
# def bicubic_interpolate(image, scale_factor):
#     height, width, channels = image.shape
#     new_height = int(height * scale_factor)
#     new_width = int(width * scale_factor)
#     upscaled = np.zeros((new_height, new_width, channels), dtype=np.uint8)
    
#     for y in range(new_height):
#         for x in range(new_width):
#             # Координаты в исходном изображении
#             src_x = x / scale_factor
#             src_y = y / scale_factor
#             x0 = int(src_x)  # Ближайший целый пиксель
#             y0 = int(src_y)
            
#             # Веса по X и Y для 4x4 сетки
#             weights_x = [cubic_kernel(src_x - (x0 + i - 1)) for i in range(4)]
#             weights_y = [cubic_kernel(src_y - (y0 + i - 1)) for i in range(4)]
            
#             # Вычисление значения для каждого канала
#             for c in range(channels):
#                 value = 0
#                 for i in range(4):
#                     for j in range(4):
#                         # Ограничение координат, чтобы не выйти за пределы
#                         px = min(max(x0 + i - 1, 0), width - 1)
#                         py = min(max(y0 + j - 1, 0), height - 1)
#                         value += image[py, px, c] * weights_x[i] * weights_y[j]
#                 upscaled[y, x, c] = max(0, min(255, value))  # Ограничение 0-255
    
#     return upscaled

# # Пример использования
# image = np.random.randint(0, 255, (10, 10, 3), dtype=np.uint8)  # Случайное изображение
# upscaled_image = bicubic_interpolate(image, 2)  # Увеличение в 2 раза
# print(upscaled_image.shape)  # (20, 20, 3)

# # Квадратичный сплайн для вычисления весов
# def quadratic_kernel(x):
#     x = abs(x)
#     if x <= 0.5:
#         return 0.75 - x**2
#     elif x < 1.5:
#         return 0.5 * (x - 1.5)**2
#     else:
#         return 0

# # Функция биквадратичной интерполяции
# def biquadratic_interpolate(image, scale_factor):
#     height, width, channels = image.shape
#     new_height = int(height * scale_factor)
#     new_width = int(width * scale_factor)
#     upscaled = np.zeros((new_height, new_width, channels), dtype=np.uint8)
    
#     for y in range(new_height):
#         for x in range(new_width):
#             # Координаты в исходном изображении
#             src_x = x / scale_factor
#             src_y = y / scale_factor
#             x0 = int(src_x)
#             y0 = int(src_y)
            
#             # Веса по X и Y для 3x3 сетки
#             weights_x = [quadratic_kernel(src_x - (x0 + i - 1)) for i in range(3)]
#             weights_y = [quadratic_kernel(src_y - (y0 + i - 1)) for i in range(3)]
            
#             # Вычисление значения для каждого канала
#             for c in range(channels):
#                 value = 0
#                 for i in range(3):
#                     for j in range(3):
#                         px = min(max(x0 + i - 1, 0), width - 1)
#                         py = min(max(y0 + j - 1, 0), height - 1)
#                         value += image[py, px, c] * weights_x[i] * weights_y[j]
#                 upscaled[y, x, c] = max(0, min(255, value))
    
#     return upscaled

# # Пример использования
# image = np.random.randint(0, 255, (10, 10, 3), dtype=np.uint8)
# upscaled_image = biquadratic_interpolate(image, 2)
# print(upscaled_image.shape)  # (20, 20, 3)

# INTERPOLATION_METHODS = {
#     "bilinear": bilinear_interpolation,
#     "bicubic": bicubic_interpolate,
#     "biquadratic": biquadratic_interpolate
# }




import cv2
import numpy as np
from scipy.interpolate import RegularGridInterpolator

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
    new_height = int(height * scale_factor)
    new_width = int(width * scale_factor)
    
    # Создаём координаты для исходной сетки
    x = np.linspace(0, width - 1, width)
    y = np.linspace(0, height - 1, height)
    
    # Создаём координаты для новой сетки
    x_new = np.linspace(0, width - 1, new_width)
    y_new = np.linspace(0, height - 1, new_height)
    
    # Создаём сетку для интерполяции
    X_new, Y_new = np.meshgrid(x_new, y_new)
    points_new = np.stack([Y_new, X_new], axis=-1)  # Формат (y, x) для RegularGridInterpolator
    
    upscaled = np.zeros((new_height, new_width, channels), dtype=np.uint8)
    for channel in range(channels):
        # Создаём интерполятор
        interpolator = RegularGridInterpolator(
            (y, x),
            image[:, :, channel],
            method='linear',  # Можно использовать 'linear' или 'cubic', но 'quadratic' недоступен
            bounds_error=False,
            fill_value=None
        )
        # Интерполируем
        upscaled[:, :, channel] = interpolator(points_new).astype(np.uint8)
    
    return upscaled

INTERPOLATION_METHODS = {
    "bilinear": bilinear_interpolation,
    "bicubic": bicubic_interpolation,
    "biquadratic": biquadratic_interpolation
}