# import numpy as np
# import cv2
# import logging

# logger = logging.getLogger(__name__)

# def process_image_in_chunks(image: np.ndarray, scale_factor: float, interpolation_func, chunk_size=512, overlap=32):
#     """
#     Обрабатывает изображение по частям для экономии памяти.
    
#     Args:
#         image: Исходное изображение (RGB, np.ndarray).
#         scale_factor: Коэффициент масштабирования.
#         interpolation_func: Функция интерполяции (например, bilinear_interpolation).
#         chunk_size: Размер чанка (по умолчанию 512 пикселей).
    
#     Returns:
#         Увеличенное изображение (np.ndarray).
#     """
#     height, width = image.shape[:2]
#     new_height, new_width = int(height * scale_factor), int(width * scale_factor)
#     upscaled = np.zeros((new_height, new_width, 3), dtype=np.uint8)
    
#     for y in range(0, height, chunk_size - overlap):
#         for x in range(0, width, chunk_size - overlap):
#             y_start = y
#             x_start = x
#             y_end = min(y + chunk_size, height)
#             x_end = min(x + chunk_size, width)
#             chunk = image[y_start:y_end, x_start:x_end]
            
#             chunk_upscaled = interpolation_func(chunk, scale_factor)
#             upscaled_y_start = int(y_start * scale_factor)
#             upscaled_x_start = int(x_start * scale_factor)
#             upscaled_y_end = upscaled_y_start + chunk_upscaled.shape[0]
#             upscaled_x_end = upscaled_x_start + chunk_upscaled.shape[1]
            
#             # Избегаем перекрытия при записи результатов
#             upscaled_y_end = min(upscaled_y_end, new_height)
#             upscaled_x_end = min(upscaled_x_end, new_width)
#             upscaled[upscaled_y_start:upscaled_y_end, upscaled_x_start:upscaled_x_end] = chunk_upscaled[
#                 :upscaled_y_end - upscaled_y_start, :upscaled_x_end - upscaled_x_start
#             ]
    
#     logger.info(f"Обработка чанками завершена: {width}x{height} -> {new_width}x{new_height}")
#     return upscaled

# TODO delete this