import logging
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.schemas import UpscaleRequest, UpscaleResponse
from core.interpolation import INTERPOLATION_METHODS
from utils.image_utils import decode_base64_image, encode_image_to_base64
import fastapi
import uvicorn
import numpy as np
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import structural_similarity as ssim

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/app.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("ImageUpscaler")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Image Upscaler Service")
    logger.info(f"FastAPI version: {fastapi.__version__}")
    logger.info(f"Uvicorn version: {uvicorn.__version__}")
    logger.info(f"Available interpolation methods: {list(INTERPOLATION_METHODS.keys())}")
    logger.info("Service is now running on http://127.0.0.1:8000")
    yield
    logger.info("Shutting down Image Upscaler Service")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Image Upscaler Service is running"}

@app.post("/upscale/", response_model=UpscaleResponse)
async def upscale_image(request: UpscaleRequest = Body(...)):
    logger.info(f"Received upscale request: algorithm={request.algorithm}, scale_factor={request.scale_factor}")

    try:
        logger.debug("Decoding image from Base64")
        original_image = decode_base64_image(request.image_base64)
        if original_image is None:
            logger.error("Failed to decode image: image is None")
            raise HTTPException(status_code=400, detail="Не удалось декодировать изображение")
        logger.info(f"Image decoded successfully. Shape: {original_image.shape}")
    except ValueError as e:
        logger.error(f"Error decoding image: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    if request.algorithm not in INTERPOLATION_METHODS:
        logger.error(f"Unsupported interpolation method: {request.algorithm}")
        raise HTTPException(status_code=400, detail="Неподдерживаемый метод интерполяции")

    interpolation_func = INTERPOLATION_METHODS[request.algorithm]
    try:
        logger.debug(f"Upscaling image using {request.algorithm} method")
        upscaled_image = interpolation_func(original_image, request.scale_factor)
        logger.info(f"Image upscaled successfully. New shape: {upscaled_image.shape}")
    except Exception as e:
        logger.error(f"Error during upscaling: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка интерполяции: {str(e)}")

    try:
        logger.debug("Encoding upscaled image to Base64")
        upscaled_image_base64 = encode_image_to_base64(upscaled_image)
        if upscaled_image_base64 is None:
            logger.error("Failed to encode upscaled image: result is None")
            raise HTTPException(status_code=500, detail="Не удалось закодировать изображение")
        logger.info("Image encoded to Base64 successfully")
    except ValueError as e:
        logger.error(f"Error encoding image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    response = UpscaleResponse(
        upscaled_image_base64=upscaled_image_base64,
        original_shape=(original_image.shape[1], original_image.shape[0]),
        upscaled_shape=(upscaled_image.shape[1], upscaled_image.shape[0]),
        algorithm=request.algorithm,
        message="Изображение успешно увеличено"
    )
    logger.info("Upscale request completed successfully")
    return response

@app.post("/upscale_all_methods/")
async def upscale_all_methods(request: UpscaleRequest = Body(...)):
    logger.info(f"Received upscale_all_methods request: scale_factor={request.scale_factor}")

    try:
        logger.debug("Decoding image from Base64")
        original_image = decode_base64_image(request.image_base64)
        if original_image is None:
            logger.error("Failed to decode image: image is None")
            raise HTTPException(status_code=400, detail="Не удалось декодировать изображение")
        logger.info(f"Image decoded successfully. Shape: {original_image.shape}")
    except ValueError as e:
        logger.error(f"Error decoding image: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    results = {}
    from scipy.ndimage import zoom
    zoomed_original = zoom(original_image, (request.scale_factor, request.scale_factor, 1), order=3)  # Масштабируем оригинал для сравнения

    for method_name, interpolation_func in INTERPOLATION_METHODS.items():
        try:
            logger.debug(f"Upscaling image using {method_name} method")
            upscaled_image = interpolation_func(original_image, request.scale_factor)
            logger.info(f"Image upscaled successfully with {method_name}. New shape: {upscaled_image.shape}")

            # Кодируем увеличенное изображение в Base64
            logger.debug(f"Encoding upscaled image ({method_name}) to Base64")
            upscaled_image_base64 = encode_image_to_base64(upscaled_image)
            if upscaled_image_base64 is None:
                logger.error(f"Failed to encode upscaled image for {method_name}: result is None")
                raise HTTPException(status_code=500, detail=f"Не удалось закодировать изображение для метода {method_name}")
            logger.info(f"Image encoded to Base64 successfully for {method_name}")

            # Вычисляем метрики качества
            psnr_value = psnr(zoomed_original, upscaled_image, data_range=255)
            ssim_value = ssim(zoomed_original, upscaled_image, data_range=255, channel_axis=2)

            # Вычисляем разницу между оригиналом и увеличенным изображением
            diff_image = np.abs(zoomed_original.astype(np.float32) - upscaled_image.astype(np.float32))
            diff_image = (diff_image / diff_image.max() * 255).astype(np.uint8)  # Нормализуем для отображения
            diff_image_base64 = encode_image_to_base64(diff_image)

            results[method_name] = {
                "upscaled_image_base64": upscaled_image_base64,
                "diff_image_base64": diff_image_base64,
                "upscaled_shape": (upscaled_image.shape[1], upscaled_image.shape[0]),
                "psnr": psnr_value,
                "ssim": ssim_value,
                "message": f"Изображение успешно увеличено методом {method_name}"
            }
        except Exception as e:
            logger.error(f"Error during upscaling with {method_name}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Ошибка интерполяции для метода {method_name}: {str(e)}")

    response = {
        "original_shape": (original_image.shape[1], original_image.shape[0]),
        "results": results
    }
    logger.info("Upscale_all_methods request completed successfully")
    return response