import base64
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def decode_base64_image(image_base64: str) -> np.ndarray:
    try:
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        image_data = base64.b64decode(image_base64)
        if len(image_data) > 10 * 1024 * 1024:  # Ограничение 10 МБ
            raise ValueError("Изображение слишком большое")
        np_arr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Не удалось декодировать изображение")
        return image
    except Exception as e:
        logger.error(f"Ошибка декодирования: {str(e)}")
        raise ValueError(f"Ошибка декодирования: {str(e)}")

def encode_image_to_base64(image: np.ndarray) -> str:
    try:
        _, buffer = cv2.imencode('.png', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"
    except Exception as e:
        logger.error(f"Ошибка кодирования: {str(e)}")
        raise ValueError(f"Ошибка кодирования: {str(e)}")