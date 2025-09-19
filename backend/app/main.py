from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from app.api.v1.api import api_router
from app.core.config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TravelKit API",
    version="1.0.0",
    description="Travel platform with social proof and group pricing"
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Add CORS middleware first, before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all origins for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],  # Add this to expose all headers
)

# Create uploads directory if it doesn't exist
upload_dir = getattr(settings, 'UPLOAD_DIR', 'uploads')
os.makedirs(upload_dir, exist_ok=True)

# Mount static files for uploads
app.mount("/static/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": "TravelKit API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": "development" if settings.DEBUG else "production"}