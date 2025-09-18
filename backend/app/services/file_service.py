import os
import uuid
import shutil
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from PIL import Image
from app.models.models import UploadedFile
from app.models import schemas
from app.core.config import settings

class FileService:
    def __init__(self, db: Session):
        self.db = db
        self.upload_dir = getattr(settings, 'UPLOAD_DIR', 'uploads')
        self.thumbnail_dir = os.path.join(self.upload_dir, 'thumbnails')
        
        # Create directories if they don't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.thumbnail_dir, exist_ok=True)

    async def upload_image(self, file: UploadFile, user_id: int) -> schemas.FileUploadResponse:
        """Upload and process an image file"""
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        # Save the original file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate thumbnail
        thumbnail_filename = f"thumb_{unique_filename}"
        thumbnail_path = os.path.join(self.thumbnail_dir, thumbnail_filename)
        
        try:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary (for PNG with transparency)
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Create thumbnail (300x300 max, maintaining aspect ratio)
                img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                img.save(thumbnail_path, "JPEG", quality=85, optimize=True)
                
                # Get image dimensions
                original_width, original_height = Image.open(file_path).size
                
        except Exception as e:
            # Clean up files if thumbnail generation fails
            if os.path.exists(file_path):
                os.remove(file_path)
            raise Exception(f"Failed to process image: {str(e)}")
        
        # Save file metadata to database
        file_record = UploadedFile(
            filename=file.filename,
            unique_filename=unique_filename,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            file_size=os.path.getsize(file_path),
            file_type=file.content_type,
            width=original_width,
            height=original_height,
            uploaded_by=user_id
        )
        
        self.db.add(file_record)
        self.db.commit()
        self.db.refresh(file_record)
        
        # Generate URLs (assuming static file serving)
        base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
        file_url = f"{base_url}/static/uploads/{unique_filename}"
        thumbnail_url = f"{base_url}/static/uploads/thumbnails/thumb_{unique_filename}"
        
        return schemas.FileUploadResponse(
            id=file_record.id,
            filename=file.filename,
            file_url=file_url,
            thumbnail_url=thumbnail_url,
            file_size=file_record.file_size,
            width=original_width,
            height=original_height,
            uploaded_at=file_record.created_at
        )

    async def delete_file(self, file_id: str, user_id: int) -> bool:
        """Delete a file and its thumbnail"""
        try:
            file_id_int = int(file_id)
        except ValueError:
            return False
        
        file_record = self.db.query(UploadedFile).filter(
            UploadedFile.id == file_id_int,
            UploadedFile.uploaded_by == user_id
        ).first()
        
        if not file_record:
            return False
        
        # Delete physical files
        try:
            if os.path.exists(file_record.file_path):
                os.remove(file_record.file_path)
            if os.path.exists(file_record.thumbnail_path):
                os.remove(file_record.thumbnail_path)
        except Exception as e:
            print(f"Error deleting files: {e}")
        
        # Delete database record
        self.db.delete(file_record)
        self.db.commit()
        
        return True

    async def get_files(self, skip: int = 0, limit: int = 100, file_type: str = "image", user_id: Optional[int] = None) -> List[schemas.UploadedFile]:
        """Get list of uploaded files"""
        query = self.db.query(UploadedFile)
        
        if file_type:
            query = query.filter(UploadedFile.file_type.startswith(file_type))
        
        if user_id:
            query = query.filter(UploadedFile.uploaded_by == user_id)
        
        files = query.order_by(desc(UploadedFile.created_at)).offset(skip).limit(limit).all()
        
        # Generate URLs for response
        base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
        result = []
        
        for file_record in files:
            file_url = f"{base_url}/static/uploads/{file_record.unique_filename}"
            thumbnail_url = f"{base_url}/static/uploads/thumbnails/thumb_{file_record.unique_filename}"
            
            result.append(schemas.UploadedFile(
                id=file_record.id,
                filename=file_record.filename,
                file_url=file_url,
                thumbnail_url=thumbnail_url,
                file_size=file_record.file_size,
                file_type=file_record.file_type,
                width=file_record.width,
                height=file_record.height,
                uploaded_at=file_record.created_at
            ))
        
        return result