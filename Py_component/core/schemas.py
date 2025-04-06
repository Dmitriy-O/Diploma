from pydantic import BaseModel

class UpscaleRequest(BaseModel):
    image_base64: str
    scale_factor: float
    algorithm: str

class UpscaleResponse(BaseModel):
    upscaled_image_base64: str
    original_shape: tuple[int, int]
    upscaled_shape: tuple[int, int]
    algorithm: str
    message: str