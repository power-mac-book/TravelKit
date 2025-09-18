from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.v1.api import api_router
from app.core.config import settings

app = FastAPI(
    title="TravelKit API",
    version="1.0.0",
    description="Travel platform with social proof and group pricing"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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