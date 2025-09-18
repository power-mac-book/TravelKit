import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime

from app.models.models import (
    TravelerDocument, PassengerDocument, TravelDocument, 
    DocumentAccess, DocumentVerificationHistory, Traveler
)
from app.models.schemas import (
    TravelerDocumentCreate, TravelerDocumentUpdate,
    PassengerDocumentCreate, TravelDocumentCreate,
    DocumentVerificationRequest
)
from app.core.config import settings


class TravelerDocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.upload_path = getattr(settings, 'UPLOAD_PATH', '/app/uploads')
        self.allowed_types = {
            'aadhaar': ['image/jpeg', 'image/png', 'application/pdf'],
            'pan': ['image/jpeg', 'image/png', 'application/pdf'],
            'passport': ['image/jpeg', 'image/png', 'application/pdf'],
            'driving_license': ['image/jpeg', 'image/png', 'application/pdf'],
            'voter_id': ['image/jpeg', 'image/png', 'application/pdf'],
            'travel_document': ['image/jpeg', 'image/png', 'application/pdf', 'text/plain']
        }
        self.max_file_size = getattr(settings, 'MAX_FILE_SIZE', 10 * 1024 * 1024)  # 10MB

    def upload_traveler_document(
        self, 
        traveler_id: int, 
        file: UploadFile, 
        document_data: TravelerDocumentCreate
    ) -> TravelerDocument:
        """Upload a document for a traveler"""
        
        # Validate file
        self._validate_file(file, document_data.document_type)
        
        # Check if document already exists
        existing_doc = self.db.query(TravelerDocument).filter(
            and_(
                TravelerDocument.user_id == traveler_id,
                TravelerDocument.document_type == document_data.document_type,
                TravelerDocument.document_number == document_data.document_number,
                TravelerDocument.is_active == True
            )
        ).first()
        
        if existing_doc:
            raise HTTPException(
                status_code=400, 
                detail=f"Document of type {document_data.document_type} with this number already exists"
            )
        
        # Save file
        file_info = self._save_file(file, 'traveler_documents')
        
        # Create document record
        db_document = TravelerDocument(
            user_id=traveler_id,
            document_type=document_data.document_type,
            document_number=document_data.document_number,
            document_name=document_data.document_name,
            file_path=file_info['file_path'],
            file_url=file_info['file_url'],
            file_size=file_info['file_size'],
            mime_type=file.content_type,
            issue_date=document_data.issue_date,
            expiry_date=document_data.expiry_date,
            issuing_authority=document_data.issuing_authority,
            place_of_issue=document_data.place_of_issue,
            verification_status="pending",
            is_active=True,
            is_primary=self._should_be_primary(traveler_id, document_data.document_type)
        )
        
        self.db.add(db_document)
        self.db.commit()
        self.db.refresh(db_document)
        
        return db_document

    def upload_passenger_document(
        self, 
        traveler_id: int, 
        file: UploadFile, 
        document_data: PassengerDocumentCreate
    ) -> PassengerDocument:
        """Upload a document for a fellow passenger"""
        
        # Validate file
        self._validate_file(file, document_data.document_type)
        
        # Save file
        file_info = self._save_file(file, 'passenger_documents')
        
        # Create document record
        db_document = PassengerDocument(
            user_id=traveler_id,
            interest_id=document_data.interest_id,
            group_id=document_data.group_id,
            passenger_name=document_data.passenger_name,
            passenger_email=document_data.passenger_email,
            passenger_phone=document_data.passenger_phone,
            date_of_birth=document_data.date_of_birth,
            gender=document_data.gender,
            nationality=document_data.nationality,
            relationship_type=document_data.relationship_type,
            document_type=document_data.document_type,
            document_number=document_data.document_number,
            file_path=file_info['file_path'],
            file_url=file_info['file_url'],
            file_size=file_info['file_size'],
            mime_type=file.content_type,
            issue_date=document_data.issue_date,
            expiry_date=document_data.expiry_date,
            issuing_authority=document_data.issuing_authority,
            place_of_issue=document_data.place_of_issue,
            verification_status="pending",
            is_active=True
        )
        
        self.db.add(db_document)
        self.db.commit()
        self.db.refresh(db_document)
        
        return db_document

    def upload_travel_document(
        self, 
        admin_id: int, 
        file: UploadFile, 
        document_data: TravelDocumentCreate
    ) -> TravelDocument:
        """Upload a travel document (admin only)"""
        
        # Validate file
        self._validate_file(file, 'travel_document')
        
        # Save file
        file_info = self._save_file(file, 'travel_documents')
        
        # Create document record
        db_document = TravelDocument(
            uploaded_by=admin_id,
            group_id=document_data.group_id,
            destination_id=document_data.destination_id,
            document_type=document_data.document_type,
            document_title=document_data.document_title,
            document_description=document_data.document_description,
            file_path=file_info['file_path'],
            file_url=file_info['file_url'],
            file_size=file_info['file_size'],
            mime_type=file.content_type,
            travel_date=document_data.travel_date,
            validity_start=document_data.validity_start,
            validity_end=document_data.validity_end,
            vendor_name=document_data.vendor_name,
            booking_reference=document_data.booking_reference,
            cost=document_data.cost,
            currency=document_data.currency,
            is_public=document_data.is_public,
            tags=document_data.tags,
            notes=document_data.notes,
            is_active=True
        )
        
        self.db.add(db_document)
        self.db.commit()
        self.db.refresh(db_document)
        
        return db_document

    def get_traveler_documents(
        self, 
        traveler_id: int, 
        document_type: Optional[str] = None,
        verified_only: bool = False
    ) -> List[TravelerDocument]:
        """Get all documents for a traveler"""
        
        query = self.db.query(TravelerDocument).filter(
            and_(
                TravelerDocument.user_id == traveler_id,
                TravelerDocument.is_active == True
            )
        )
        
        if document_type:
            query = query.filter(TravelerDocument.document_type == document_type)
        
        if verified_only:
            query = query.filter(TravelerDocument.verification_status == "verified")
        
        return query.order_by(TravelerDocument.uploaded_at.desc()).all()

    def get_passenger_documents(
        self, 
        traveler_id: int, 
        interest_id: Optional[int] = None,
        group_id: Optional[int] = None
    ) -> List[PassengerDocument]:
        """Get passenger documents for a traveler"""
        
        query = self.db.query(PassengerDocument).filter(
            and_(
                PassengerDocument.user_id == traveler_id,
                PassengerDocument.is_active == True
            )
        )
        
        if interest_id:
            query = query.filter(PassengerDocument.interest_id == interest_id)
        
        if group_id:
            query = query.filter(PassengerDocument.group_id == group_id)
        
        return query.order_by(PassengerDocument.uploaded_at.desc()).all()

    def get_travel_documents(
        self, 
        group_id: Optional[int] = None,
        destination_id: Optional[int] = None,
        document_category: Optional[str] = None,
        public_only: bool = False
    ) -> List[TravelDocument]:
        """Get travel documents"""
        
        query = self.db.query(TravelDocument).filter(TravelDocument.is_active == True)
        
        if group_id:
            query = query.filter(TravelDocument.group_id == group_id)
        
        if destination_id:
            query = query.filter(TravelDocument.destination_id == destination_id)
        
        if document_category:
            query = query.filter(TravelDocument.document_category == document_category)
        
        if public_only:
            query = query.filter(TravelDocument.is_public == True)
        
        return query.order_by(TravelDocument.uploaded_at.desc()).all()

    def create_document_access(
        self, 
        traveler_id: int, 
        travel_document_id: int, 
        admin_id: int
    ) -> None:
        """Create document access for a specific traveler"""
        from app.models.models import DocumentAccess
        
        # Check if access already exists
        existing_access = self.db.query(DocumentAccess).filter(
            and_(
                DocumentAccess.user_id == traveler_id,
                DocumentAccess.travel_document_id == travel_document_id,
                DocumentAccess.is_active == True
            )
        ).first()
        
        if not existing_access:
            document_access = DocumentAccess(
                user_id=traveler_id,
                travel_document_id=travel_document_id,
                access_granted_by=admin_id,
                can_view=True,
                can_download=True,
                is_active=True
            )
            self.db.add(document_access)
            self.db.commit()

    def get_traveler_accessible_documents(
        self, 
        traveler_id: int,
        document_category: Optional[str] = None
    ) -> List[TravelDocument]:
        """Get travel documents accessible to a specific traveler"""
        from app.models.models import DocumentAccess
        
        # Get documents through direct access grants
        access_query = self.db.query(TravelDocument).join(
            DocumentAccess, 
            TravelDocument.id == DocumentAccess.travel_document_id
        ).filter(
            and_(
                DocumentAccess.user_id == traveler_id,
                DocumentAccess.is_active == True,
                DocumentAccess.can_view == True,
                TravelDocument.is_active == True
            )
        )
        
        # Also get public documents
        public_query = self.db.query(TravelDocument).filter(
            and_(
                TravelDocument.is_public == True,
                TravelDocument.is_active == True
            )
        )
        
        if document_category:
            access_query = access_query.filter(TravelDocument.document_category == document_category)
            public_query = public_query.filter(TravelDocument.document_category == document_category)
        
        # Combine both queries and remove duplicates
        accessible_docs = access_query.all()
        public_docs = public_query.all()
        
        # Merge and deduplicate
        all_docs = {doc.id: doc for doc in accessible_docs + public_docs}
        
        return sorted(all_docs.values(), key=lambda x: x.uploaded_at, reverse=True)

    def verify_document(
        self, 
        admin_id: int, 
        verification_request: DocumentVerificationRequest
    ) -> bool:
        """Verify or reject a document (admin only)"""
        
        if verification_request.document_type == "traveler_document":
            document = self.db.query(TravelerDocument).filter(
                TravelerDocument.id == verification_request.document_id
            ).first()
        elif verification_request.document_type == "passenger_document":
            document = self.db.query(PassengerDocument).filter(
                PassengerDocument.id == verification_request.document_id
            ).first()
        else:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update verification status
        if verification_request.action == "verify":
            document.verification_status = "verified"
            document.verified_by = admin_id
            document.verified_at = datetime.utcnow()
            document.rejection_reason = None
        elif verification_request.action == "reject":
            document.verification_status = "rejected"
            document.verified_by = admin_id
            document.verified_at = datetime.utcnow()
            document.rejection_reason = verification_request.rejection_reason
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        # Create verification history record
        verification_history = DocumentVerificationHistory(
            document_id=document.id,
            document_type=verification_request.document_type,
            previous_status=document.verification_status,
            new_status=verification_request.action,
            verified_by=admin_id,
            verification_notes=verification_request.notes,
            rejection_reason=verification_request.rejection_reason
        )
        
        self.db.add(verification_history)
        self.db.commit()
        
        # Update traveler's verification status if all documents are verified
        if verification_request.document_type == "traveler_document" and verification_request.action == "verify":
            self._update_traveler_verification_status(document.user_id)
        
        return True

    def delete_document(self, document_id: int, document_type: str, user_id: int) -> bool:
        """Soft delete a document"""
        
        if document_type == "traveler_document":
            document = self.db.query(TravelerDocument).filter(
                and_(
                    TravelerDocument.id == document_id,
                    TravelerDocument.user_id == user_id
                )
            ).first()
        elif document_type == "passenger_document":
            document = self.db.query(PassengerDocument).filter(
                and_(
                    PassengerDocument.id == document_id,
                    PassengerDocument.user_id == user_id
                )
            ).first()
        else:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document.is_active = False
        self.db.commit()
        
        return True

    def _validate_file(self, file: UploadFile, document_type: str) -> None:
        """Validate uploaded file"""
        
        # Check file size
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=400, 
                detail=f"File size too large. Maximum allowed: {self.max_file_size / (1024*1024):.1f}MB"
            )
        
        # Check file type
        allowed_types = self.allowed_types.get(document_type, self.allowed_types['travel_document'])
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )

    def _save_file(self, file: UploadFile, subfolder: str) -> Dict[str, Any]:
        """Save uploaded file to disk"""
        
        # Create unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create directory path
        upload_dir = os.path.join(self.upload_path, subfolder)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            content = file.file.read()
            f.write(content)
        
        # Generate URL (this would be configurable based on your setup)
        file_url = f"/api/v1/files/{subfolder}/{unique_filename}"
        
        return {
            'file_path': file_path,
            'file_url': file_url,
            'file_size': len(content)
        }

    def _should_be_primary(self, traveler_id: int, document_type: str) -> bool:
        """Check if this should be the primary document of this type"""
        
        existing_primary = self.db.query(TravelerDocument).filter(
            and_(
                TravelerDocument.user_id == traveler_id,
                TravelerDocument.document_type == document_type,
                TravelerDocument.is_primary == True,
                TravelerDocument.is_active == True
            )
        ).first()
        
        return existing_primary is None

    def _update_traveler_verification_status(self, traveler_id: int) -> None:
        """Update traveler's overall document verification status"""
        
        traveler = self.db.query(Traveler).filter(Traveler.id == traveler_id).first()
        if not traveler:
            return
        
        # Check if all required document types are verified
        required_docs = ['aadhaar', 'pan']  # Basic required documents
        verified_docs = self.db.query(TravelerDocument).filter(
            and_(
                TravelerDocument.user_id == traveler_id,
                TravelerDocument.document_type.in_(required_docs),
                TravelerDocument.verification_status == "verified",
                TravelerDocument.is_active == True
            )
        ).count()
        
        if verified_docs >= len(required_docs):
            traveler.documents_verified = True
            traveler.kyc_status = "verified"
        else:
            traveler.documents_verified = False
            traveler.kyc_status = "pending"
        
        self.db.commit()

    def get_pending_verifications(self, skip: int = 0, limit: int = 100) -> Dict[str, List]:
        """Get all documents pending verification (admin only)"""
        
        traveler_docs = self.db.query(TravelerDocument).filter(
            and_(
                TravelerDocument.verification_status == "pending",
                TravelerDocument.is_active == True
            )
        ).offset(skip).limit(limit).all()
        
        passenger_docs = self.db.query(PassengerDocument).filter(
            and_(
                PassengerDocument.verification_status == "pending",
                PassengerDocument.is_active == True
            )
        ).offset(skip).limit(limit).all()
        
        return {
            'traveler_documents': traveler_docs,
            'passenger_documents': passenger_docs
        }

    def get_document_stats(self) -> Dict[str, Any]:
        """Get document verification statistics (admin only)"""
        
        stats = {}
        
        # Traveler document stats
        traveler_stats = self.db.query(TravelerDocument.verification_status, 
                                     self.db.func.count(TravelerDocument.id)).filter(
            TravelerDocument.is_active == True
        ).group_by(TravelerDocument.verification_status).all()
        
        stats['traveler_documents'] = {status: count for status, count in traveler_stats}
        
        # Passenger document stats
        passenger_stats = self.db.query(PassengerDocument.verification_status, 
                                      self.db.func.count(PassengerDocument.id)).filter(
            PassengerDocument.is_active == True
        ).group_by(PassengerDocument.verification_status).all()
        
        stats['passenger_documents'] = {status: count for status, count in passenger_stats}
        
        # Overall verification rates
        total_travelers = self.db.query(Traveler).count()
        verified_travelers = self.db.query(Traveler).filter(
            Traveler.documents_verified == True
        ).count()
        
        stats['verification_rate'] = (verified_travelers / total_travelers * 100) if total_travelers > 0 else 0
        
        return stats