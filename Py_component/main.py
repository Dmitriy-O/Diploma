import logging
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.schemas import UpscaleRequest, UpscaleResponse, UpscaleAllResponse
from celery_app import process_image, process_all_methods, celery_app  # Добавляем celery_app
import fastapi
import uvicorn

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("logs/app.log"), logging.StreamHandler()]
)
logger = logging.getLogger("ImageUpscaler")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Image Upscaler Service")
    logger.info(f"FastAPI version: {fastapi.__version__}")
    logger.info(f"Uvicorn version: {getattr(uvicorn, '__version__', 'unknown')}")
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

@app.post("/upscale/", response_model=dict)
async def upscale_image(request: UpscaleRequest = Body(...)):
    logger.info(f"Received upscale request: algorithm={request.algorithm}, scale_factor={request.scale_factor}")
    task = process_image.delay(request.image_base64, request.scale_factor, request.algorithm)
    return {"task_id": task.id}

@app.post("/upscale_file/", response_model=dict)
async def upscale_image_file(file: UploadFile = File(...), scale_factor: float = 2.0, algorithm: str = "bilinear"):
    logger.info(f"Received upscale file request: algorithm={algorithm}, scale_factor={scale_factor}")
    image_bytes = await file.read()
    task = process_image.delay(image_bytes.hex(), scale_factor, algorithm, is_base64=False)
    return {"task_id": task.id}

@app.post("/upscale_all_methods/", response_model=dict)
async def upscale_all_methods(request: UpscaleRequest = Body(...)):
    logger.info(f"Received upscale_all_methods request: scale_factor={request.scale_factor}")
    task = process_all_methods.delay(request.image_base64, request.scale_factor)
    return {"task_id": task.id}

@app.get("/task/{task_id}")
@app.head("/task/{task_id}")
async def get_task_status(task_id: str):
    try:
        logger.info(f"Checking status for task_id: {task_id}")
        task = celery_app.AsyncResult(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found in Celery")
            raise HTTPException(status_code=404, detail="Задача не найдена")
        
        if task.state == 'PENDING':
            logger.info(f"Task {task_id} is PENDING")
            return {"status": "Ожидание"}
        elif task.state == 'SUCCESS':
            logger.info(f"Task {task_id} is SUCCESS")
            return {"status": "Готово", "result": task.result}
        elif task.state == 'FAILURE':
            logger.info(f"Task {task_id} is FAILURE: {str(task.result)}")
            return {"status": "FAILURE", "error": str(task.result)}
        else:
            logger.info(f"Task {task_id} state: {task.state}")
            return {"status": task.state}
    except Exception as e:
        logger.error(f"Error while checking task status for {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при проверке статуса задачи: {str(e)}")