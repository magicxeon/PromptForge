import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

import logging

# Configure central logging format for post-processing microservice
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("post_processing.main")

# Add parent directory to sys.path
SERVICE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_ROOT))

from config.service_config import load_post_processing_config
from adapters.mediapipe_detector import MediaPipeFaceDetector
from api.routes import router

config = load_post_processing_config()
detector = MediaPipeFaceDetector(model_path=config.runtime.modelPath, policy=config.policy)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Momelo Post-Processing Microservice...")
    if config.runtime.pilotEnabled:
        detector.initialize()
        logger.info(f"MediaPipe Face Detector state: available={detector.unavailable_reason is None}")
    else:
        detector.unavailable_reason = "pilot_disabled"
        logger.info("MediaPipe Face Detector pilot mode is DISABLED.")
    yield
    detector.close()
    logger.info("Momelo Post-Processing Microservice shutdown complete.")

app = FastAPI(
    title="Momelo Post-Processing Microservice",
    description="Python FastAPI Post-Processing Microservice for Faceless Previs and Media Derivatives.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.config = config
app.state.detector = detector

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "faceless_processing_failed", "message": str(exc)}}
    )

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.runtime.host, port=config.runtime.port, reload=True)
