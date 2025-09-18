from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


# Destination Schemas
class DestinationBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    location: str
    country: str
    base_price: float
    max_discount: float = 0.25
    discount_per_member: float = 0.03
    image_url: Optional[str] = None
    gallery: Optional[List[str]] = None
    itinerary: Optional[dict] = None
    is_active: bool = True


class DestinationCreate(DestinationBase):
    pass


class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    max_discount: Optional[float] = None
    discount_per_member: Optional[float] = None
    image_url: Optional[str] = None
    gallery: Optional[List[str]] = None
    itinerary: Optional[dict] = None
    is_active: Optional[bool] = None


class InterestSummary(BaseModel):
    total_interested_last_30_days: int
    next_30_day_count: int
    recent_names_sample: str


class Destination(DestinationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    interest_summary: Optional[InterestSummary] = None
    
    class Config:
        from_attributes = True


# Interest Schemas
class InterestBase(BaseModel):
    destination_id: int
    user_name: str
    user_email: str  # TODO: Add email validation back when email-validator is installed
    user_phone: Optional[str] = None
    num_people: int = 1
    date_from: datetime
    date_to: datetime
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    special_requests: Optional[str] = None
    client_uuid: str


class InterestCreate(InterestBase):
    pass


class Interest(InterestBase):
    id: int
    status: str
    group_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Admin Interest Schemas
class InterestWithDestination(Interest):
    destination_name: str
    destination_slug: str
    destination_country: str
    
    class Config:
        from_attributes = True


class InterestStatusUpdate(BaseModel):
    status: str


class InterestStats(BaseModel):
    total_interests: int
    open_interests: int
    matched_interests: int
    converted_interests: int
    interests_last_7_days: int
    interests_last_30_days: int
    top_destinations: List[dict]


# Group Schemas
class GroupBase(BaseModel):
    destination_id: int
    name: str
    date_from: datetime
    date_to: datetime
    min_size: int = 4
    max_size: int = 20
    base_price: float
    final_price_per_person: float
    price_calc: Optional[dict] = None
    admin_notes: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class Group(GroupBase):
    id: int
    current_size: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Calendar Schema
class CalendarData(BaseModel):
    date: str
    count: int


class CalendarResponse(BaseModel):
    month: str
    data: List[CalendarData]


# Social Proof Schemas
class HomepageMessageBase(BaseModel):
    destination_id: int
    message_type: str
    title: str
    message: str
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    priority: int = 0
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class HomepageMessage(HomepageMessageBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Page Schemas
class PageBase(BaseModel):
    slug: str
    title: str
    content: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = True


class PageCreate(PageBase):
    pass


class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: Optional[bool] = None


class Page(PageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Traveler Schemas
class TravelerBase(BaseModel):
    email: str  # TODO: Add email validation back when email-validator is installed
    name: str
    phone: Optional[str] = None
    is_admin: bool = False
    
    # Enhanced profile fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    nationality: Optional[str] = "Indian"
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "India"
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_picture_url: Optional[str] = None
    
    # Travel-specific fields
    passport_number: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    medical_conditions: Optional[str] = None
    travel_preferences: Optional[str] = None


class TravelerCreate(TravelerBase):
    password: str


class TravelerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_picture_url: Optional[str] = None
    
    # Travel-specific fields
    passport_number: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    medical_conditions: Optional[str] = None
    travel_preferences: Optional[str] = None


class TravelerProfile(TravelerBase):
    id: int
    is_active: Optional[bool] = True
    email_verified: Optional[bool] = False
    phone_verified: Optional[bool] = False
    documents_verified: Optional[bool] = False
    kyc_status: Optional[str] = "pending"
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Keep User schemas for backward compatibility
class UserBase(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    is_admin: bool = False


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Document Schemas
class DocumentBase(BaseModel):
    document_type: str
    document_number: str
    document_name: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    issuing_authority: Optional[str] = None
    place_of_issue: Optional[str] = None


class TravelerDocumentCreate(DocumentBase):
    pass


class TravelerDocumentUpdate(BaseModel):
    document_name: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    issuing_authority: Optional[str] = None
    place_of_issue: Optional[str] = None


class TravelerDocument(DocumentBase):
    id: int
    user_id: int
    file_path: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    verification_status: str
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    is_active: bool
    is_primary: bool
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PassengerDocumentCreate(DocumentBase):
    passenger_name: str
    passenger_email: Optional[str] = None
    passenger_phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    nationality: Optional[str] = "Indian"
    relationship_type: Optional[str] = None
    interest_id: Optional[int] = None
    group_id: Optional[int] = None


class PassengerDocument(PassengerDocumentCreate):
    id: int
    user_id: int
    file_path: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    verification_status: str
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    is_active: bool
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TravelDocumentCreate(BaseModel):
    group_id: Optional[int] = None
    destination_id: Optional[int] = None
    document_type: str  # hotel_voucher, flight_ticket, itinerary, etc.
    document_title: str
    document_description: Optional[str] = None
    travel_date: Optional[datetime] = None
    validity_start: Optional[datetime] = None
    validity_end: Optional[datetime] = None
    vendor_name: Optional[str] = None
    booking_reference: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = "INR"
    is_public: bool = False
    tags: Optional[dict] = None
    notes: Optional[str] = None


class TravelDocument(TravelDocumentCreate):
    id: int
    uploaded_by: int
    file_path: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    is_active: bool
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DocumentVerificationRequest(BaseModel):
    document_id: int
    document_type: str  # traveler_document, passenger_document
    action: str  # verify, reject
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    success: bool
    document_id: Optional[int] = None
    file_url: Optional[str] = None
    message: str


# File Upload Schemas
class FileUploadResponse(BaseModel):
    id: int
    filename: str
    file_url: str
    thumbnail_url: Optional[str] = None
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: datetime


class UploadedFile(BaseModel):
    id: int
    filename: str
    file_url: str
    thumbnail_url: Optional[str] = None
    file_size: int
    file_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: datetime
    
    class Config:
        from_attributes = True