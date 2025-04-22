from celery import Celery
import time
import cv2
import numpy as np
import base64
import os
from core.interpolation import INTERPOLATION_METHODS, biquadratic_interpolation, biquadratic_downscale
from skimage.metrics import peak_signal_noise_ratio as psnr, structural_similarity as ssim
import logging
import matplotlib
matplotlib.use('Agg')  # Для headless-режима
import matplotlib.pyplot as plt
from io import BytesIO

logger = logging.getLogger(__name__)

# Настройка Celery
celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0'
)
celery_app.conf.result_expires = 3600

@celery_app.task
def process_image(image_data: str, scale_factor: float, algorithm: str, is_base64: bool = True):
    try:
        if is_base64:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = bytes.fromhex(image_data)
        
        if len(image_bytes) > 10 * 1024 * 1024:
            raise ValueError("Изображение слишком большое")
        
        np_arr = np.frombuffer(image_bytes, np.uint8)
        original_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if original_image is None:
            raise ValueError("Не удалось декодировать изображение")

        if original_image.size > 5_000_000:
            from image_processing import process_image_in_chunks
            upscaled_image = process_image_in_chunks(original_image, scale_factor, INTERPOLATION_METHODS[algorithm])
        else:
            upscaled_image = INTERPOLATION_METHODS[algorithm](original_image, scale_factor)

        _, buffer = cv2.imencode('.png', upscaled_image)
        upscaled_image_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"
        
        return {
            "upscaled_image_base64": upscaled_image_base64,
            "original_shape": [int(original_image.shape[1]), int(original_image.shape[0])],
            "upscaled_shape": [int(upscaled_image.shape[1]), int(upscaled_image.shape[0])],
            "algorithm": algorithm,
            "message": "Изображение успешно увеличено"
        }
    except Exception as e:
        logger.error(f"Ошибка обработки: {str(e)}")
        return {"error": str(e)}

@celery_app.task(bind=True)
def process_all_methods(self, image_base64: str, scale_factor: float):
    try:
        task_id = self.request.id
        results_dir = os.path.join("static", "results", task_id)
        os.makedirs(results_dir, exist_ok=True)

        # Декодирование изображения
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        image_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        original_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if original_image is None:
            raise ValueError("Не удалось декодировать изображение")

        target_height = int(original_image.shape[0] * scale_factor)
        target_width = int(original_image.shape[1] * scale_factor)
        target_size = (target_width, target_height)

        # Создаём эталонное изображение с помощью INTER_LANCZOS4
        reference_image = cv2.resize(original_image, target_size, interpolation=cv2.INTER_LANCZOS4)

        results = {}
        total_methods = len(INTERPOLATION_METHODS)
        for idx, (method_name, interpolation_func) in enumerate(INTERPOLATION_METHODS.items()):
            progress = (idx / total_methods) * 100
            self.update_state(state='PROGRESS', meta={'progress': progress})
            logger.info(f"Processing {method_name}, progress: {progress:.1f}%")

            start_time = time.time()

            if original_image.size > 5_000_000:
                from image_processing import process_image_in_chunks
                upscaled_image = process_image_in_chunks(original_image, scale_factor, interpolation_func)
            else:
                upscaled_image = interpolation_func(original_image, scale_factor)

            if upscaled_image.shape[:2] != (target_height, target_width):
                upscaled_image = cv2.resize(upscaled_image, target_size, interpolation=cv2.INTER_CUBIC)

            diff_image = cv2.absdiff(reference_image, upscaled_image)
            diff_image = cv2.convertScaleAbs(diff_image, alpha=5, beta=0)

            error = np.abs(reference_image.astype(np.float32) - upscaled_image.astype(np.float32)).ravel()
            plt.figure()
            plt.hist(error, bins=50, color='red', alpha=0.7)
            plt.title(f'Histogram of Errors - {method_name}')
            plt.xlabel('Error')
            plt.ylabel('Frequency')
            buf = BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            hist_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close()

            _, buffer = cv2.imencode('.png', upscaled_image, [cv2.IMWRITE_PNG_COMPRESSION, 9])
            upscaled_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

            _, buffer = cv2.imencode('.png', diff_image, [cv2.IMWRITE_PNG_COMPRESSION, 9])
            diff_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

            psnr_value = psnr(reference_image, upscaled_image, data_range=255)
            ssim_value = ssim(reference_image, upscaled_image, data_range=255, channel_axis=2)

            end_time = time.time()
            processing_time = end_time - start_time
            logger.info(f"{method_name} processing time: {processing_time:.2f} sec")

            results[method_name] = {
                "upscaled_image_base64": upscaled_base64,
                "diff_image_base64": diff_base64,
                "hist_base64": f"data:image/png;base64,{hist_base64}",
                "upscaled_shape": [upscaled_image.shape[1], upscaled_image.shape[0]],
                "psnr": float(psnr_value) if not np.isinf(psnr_value) else "infinity",
                "ssim": float(ssim_value),
                "processing_time": processing_time
            }

        self.update_state(state='PROGRESS', meta={'progress': 100})
        logger.info("Processing complete, progress: 100%")

        return {
            "status": "success",
            "results": results,
            "original_image_url": f"/static/results/{task_id}/original.png"
        }
    except Exception as e:
        logger.error(f"Ошибка обработки всех методов: {str(e)}")
        return {"status": "error", "error": str(e)}