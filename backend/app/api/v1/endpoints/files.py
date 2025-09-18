from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import schemas
from app.services.file_service import FileService
from app.api.v1.endpoints.auth import get_current_admin_user
import os

router = APIRouter()


@router.post("/upload/image", response_model=schemas.FileUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Upload a single image file (admin only)"""
    service = FileService(db)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    return await service.upload_image(file, current_admin.id)


@router.post("/upload/gallery", response_model=List[schemas.FileUploadResponse])
async def upload_gallery_images(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Upload multiple images for gallery (admin only)"""
    service = FileService(db)
    
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 files allowed per upload"
        )
    
    results = []
    for file in files:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file.content_type} not allowed for {file.filename}"
            )
        
        # Validate file size (max 10MB per file)
        max_size = 10 * 1024 * 1024  # 10MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} exceeds 10MB limit"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        result = await service.upload_image(file, current_admin.id)
        results.append(result)
    
    return results


@router.delete("/upload/{file_id}")
async def delete_uploaded_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Delete an uploaded file (admin only)"""
    service = FileService(db)
    success = await service.delete_file(file_id, current_admin.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or you don't have permission to delete it"
        )
    
    return {"message": "File deleted successfully"}


@router.get("/upload/files", response_model=List[schemas.UploadedFile])
async def get_uploaded_files(
    skip: int = 0,
    limit: int = 100,
    file_type: str = "image",
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Get list of uploaded files (admin only)"""
    service = FileService(db)
    return await service.get_files(skip=skip, limit=limit, file_type=file_type, user_id=current_admin.id)


# Document serving endpoints
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.models import Traveler
from app.services.traveler_service import TravelerService

security = HTTPBearer()


def get_current_traveler_or_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Traveler:
    """Get current authenticated traveler or admin"""
    traveler_service = TravelerService(db)
    traveler = traveler_service.get_current_traveler_from_token(credentials.credentials)
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    if not traveler.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account"
        )
    
    return traveler


@router.get("/traveler_documents/{filename}")
async def serve_traveler_document(
    filename: str,
    current_user: Traveler = Depends(get_current_traveler_or_admin),
    db: Session = Depends(get_db)
):
    """Serve traveler document files (authenticated users only)"""
    file_path = f"/app/uploads/traveler_documents/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # TODO: Add proper access control - check if user owns the document or is admin
    return FileResponse(file_path)


@router.get("/passenger_documents/{filename}")
async def serve_passenger_document(
    filename: str,
    current_user: Traveler = Depends(get_current_traveler_or_admin),
    db: Session = Depends(get_db)
):
    """Serve passenger document files (authenticated users only)"""
    file_path = f"/app/uploads/passenger_documents/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # TODO: Add proper access control - check if user owns the document or is admin
    return FileResponse(file_path)


@router.get("/travel_documents/{filename}")
async def serve_travel_document(
    filename: str,
    current_user: Traveler = Depends(get_current_traveler_or_admin),
    db: Session = Depends(get_db)
):
    """Serve travel document files (authenticated users only)"""
    file_path = f"/app/uploads/travel_documents/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # TODO: Add proper access control - check if document is public or user has access
    return FileResponse(file_path)