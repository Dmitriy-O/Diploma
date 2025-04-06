import base64
import cv2
import numpy as np
from io import BytesIO

def decode_base64_image(image_base64: str) -> np.ndarray:
    try:
        # Убираем префикс data:image/...;base64, если он есть
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        image_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Не удалось декодировать изображение")
        return image
    except Exception as e:
        raise ValueError(f"Ошибка декодирования: {str(e)}")

def encode_image_to_base64(image: np.ndarray) -> str:
    try:
        _, buffer = cv2.imencode('.png', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"
    except Exception as e:
        raise ValueError(f"Ошибка кодирования: {str(e)}")