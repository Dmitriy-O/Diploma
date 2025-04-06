from celery import Celery
import cv2
import numpy as np
import base64
from core.interpolation import INTERPOLATION_METHODS
from skimage.metrics import peak_signal_noise_ratio as psnr, structural_similarity as ssim, mean_squared_error as mse
import logging

logger = logging.getLogger(__name__)

# Настройка Celery с брокером и backend
celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',  # Брокер для очереди задач
    result_backend='redis://localhost:6379/0'  # Backend для хранения результатов
)

# Настройка времени хранения результатов
celery_app.conf.result_expires = 3600  # Хранить результаты 1 час
@celery_app.task
def process_image(image_data: str, scale_factor: float, algorithm: str, is_base64: bool = True):
    try:
        # Декодирование
        if is_base64:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = bytes.fromhex(image_data)
        
        if len(image_bytes) > 10 * 1024 * 1024:  # Ограничение 10 МБ
            raise ValueError("Изображение слишком большое")
        
        np_arr = np.frombuffer(image_bytes, np.uint8)
        original_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if original_image is None:
            raise ValueError("Не удалось декодировать изображение")

        # Обработка
        if algorithm not in INTERPOLATION_METHODS:
            raise ValueError(f"Неподдерживаемый метод интерполяции: {algorithm}")
        
        interpolation_func = INTERPOLATION_METHODS[algorithm]
        upscaled_image = interpolation_func(original_image, scale_factor)

        # Кодирование результата
        _, buffer = cv2.imencode('.png', upscaled_image)
        upscaled_image_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"
        
        return {
            "upscaled_image_base64": upscaled_image_base64,
            "original_shape": [int(original_image.shape[1]), int(original_image.shape[0])],  # Кортеж → список
            "upscaled_shape": [int(upscaled_image.shape[1]), int(upscaled_image.shape[0])],  # Кортеж → список
            "algorithm": algorithm,
            "message": "Изображение успешно увеличено"
        }
    except Exception as e:
        logger.error(f"Ошибка обработки: {str(e)}")
        return {"error": str(e)}

@celery_app.task
def process_all_methods(image_base64: str, scale_factor: float):
    try:
        # Декодирование
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        image_bytes = base64.b64decode(image_base64)
        if len(image_bytes) > 10 * 1024 * 1024:  # Ограничение 10 МБ
            raise ValueError("Изображение слишком большое")
        
        np_arr = np.frombuffer(image_bytes, np.uint8)
        original_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if original_image is None:
            raise ValueError("Не удалось декодировать изображение")

        # Эталон для сравнения
        zoomed_original = cv2.resize(original_image, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
        results = {}

        for method_name, interpolation_func in INTERPOLATION_METHODS.items():
            upscaled_image = interpolation_func(original_image, scale_factor)
            _, buffer = cv2.imencode('.png', upscaled_image)
            upscaled_image_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

            # Метрики качества
            psnr_value = psnr(zoomed_original, upscaled_image, data_range=255)
            ssim_value = ssim(zoomed_original, upscaled_image, data_range=255, channel_axis=2)
            mse_value = mse(zoomed_original, upscaled_image)

            # Разница изображений
            diff_image = np.abs(zoomed_original.astype(np.float32) - upscaled_image.astype(np.float32))
            diff_image = (diff_image / diff_image.max() * 255).astype(np.uint8)
            _, diff_buffer = cv2.imencode('.png', diff_image)
            diff_image_base64 = f"data:image/png;base64,{base64.b64encode(diff_buffer).decode('utf-8')}"

            # Гистограмма ошибок
            hist, _ = np.histogram(diff_image.flatten(), bins=256, range=(0, 255))
            hist_image = np.zeros((256, 256, 3), dtype=np.uint8)
            max_val = hist.max()
            for i in range(256):
                height = int(255 * hist[i] / max_val) if max_val > 0 else 0
                cv2.line(hist_image, (i, 255), (i, 255 - height), (255, 255, 255), 1)
            _, hist_buffer = cv2.imencode('.png', hist_image)
            hist_base64 = f"data:image/png;base64,{base64.b64encode(hist_buffer).decode('utf-8')}"

            results[method_name] = {
                "upscaled_image_base64": upscaled_image_base64,
                "diff_image_base64": diff_image_base64,
                "hist_base64": hist_base64,
                "upscaled_shape": [int(upscaled_image.shape[1]), int(upscaled_image.shape[0])],  # Кортеж → список
                "psnr": float(psnr_value) if not np.isinf(psnr_value) else "infinity",  # Обработка inf
                "ssim": float(ssim_value),
                "mse": float(mse_value),
                "message": f"Изображение успешно увеличено методом {method_name}"
            }

        return {
            "status": "success",
            "original_shape": [int(original_image.shape[1]), int(original_image.shape[0])],  # Кортеж → список
            "results": results
        }
    except Exception as e:
        logger.error(f"Ошибка обработки всех методов: {str(e)}")
        return {"status": "error","error": str(e)}