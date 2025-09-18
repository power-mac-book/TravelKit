from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Destination(Base):
    __tablename__ = "destinations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text)
    location = Column(String, nullable=False)
    country = Column(String, nullable=False)
    base_price = Column(Float, nullable=False)
    max_discount = Column(Float, default=0.25)  # 25% max discount
    discount_per_member = Column(Float, default=0.03)  # 3% per additional member
    image_url = Column(String)
    gallery = Column(JSON)  # List of image URLs
    itinerary = Column(JSON)  # Structured itinerary data
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    interests = relationship("Interest", back_populates="destination")
    groups = relationship("Group", back_populates="destination")


class Interest(Base):
    __tablename__ = "interests"
    
    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Optional for guest users
    user_name = Column(String, nullable=False)
    user_email = Column(String, nullable=False, index=True)
    user_phone = Column(String)
    num_people = Column(Integer, nullable=False, default=1)
    date_from = Column(DateTime(timezone=True), nullable=False)
    date_to = Column(DateTime(timezone=True), nullable=False)
    budget_min = Column(Float)
    budget_max = Column(Float)
    special_requests = Column(Text)
    status = Column(String, default="open")  # open, matched, converted, expired
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    client_uuid = Column(String, unique=True, index=True)  # For idempotency
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    destination = relationship("Destination", back_populates="interests")
    group = relationship("Group", back_populates="interests")
    traveler = relationship("Traveler", back_populates="interests")


class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    name = Column(String, nullable=False)
    date_from = Column(DateTime(timezone=True), nullable=False)
    date_to = Column(DateTime(timezone=True), nullable=False)
    min_size = Column(Integer, default=4)
    max_size = Column(Integer, default=20)
    current_size = Column(Integer, default=0)
    base_price = Column(Float, nullable=False)
    final_price_per_person = Column(Float, nullable=False)
    price_calc = Column(JSON)  # Pricing calculation details for audit
    status = Column(String, default="forming")  # forming, confirmed, full, cancelled
    admin_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    destination = relationship("Destination", back_populates="groups")
    interests = relationship("Interest", back_populates="group")


class Traveler(Base):
    __tablename__ = "users"  # Keep table name as "users" for existing data
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    is_admin = Column(Boolean, default=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Enhanced user profile fields
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(DateTime)
    gender = Column(String)  # male, female, other
    nationality = Column(String, default="Indian")
    address_line1 = Column(String)
    address_line2 = Column(String)
    city = Column(String)
    state = Column(String)
    postal_code = Column(String)
    country = Column(String, default="India")
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    profile_picture_url = Column(String)
    
    # Travel-specific fields
    passport_number = Column(String)
    dietary_restrictions = Column(Text)  # Vegetarian, Vegan, Gluten-free, etc.
    medical_conditions = Column(Text)    # Allergies, medications, conditions
    travel_preferences = Column(Text)    # Preferences for accommodations, activities
    
    # Verification status
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    documents_verified = Column(Boolean, default=False)
    kyc_status = Column(String, default="pending")  # pending, verified, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    interests = relationship("Interest", back_populates="traveler")
    documents = relationship("TravelerDocument", back_populates="traveler", foreign_keys="[TravelerDocument.user_id]")
    passenger_documents = relationship("PassengerDocument", back_populates="main_traveler", foreign_keys="[PassengerDocument.user_id]")
    travel_documents = relationship("TravelDocument", back_populates="uploader", foreign_keys="[TravelDocument.uploaded_by]")


class HomepageMessage(Base):
    __tablename__ = "homepage_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    message_type = Column(String, nullable=False)  # trending, shortage, urgency
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    cta_text = Column(String)
    cta_link = Column(String)
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    destination = relationship("Destination")


class Page(Base):
    __tablename__ = "pages"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    meta_title = Column(String)
    meta_description = Column(Text)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AnalyticsMaterialized(Base):
    __tablename__ = "analytics_materialized"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    metric_name = Column(String, nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    meta_data = Column(JSON)  # Additional context data (renamed from metadata to avoid SQLAlchemy reserved word)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    destination = relationship("Destination")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)  # Original filename
    unique_filename = Column(String, nullable=False, unique=True)  # UUID-based filename
    file_path = Column(String, nullable=False)  # Full file path on disk
    thumbnail_path = Column(String, nullable=True)  # Thumbnail path for images
    file_size = Column(Integer, nullable=False)  # File size in bytes
    file_type = Column(String, nullable=False)  # MIME type
    width = Column(Integer, nullable=True)  # Image width (for images)
    height = Column(Integer, nullable=True)  # Image height (for images)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    uploader = relationship("Traveler")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    subject = Column(String, nullable=False)  # Email subject or WhatsApp title
    email_template = Column(Text)  # HTML email template
    whatsapp_template = Column(Text)  # WhatsApp message template
    is_active = Column(Boolean, default=True)
    template_variables = Column(JSON)  # List of available variables
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("notification_templates.id"), nullable=True)
    recipient_email = Column(String, nullable=True)
    recipient_phone = Column(String, nullable=True)
    notification_type = Column(String, nullable=False)  # email, whatsapp, both
    status = Column(String, default="pending")  # pending, sent, failed, delivered
    subject = Column(String)
    message_content = Column(Text)
    external_id = Column(String)  # SendGrid message ID or Twilio SID
    error_message = Column(Text)
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    # Related entities
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    template = relationship("NotificationTemplate")
    interest = relationship("Interest")
    group = relationship("Group")
    traveler = relationship("Traveler")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=False, index=True)
    user_phone = Column(String, nullable=True)
    email_enabled = Column(Boolean, default=True)
    whatsapp_enabled = Column(Boolean, default=True)
    interest_confirmations = Column(Boolean, default=True)
    group_matches = Column(Boolean, default=True)
    pricing_updates = Column(Boolean, default=True)
    marketing_messages = Column(Boolean, default=False)
    follow_up_sequences = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TravelerDocument(Base):
    __tablename__ = "user_documents"  # Keep table name for existing data
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_type = Column(String, nullable=False)  # aadhaar, pan, passport, driving_license, voter_id
    document_number = Column(String, nullable=False, index=True)
    document_name = Column(String)  # Display name for the document
    file_path = Column(String, nullable=False)  # Path to uploaded file
    file_url = Column(String)  # Public URL to access the file
    file_size = Column(Integer)  # File size in bytes
    mime_type = Column(String)  # File MIME type
    
    # Document details
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    issuing_authority = Column(String)
    place_of_issue = Column(String)
    
    # Verification status
    verification_status = Column(String, default="pending")  # pending, verified, rejected, expired
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who verified
    verified_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    is_primary = Column(Boolean, default=False)  # Primary document for this type
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    traveler = relationship("Traveler", back_populates="documents", foreign_keys=[user_id])
    verifier = relationship("Traveler", foreign_keys=[verified_by])


class PassengerDocument(Base):
    __tablename__ = "passenger_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who uploaded
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=True)  # Related interest/booking
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Related group
    
    # Passenger details
    passenger_name = Column(String, nullable=False)
    passenger_email = Column(String)
    passenger_phone = Column(String)
    date_of_birth = Column(DateTime)
    gender = Column(String)
    nationality = Column(String, default="Indian")
    relationship_type = Column(String)  # spouse, child, parent, friend, etc.
    
    # Document details
    document_type = Column(String, nullable=False)  # aadhaar, pan, passport, birth_certificate
    document_number = Column(String, nullable=False, index=True)
    file_path = Column(String, nullable=False)
    file_url = Column(String)
    file_size = Column(Integer)
    mime_type = Column(String)
    
    # Document validity
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    issuing_authority = Column(String)
    place_of_issue = Column(String)
    
    # Verification
    verification_status = Column(String, default="pending")
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    is_active = Column(Boolean, default=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    main_traveler = relationship("Traveler", back_populates="passenger_documents", foreign_keys=[user_id])
    interest = relationship("Interest")
    group = relationship("Group")
    verifier = relationship("Traveler", foreign_keys=[verified_by])


class TravelDocument(Base):
    __tablename__ = "travel_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Admin who uploaded
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    
    # Document details
    document_type = Column(String, nullable=False)  # hotel_voucher, flight_ticket, train_ticket, itinerary, visa_info, insurance
    document_title = Column(String, nullable=False)
    document_description = Column(Text)
    file_path = Column(String, nullable=False)
    file_url = Column(String)
    file_size = Column(Integer)
    mime_type = Column(String)
    
    # Travel details
    travel_date = Column(DateTime)
    validity_start = Column(DateTime)
    validity_end = Column(DateTime)
    vendor_name = Column(String)  # Hotel name, airline, etc.
    booking_reference = Column(String)
    cost = Column(Float)
    currency = Column(String, default="INR")
    
    # Access control
    is_public = Column(Boolean, default=False)  # Visible to all group members
    is_active = Column(Boolean, default=True)
    
    # Metadata
    tags = Column(JSON)  # Tags for categorization
    notes = Column(Text)  # Admin notes
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    uploader = relationship("Traveler", back_populates="travel_documents", foreign_keys=[uploaded_by])
    group = relationship("Group")
    destination = relationship("Destination")


class DocumentAccess(Base):
    __tablename__ = "document_access"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    travel_document_id = Column(Integer, ForeignKey("travel_documents.id"), nullable=True)
    user_document_id = Column(Integer, ForeignKey("user_documents.id"), nullable=True)
    passenger_document_id = Column(Integer, ForeignKey("passenger_documents.id"), nullable=True)
    
    # Access permissions
    can_view = Column(Boolean, default=True)
    can_download = Column(Boolean, default=True)
    access_granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_granted_at = Column(DateTime(timezone=True), server_default=func.now())
    access_expires_at = Column(DateTime)
    
    # Access tracking
    last_accessed_at = Column(DateTime)
    access_count = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    traveler = relationship("Traveler", foreign_keys=[user_id])
    granted_by = relationship("Traveler", foreign_keys=[access_granted_by])
    travel_document = relationship("TravelDocument")
    traveler_document = relationship("TravelerDocument")
    passenger_document = relationship("PassengerDocument")


class DocumentVerificationHistory(Base):
    __tablename__ = "document_verification_history"
    
    id = Column(Integer, primary_key=True, index=True)
    document_type = Column(String, nullable=False)  # user_document, passenger_document
    document_id = Column(Integer, nullable=False)
    
    # Verification details
    previous_status = Column(String)
    new_status = Column(String, nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    verification_notes = Column(Text)
    rejection_reason = Column(Text)
    
    # AI/ML verification (future)
    ai_confidence_score = Column(Float)
    ai_verification_data = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    verifier = relationship("Traveler")