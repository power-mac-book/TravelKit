from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.models.models import Traveler, Interest, TravelerDocument
from app.models.schemas import (
    TravelerCreate, TravelerUpdate, TravelerProfile,
    UserCreate  # For backward compatibility
)
from app.core.config import settings


class TravelerService:
    def __init__(self, db: Session):
        self.db = db
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24 * 7  # 7 days

    def register_traveler(self, traveler_data: TravelerCreate) -> Traveler:
        """Register a new traveler (public registration)"""
        
        # Check if email already exists
        existing_traveler = self.get_traveler_by_email(traveler_data.email)
        if existing_traveler:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = self.pwd_context.hash(traveler_data.password)
        
        # Create traveler
        db_traveler = Traveler(
            email=traveler_data.email,
            name=traveler_data.name,
            phone=traveler_data.phone,
            hashed_password=hashed_password,
            is_admin=False,  # Public users are not admin
            is_active=True,
            first_name=traveler_data.first_name,
            last_name=traveler_data.last_name,
            date_of_birth=traveler_data.date_of_birth,
            gender=traveler_data.gender,
            nationality=traveler_data.nationality,
            address_line1=traveler_data.address_line1,
            address_line2=traveler_data.address_line2,
            city=traveler_data.city,
            state=traveler_data.state,
            postal_code=traveler_data.postal_code,
            country=traveler_data.country,
            emergency_contact_name=traveler_data.emergency_contact_name,
            emergency_contact_phone=traveler_data.emergency_contact_phone,
            profile_picture_url=traveler_data.profile_picture_url,
            email_verified=False,
            phone_verified=False,
            documents_verified=False,
            kyc_status="pending"
        )
        
        self.db.add(db_traveler)
        self.db.commit()
        self.db.refresh(db_traveler)
        
        return db_traveler

    def authenticate_traveler(self, email: str, password: str) -> Optional[Traveler]:
        """Authenticate traveler with email and password"""
        traveler = self.get_traveler_by_email(email)
        if not traveler:
            return None
        if not self.verify_password(password, traveler.hashed_password):
            return None
        return traveler

    def get_traveler_by_email(self, email: str) -> Optional[Traveler]:
        """Get traveler by email"""
        return self.db.query(Traveler).filter(Traveler.email == email).first()

    def get_traveler_by_id(self, traveler_id: int) -> Optional[Traveler]:
        """Get traveler by ID"""
        return self.db.query(Traveler).filter(Traveler.id == traveler_id).first()

    def update_traveler_profile(
        self, 
        traveler_id: int, 
        update_data: TravelerUpdate
    ) -> Optional[Traveler]:
        """Update traveler profile"""
        
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Traveler not found"
            )
        
        # Update fields that are provided
        update_dict = update_data.dict(exclude_unset=True)
        
        for field, value in update_dict.items():
            if hasattr(traveler, field):
                setattr(traveler, field, value)
        
        traveler.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(traveler)
        
        return traveler

    def get_traveler_profile(self, traveler_id: int) -> Optional[TravelerProfile]:
        """Get complete traveler profile"""
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            return None
        
        return TravelerProfile.from_orm(traveler)

    def get_traveler_interests(
        self, 
        traveler_id: int, 
        status: Optional[str] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Interest]:
        """Get all interests for a traveler"""
        
        query = self.db.query(Interest).filter(Interest.user_id == traveler_id)
        
        if status:
            query = query.filter(Interest.status == status)
        
        return query.order_by(Interest.created_at.desc()).offset(skip).limit(limit).all()

    def verify_email(self, traveler_id: int) -> bool:
        """Mark traveler's email as verified"""
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            return False
        
        traveler.email_verified = True
        self.db.commit()
        return True

    def verify_phone(self, traveler_id: int) -> bool:
        """Mark traveler's phone as verified"""
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            return False
        
        traveler.phone_verified = True
        self.db.commit()
        return True

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token for traveler"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None

    def get_current_traveler_from_token(self, token: str) -> Optional[Traveler]:
        """Get current traveler from JWT token"""
        payload = self.verify_token(token)
        if not payload:
            return None
        
        email = payload.get("sub")
        if not email:
            return None
        
        traveler = self.get_traveler_by_email(email)
        return traveler

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash password"""
        return self.pwd_context.hash(password)

    def change_password(
        self, 
        traveler_id: int, 
        current_password: str, 
        new_password: str
    ) -> bool:
        """Change traveler's password"""
        
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Traveler not found"
            )
        
        # Verify current password
        if not self.verify_password(current_password, traveler.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        traveler.hashed_password = self.get_password_hash(new_password)
        self.db.commit()
        
        return True

    def deactivate_traveler(self, traveler_id: int) -> bool:
        """Deactivate traveler account"""
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            return False
        
        traveler.is_active = False
        self.db.commit()
        return True

    def reactivate_traveler(self, traveler_id: int) -> bool:
        """Reactivate traveler account"""
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            return False
        
        traveler.is_active = True
        self.db.commit()
        return True

    # Admin functions
    def get_all_travelers(
        self, 
        skip: int = 0, 
        limit: int = 100,
        verified_only: bool = False,
        search: Optional[str] = None
    ) -> List[Traveler]:
        """Get all travelers (admin only)"""
        
        query = self.db.query(Traveler)
        
        if verified_only:
            query = query.filter(Traveler.documents_verified == True)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Traveler.name.ilike(search_term),
                    Traveler.email.ilike(search_term),
                    Traveler.phone.ilike(search_term)
                )
            )
        
        return query.order_by(Traveler.created_at.desc()).offset(skip).limit(limit).all()

    def get_traveler_statistics(self) -> Dict[str, Any]:
        """Get traveler statistics (admin only)"""
        
        total_travelers = self.db.query(Traveler).count()
        active_travelers = self.db.query(Traveler).filter(Traveler.is_active == True).count()
        verified_travelers = self.db.query(Traveler).filter(
            Traveler.documents_verified == True
        ).count()
        
        # Email verification stats
        email_verified = self.db.query(Traveler).filter(
            Traveler.email_verified == True
        ).count()
        
        # Phone verification stats
        phone_verified = self.db.query(Traveler).filter(
            Traveler.phone_verified == True
        ).count()
        
        # KYC status distribution
        kyc_stats = self.db.query(
            Traveler.kyc_status, 
            self.db.func.count(Traveler.id)
        ).group_by(Traveler.kyc_status).all()
        
        kyc_distribution = {status: count for status, count in kyc_stats}
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_registrations = self.db.query(Traveler).filter(
            Traveler.created_at >= thirty_days_ago
        ).count()
        
        return {
            'total_travelers': total_travelers,
            'active_travelers': active_travelers,
            'verified_travelers': verified_travelers,
            'email_verified': email_verified,
            'phone_verified': phone_verified,
            'kyc_distribution': kyc_distribution,
            'recent_registrations': recent_registrations,
            'verification_rate': (verified_travelers / total_travelers * 100) if total_travelers > 0 else 0
        }

    def admin_create_traveler_profile(
        self, 
        interest_id: int, 
        admin_id: int
    ) -> Optional[Traveler]:
        """Create traveler profile from interest (admin only - after booking confirmation)"""
        
        # Get the interest
        interest = self.db.query(Interest).filter(Interest.id == interest_id).first()
        if not interest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interest not found"
            )
        
        # Check if traveler already exists
        if interest.user_id:
            existing_traveler = self.get_traveler_by_id(interest.user_id)
            if existing_traveler:
                return existing_traveler
        
        # Check if traveler with this email already exists
        existing_traveler = self.get_traveler_by_email(interest.user_email)
        if existing_traveler:
            # Link the interest to existing traveler
            interest.user_id = existing_traveler.id
            self.db.commit()
            return existing_traveler
        
        # Create new traveler profile from interest data
        # Generate a temporary password (user will need to reset)
        temp_password = f"temp_{interest.user_email[:5]}_{interest.id}"
        hashed_password = self.get_password_hash(temp_password)
        
        db_traveler = Traveler(
            email=interest.user_email,
            name=interest.user_name,
            phone=interest.user_phone,
            hashed_password=hashed_password,
            is_admin=False,
            is_active=True,
            email_verified=False,
            phone_verified=False,
            documents_verified=False,
            kyc_status="pending"
        )
        
        self.db.add(db_traveler)
        self.db.flush()  # To get the ID
        
        # Link the interest to the new traveler
        interest.user_id = db_traveler.id
        
        self.db.commit()
        self.db.refresh(db_traveler)
        
        return db_traveler

    def get_traveler_summary(self, traveler_id: int) -> Dict[str, Any]:
        """Get traveler summary with interests and documents"""
        
        traveler = self.get_traveler_by_id(traveler_id)
        if not traveler:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Traveler not found"
            )
        
        # Get interests
        interests = self.get_traveler_interests(traveler_id)
        
        # Get documents
        documents = self.db.query(TravelerDocument).filter(
            and_(
                TravelerDocument.user_id == traveler_id,
                TravelerDocument.is_active == True
            )
        ).all()
        
        # Document stats
        doc_stats = {
            'total': len(documents),
            'verified': len([d for d in documents if d.verification_status == "verified"]),
            'pending': len([d for d in documents if d.verification_status == "pending"]),
            'rejected': len([d for d in documents if d.verification_status == "rejected"])
        }
        
        return {
            'traveler': TravelerProfile.from_orm(traveler),
            'interests': {
                'total': len(interests),
                'by_status': {
                    status: len([i for i in interests if i.status == status])
                    for status in ['open', 'matched', 'converted', 'expired']
                }
            },
            'documents': doc_stats
        }