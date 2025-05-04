import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.schemas import UpscaleRequest
import fastapi
import uvicorn
import asyncio
from fastapi.responses import JSONResponse
from calculate_avg_times import calculate_avg_times

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

@app.post("/upscale_all_methods/", response_model=dict)
async def upscale_all_methods(request: UpscaleRequest):
    logger.info(f"Received upscale_all_methods request: scale_factor={request.scale_factor}")
    from celery_app import process_all_methods  # Імпортуємо тут, щоб уникнути циклічного імпорту
    task = process_all_methods.delay(request.image_base64, request.scale_factor)
    return {"task_id": task.id}

@app.websocket("/ws/task/{task_id}")
async def websocket_task_status(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        while True:
            from celery_app import celery_app  # Імпортуємо тут, щоб уникнути циклічного імпорту
            task = celery_app.AsyncResult(task_id)
            if task.state == 'SUCCESS':
                logger.info(f"Task {task_id} is SUCCESS")
                await websocket.send_json({"status": "SUCCESS", "result": task.result})
                break
            elif task.state == 'FAILURE':
                logger.info(f"Task {task_id} is FAILURE: {str(task.result)}")
                await websocket.send_json({"status": "FAILURE", "error": str(task.result)})
                break
            elif task.state == 'PROGRESS':
                progress = task.info.get('progress', 0) if isinstance(task.info, dict) else 0
                await websocket.send_json({"status": "PROGRESS", "progress": progress})
            else:
                await websocket.send_json({"status": task.state})
            await asyncio.sleep(0.5)  # Проверяем каждые 0.5 секунды
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for task {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {str(e)}")
        await websocket.send_json({"status": "ERROR", "error": str(e)})
    finally:
        await websocket.close()

@app.get("/average_times/")
async def get_average_times():
    """
    Повертає середні часи обробки та середню MSE для кожного методу інтерполяції.
    """
    try:
        avg_times = calculate_avg_times()
        return JSONResponse(content={"status": "success", "average_times": avg_times})
    except Exception as e:
        logger.error(f"Помилка при підрахунку середнього часу: {str(e)}")
        return JSONResponse(content={"status": "error", "error": str(e)}, status_code=500)