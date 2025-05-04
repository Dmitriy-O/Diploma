import os
import time
import base64
import logging
from io import BytesIO
import numpy as np
import cv2
from skimage.metrics import structural_similarity as ssim
from skimage.metrics import peak_signal_noise_ratio as psnr
import matplotlib.pyplot as plt
from celery import Celery

logger = logging.getLogger(__name__)

celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Визначення методів інтерполяції
INTERPOLATION_METHODS = {
    "bilinear": lambda img, scale: cv2.resize(
        img, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR
    ),
    "bicubic": lambda img, scale: cv2.resize(
        img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC
    ),
    "biquadratic": lambda img, scale: cv2.resize(
        img, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4
    ),
}

@celery_app.task(bind=True)
def process_all_methods(self, image_base64: str, scale_factor: float):
    try:
        task_id = self.request.id
        results_dir = os.path.join("static", "results", task_id)
        os.makedirs(results_dir, exist_ok=True)

        # Декодування зображення
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        image_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        original_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if original_image is None:
            raise ValueError("Не вдалося декодувати зображення")

        # Зменшення зображення з використанням методу найближчого сусіда
        reduction_factor = 1 / scale_factor
        reduced_height = int(original_image.shape[0] * reduction_factor)
        reduced_width = int(original_image.shape[1] * reduction_factor)

        # Перевірка мінімального розміру для зменшеного зображення
        min_size = 3
        if reduced_height < min_size or reduced_width < min_size:
            reduced_height = max(min_size, reduced_height)
            reduced_width = max(min_size, reduced_width)
            logger.warning(f"Розмір зменшеного зображення скориговано до {reduced_width}x{reduced_height}, щоб уникнути помилок у біквадратичній інтерполяції.")

        reduced_image = cv2.resize(original_image, (reduced_width, reduced_height), interpolation=cv2.INTER_NEAREST)
        logger.info(f"Зменшене зображення: {reduced_width}x{reduced_height}")

        # Еталонне зображення — оригінал
        reference_image = original_image

        results = {}
        total_methods = len(INTERPOLATION_METHODS)
        for idx, (method_name, interpolation_func) in enumerate(INTERPOLATION_METHODS.items()):
            progress = (idx / total_methods) * 100
            self.update_state(state='PROGRESS', meta={'progress': progress})
            logger.info(f"Обробка {method_name}, прогрес: {progress:.1f}%")

            start_time = time.time()

            # Збільшення зменшеного зображення назад до оригінального розміру
            upscaled_image = interpolation_func(reduced_image, scale_factor)
            if upscaled_image.shape[:2] != reference_image.shape[:2]:
                upscaled_image = cv2.resize(upscaled_image, (reference_image.shape[1], reference_image.shape[0]), interpolation=cv2.INTER_CUBIC)

            # Обчислення різниці
            diff_image = cv2.absdiff(reference_image, upscaled_image)
            diff_image = cv2.convertScaleAbs(diff_image, alpha=5, beta=0)

            # Обчислення гістограми помилок
            error = np.abs(reference_image.astype(np.float32) - upscaled_image.astype(np.float32)).ravel()
            plt.figure()
            plt.hist(error, bins=50, color='red', alpha=0.7)
            plt.title(f'Гістограма помилок - {method_name}')
            plt.xlabel('Помилка')
            plt.ylabel('Частота')
            buf = BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            hist_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close()

            # Обчислення градієнтів
            grad_x_ref = cv2.Sobel(reference_image, cv2.CV_64F, 1, 0, ksize=3)
            grad_y_ref = cv2.Sobel(reference_image, cv2.CV_64F, 0, 1, ksize=3)
            grad_magnitude_ref = np.sqrt(grad_x_ref**2 + grad_y_ref**2)

            grad_x = cv2.Sobel(upscaled_image, cv2.CV_64F, 1, 0, ksize=3)
            grad_y = cv2.Sobel(upscaled_image, cv2.CV_64F, 0, 1, ksize=3)
            grad_magnitude = np.sqrt(grad_x**2 + grad_y**2)
            grad_diff = float(np.mean(np.abs(grad_magnitude_ref - grad_magnitude)))

            # Обчислення метрик
            psnr_value = psnr(reference_image, upscaled_image, data_range=255)
            ssim_value = ssim(reference_image, upscaled_image, data_range=255, channel_axis=2)
            mse_value = np.mean((reference_image.astype(np.float32) - upscaled_image.astype(np.float32)) ** 2)

            logger.info(f"{method_name}: MSE = {mse_value:.2f}")

            # Кодування зображень у base64
            _, buffer = cv2.imencode('.png', upscaled_image, [cv2.IMWRITE_PNG_COMPRESSION, 9])
            upscaled_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

            _, buffer = cv2.imencode('.png', diff_image, [cv2.IMWRITE_PNG_COMPRESSION, 9])
            diff_base64 = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

            end_time = time.time()
            processing_time = end_time - start_time
            logger.info(f"{method_name} час обробки: {processing_time:.2f} сек")

            # Збереження часу обробки та MSE у файли
            with open(os.path.join(results_dir, "times.txt"), "a") as f:
                f.write(f"{method_name}: {processing_time:.2f}\n")
            with open(os.path.join(results_dir, "mse.txt"), "a") as f:
                f.write(f"{method_name}: {mse_value:.2f}\n")

            results[method_name] = {
                "upscaled_image_base64": upscaled_base64,
                "diff_image_base64": diff_base64,
                "hist_base64": f"data:image/png;base64,{hist_base64}",
                "upscaled_shape": [upscaled_image.shape[1], upscaled_image.shape[0]],
                "psnr": float(psnr_value) if not np.isinf(psnr_value) else "infinity",
                "ssim": float(ssim_value),
                "mse": float(mse_value),
                "gradient_diff": grad_diff,
                "processing_time": processing_time
            }

        self.update_state(state='PROGRESS', meta={'progress': 100})
        logger.info("Обробка завершена, прогрес: 100%")

        return {
            "status": "success",
            "results": results,
            "original_image_url": f"/static/results/{task_id}/original.png"
        }
    except Exception as e:
        logger.error(f"Помилка обробки всіх методів: {str(e)}")
        return {"status": "error", "error": str(e)}