from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin_user
from app.services.page_service import PageService
from app.models.schemas import Page as PageSchema, PageCreate, PageUpdate
from app.models.models import Traveler

router = APIRouter()


@router.get("/", response_model=List[PageSchema])
def get_pages(
    skip: int = 0,
    limit: int = 100,
    published_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all pages (public endpoint)"""
    service = PageService(db)
    return service.get_pages(skip=skip, limit=limit, published_only=published_only)


@router.get("/{slug}", response_model=PageSchema)
def get_page_by_slug(
    slug: str,
    published_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get page by slug (public endpoint)"""
    service = PageService(db)
    page = service.get_page_by_slug(slug, published_only=published_only)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


# Admin endpoints
@router.post("/admin/", response_model=PageSchema)
def create_page(
    page_data: PageCreate,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new page (admin only)"""
    service = PageService(db)
    
    # Check if slug already exists
    existing_page = service.get_page_by_slug(page_data.slug)
    if existing_page:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page with this slug already exists"
        )
    
    return service.create_page(page_data)


@router.put("/admin/{page_id}", response_model=PageSchema)
def update_page(
    page_id: int,
    page_data: PageUpdate,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a page (admin only)"""
    service = PageService(db)
    page = service.update_page(page_id, page_data)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.delete("/admin/{page_id}")
def delete_page(
    page_id: int,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a page (admin only)"""
    service = PageService(db)
    success = service.delete_page(page_id)
    if not success:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"message": "Page deleted successfully"}


@router.post("/admin/create-defaults")
def create_default_pages(
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create default pages (Privacy Policy, Terms of Service, Contact Us)"""
    service = PageService(db)
    created_pages = service.create_default_pages()
    return {
        "message": f"Created {len(created_pages)} default pages",
        "pages": [{"id": p.id, "slug": p.slug, "title": p.title} for p in created_pages]
    }
