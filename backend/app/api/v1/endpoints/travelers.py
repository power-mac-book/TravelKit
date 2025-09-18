from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.services.traveler_service import TravelerService
from app.services.traveler_document_service import TravelerDocumentService
from app.models.schemas import (
    TravelerCreate, TravelerUpdate, TravelerProfile,
    TravelerDocumentCreate, PassengerDocumentCreate, TravelDocumentCreate,
    TravelerDocument, PassengerDocument, TravelDocument,
    DocumentVerificationRequest, DocumentUploadResponse,
    Interest
)
from app.models.models import Traveler
from app.api.v1.endpoints.auth import get_current_admin_user

router = APIRouter()
security = HTTPBearer()


# Dependency to get current traveler from token
def get_current_traveler(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Traveler:
    """Get current authenticated traveler"""
    service = TravelerService(db)
    traveler = service.get_current_traveler_from_token(credentials.credentials)
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not traveler.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account"
        )
    
    return traveler


# Public endpoints for traveler registration and authentication
@router.post("/register", response_model=TravelerProfile)
def register_traveler(
    traveler_data: TravelerCreate,
    db: Session = Depends(get_db)
):
    """Register a new traveler"""
    service = TravelerService(db)
    traveler = service.register_traveler(traveler_data)
    return TravelerProfile.from_orm(traveler)


@router.post("/login")
def login_traveler(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login traveler"""
    service = TravelerService(db)
    traveler = service.authenticate_traveler(email, password)
    
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not traveler.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=service.access_token_expire_minutes)
    access_token = service.create_access_token(
        data={"sub": traveler.email, "traveler_id": traveler.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "traveler": {
            "id": traveler.id,
            "email": traveler.email,
            "name": traveler.name,
            "is_admin": traveler.is_admin
        }
    }


# Traveler profile management
@router.get("/profile", response_model=TravelerProfile)
def get_traveler_profile(
    current_traveler: Traveler = Depends(get_current_traveler)
):
    """Get current traveler's profile"""
    return TravelerProfile.from_orm(current_traveler)


@router.put("/profile", response_model=TravelerProfile)
def update_traveler_profile(
    update_data: TravelerUpdate,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Update traveler profile"""
    service = TravelerService(db)
    updated_traveler = service.update_traveler_profile(current_traveler.id, update_data)
    return TravelerProfile.from_orm(updated_traveler)


@router.post("/change-password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Change traveler password"""
    service = TravelerService(db)
    success = service.change_password(current_traveler.id, current_password, new_password)
    return {"success": success, "message": "Password changed successfully"}


@router.get("/interests", response_model=List[Interest])
def get_traveler_interests(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Get traveler's interests"""
    service = TravelerService(db)
    return service.get_traveler_interests(current_traveler.id, status, skip, limit)


@router.get("/summary")
def get_traveler_summary(
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Get traveler summary with interests and documents"""
    service = TravelerService(db)
    return service.get_traveler_summary(current_traveler.id)


# Document management endpoints
@router.post("/documents/upload", response_model=DocumentUploadResponse)
def upload_traveler_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    document_number: str = Form(...),
    document_name: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    issuing_authority: Optional[str] = Form(None),
    place_of_issue: Optional[str] = Form(None),
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Upload a document for the current traveler"""
    
    # Parse dates if provided
    issue_dt = datetime.fromisoformat(issue_date) if issue_date else None
    expiry_dt = datetime.fromisoformat(expiry_date) if expiry_date else None
    
    document_data = TravelerDocumentCreate(
        document_type=document_type,
        document_number=document_number,
        document_name=document_name,
        issue_date=issue_dt,
        expiry_date=expiry_dt,
        issuing_authority=issuing_authority,
        place_of_issue=place_of_issue
    )
    
    service = TravelerDocumentService(db)
    document = service.upload_traveler_document(current_traveler.id, file, document_data)
    
    return DocumentUploadResponse(
        success=True,
        document_id=document.id,
        file_url=document.file_url,
        message="Document uploaded successfully"
    )


@router.get("/documents", response_model=List[TravelerDocument])
def get_traveler_documents(
    document_type: Optional[str] = None,
    verified_only: bool = False,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Get traveler's documents"""
    service = TravelerDocumentService(db)
    return service.get_traveler_documents(current_traveler.id, document_type, verified_only)


@router.delete("/documents/{document_id}")
def delete_traveler_document(
    document_id: int,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Delete a traveler document"""
    service = TravelerDocumentService(db)
    success = service.delete_document(document_id, "traveler_document", current_traveler.id)
    return {"success": success, "message": "Document deleted successfully"}


# Passenger document management
@router.post("/passengers/documents/upload", response_model=DocumentUploadResponse)
def upload_passenger_document(
    file: UploadFile = File(...),
    passenger_name: str = Form(...),
    document_type: str = Form(...),
    document_number: str = Form(...),
    passenger_email: Optional[str] = Form(None),
    passenger_phone: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    nationality: Optional[str] = Form("Indian"),
    relationship_type: Optional[str] = Form(None),
    interest_id: Optional[int] = Form(None),
    group_id: Optional[int] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    issuing_authority: Optional[str] = Form(None),
    place_of_issue: Optional[str] = Form(None),
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Upload a document for a fellow passenger"""
    
    # Parse dates if provided
    dob_dt = datetime.fromisoformat(date_of_birth) if date_of_birth else None
    issue_dt = datetime.fromisoformat(issue_date) if issue_date else None
    expiry_dt = datetime.fromisoformat(expiry_date) if expiry_date else None
    
    document_data = PassengerDocumentCreate(
        passenger_name=passenger_name,
        passenger_email=passenger_email,
        passenger_phone=passenger_phone,
        date_of_birth=dob_dt,
        gender=gender,
        nationality=nationality,
        relationship_type=relationship_type,
        document_type=document_type,
        document_number=document_number,
        issue_date=issue_dt,
        expiry_date=expiry_dt,
        issuing_authority=issuing_authority,
        place_of_issue=place_of_issue,
        interest_id=interest_id,
        group_id=group_id
    )
    
    service = TravelerDocumentService(db)
    document = service.upload_passenger_document(current_traveler.id, file, document_data)
    
    return DocumentUploadResponse(
        success=True,
        document_id=document.id,
        file_url=document.file_url,
        message="Passenger document uploaded successfully"
    )


@router.get("/passengers/documents", response_model=List[PassengerDocument])
def get_passenger_documents(
    interest_id: Optional[int] = None,
    group_id: Optional[int] = None,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Get passenger documents for the current traveler"""
    service = TravelerDocumentService(db)
    return service.get_passenger_documents(current_traveler.id, interest_id, group_id)


@router.delete("/passengers/documents/{document_id}")
def delete_passenger_document(
    document_id: int,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Delete a passenger document"""
    service = TravelerDocumentService(db)
    success = service.delete_document(document_id, "passenger_document", current_traveler.id)
    return {"success": success, "message": "Passenger document deleted successfully"}


# Admin endpoints for traveler management
@router.get("/admin/travelers", response_model=List[TravelerProfile])
def get_all_travelers_admin(
    skip: int = 0,
    limit: int = 100,
    verified_only: bool = False,
    search: Optional[str] = None,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all travelers (admin only)"""
    service = TravelerService(db)
    travelers = service.get_all_travelers(skip, limit, verified_only, search)
    return [TravelerProfile.from_orm(t) for t in travelers]


@router.get("/admin/travelers/{traveler_id}", response_model=TravelerProfile)
def get_traveler_admin(
    traveler_id: int,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get specific traveler details (admin only)"""
    service = TravelerService(db)
    traveler = service.get_traveler_by_id(traveler_id)
    if not traveler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )
    return TravelerProfile.from_orm(traveler)


@router.get("/admin/travelers/{traveler_id}/summary")
def get_traveler_summary_admin(
    traveler_id: int,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get traveler summary with interests and documents (admin only)"""
    service = TravelerService(db)
    return service.get_traveler_summary(traveler_id)


@router.post("/admin/create-from-interest/{interest_id}", response_model=TravelerProfile)
def create_traveler_from_interest(
    interest_id: int,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create traveler profile from interest after booking confirmation (admin only)"""
    service = TravelerService(db)
    traveler = service.admin_create_traveler_profile(interest_id, current_admin.id)
    return TravelerProfile.from_orm(traveler)


@router.put("/admin/travelers/{traveler_id}/deactivate")
def deactivate_traveler_admin(
    traveler_id: int,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Deactivate traveler account (admin only)"""
    service = TravelerService(db)
    success = service.deactivate_traveler(traveler_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )
    return {"success": True, "message": "Traveler deactivated successfully"}


@router.put("/admin/travelers/{traveler_id}/reactivate")
def reactivate_traveler_admin(
    traveler_id: int,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Reactivate traveler account (admin only)"""
    service = TravelerService(db)
    success = service.reactivate_traveler(traveler_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traveler not found"
        )
    return {"success": True, "message": "Traveler reactivated successfully"}


@router.get("/admin/statistics")
def get_traveler_statistics_admin(
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get traveler statistics (admin only)"""
    service = TravelerService(db)
    return service.get_traveler_statistics()


# Admin endpoints for document verification
@router.post("/admin/documents/verify")
def verify_document_admin(
    verification_request: DocumentVerificationRequest,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Verify or reject a document (admin only)"""
    service = TravelerDocumentService(db)
    success = service.verify_document(current_admin.id, verification_request)
    action = "verified" if verification_request.action == "verify" else "rejected"
    return {"success": success, "message": f"Document {action} successfully"}


@router.get("/admin/documents/pending")
def get_pending_verifications_admin(
    skip: int = 0,
    limit: int = 100,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all documents pending verification (admin only)"""
    service = TravelerDocumentService(db)
    return service.get_pending_verifications(skip, limit)


@router.get("/admin/documents/statistics")
def get_document_statistics_admin(
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get document verification statistics (admin only)"""
    service = TravelerDocumentService(db)
    return service.get_document_stats()


# Admin endpoints for travel document management
@router.post("/admin/travel-documents/upload", response_model=DocumentUploadResponse)
def upload_travel_document_admin(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    document_title: str = Form(...),
    traveler_id: Optional[int] = Form(None),
    group_id: Optional[int] = Form(None),
    destination_id: Optional[int] = Form(None),
    travel_date: Optional[str] = Form(None),
    validity_start: Optional[str] = Form(None),
    validity_end: Optional[str] = Form(None),
    vendor_name: Optional[str] = Form(None),
    booking_reference: Optional[str] = Form(None),
    cost: Optional[float] = Form(None),
    currency: Optional[str] = Form("INR"),
    is_public: bool = Form(False),
    notes: Optional[str] = Form(None),
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Upload a travel document (admin only)"""
    
    # Parse dates if provided
    travel_dt = datetime.fromisoformat(travel_date) if travel_date else None
    validity_start_dt = datetime.fromisoformat(validity_start) if validity_start else None
    validity_end_dt = datetime.fromisoformat(validity_end) if validity_end else None
    
    document_data = TravelDocumentCreate(
        group_id=group_id,
        destination_id=destination_id,
        document_type=document_type,
        document_title=document_title,
        travel_date=travel_dt,
        validity_start=validity_start_dt,
        validity_end=validity_end_dt,
        vendor_name=vendor_name,
        booking_reference=booking_reference,
        cost=cost,
        currency=currency,
        is_public=is_public,
        notes=notes
    )
    
    service = TravelerDocumentService(db)
    document = service.upload_travel_document(current_admin.id, file, document_data)
    
    # Create document access for specific traveler if provided
    if traveler_id:
        service.create_document_access(traveler_id, document.id, current_admin.id)
        
        # Send notification to traveler about new document
        from app.services.notification_service import NotificationService
        from app.services.traveler_service import TravelerService
        
        traveler_service = TravelerService(db)
        traveler = traveler_service.get_traveler_by_id(traveler_id)
        
        if traveler:
            notification_service = NotificationService()
            try:
                notification_service.send_document_upload_notification(
                    db=db,
                    traveler=traveler,
                    document_name=document_title,
                    document_category=document_type,
                    admin_name=current_admin.name or "Admin"
                )
            except Exception as e:
                # Log the error but don't fail the upload
                print(f"Failed to send notification: {e}")
    
    return DocumentUploadResponse(
        success=True,
        document_id=document.id,
        file_url=document.file_url,
        message="Travel document uploaded successfully"
    )


@router.get("/admin/travel-documents", response_model=List[TravelDocument])
def get_travel_documents_admin(
    group_id: Optional[int] = None,
    destination_id: Optional[int] = None,
    document_category: Optional[str] = None,
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get travel documents (admin only)"""
    service = TravelerDocumentService(db)
    return service.get_travel_documents(group_id, destination_id, document_category)


# Public endpoint for travelers to view travel documents
@router.get("/travel-documents", response_model=List[TravelDocument])
def get_public_travel_documents(
    group_id: Optional[int] = None,
    destination_id: Optional[int] = None,
    document_category: Optional[str] = None,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Get public travel documents for authenticated travelers"""
    service = TravelerDocumentService(db)
    return service.get_travel_documents(group_id, destination_id, document_category, public_only=True)


@router.get("/my-travel-documents", response_model=List[TravelDocument])
def get_my_travel_documents(
    document_category: Optional[str] = None,
    current_traveler: Traveler = Depends(get_current_traveler),
    db: Session = Depends(get_db)
):
    """Get travel documents accessible to the current traveler (uploaded by admin for them)"""
    service = TravelerDocumentService(db)
    return service.get_traveler_accessible_documents(current_traveler.id, document_category)