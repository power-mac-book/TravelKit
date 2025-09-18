from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.models import Page
from app.models.schemas import PageCreate, PageUpdate


class PageService:
    def __init__(self, db: Session):
        self.db = db

    def get_pages(self, skip: int = 0, limit: int = 100, published_only: bool = False) -> List[Page]:
        """Get all pages with optional filtering"""
        query = self.db.query(Page)
        
        if published_only:
            query = query.filter(Page.is_published == True)
            
        return query.offset(skip).limit(limit).all()

    def get_page_by_id(self, page_id: int) -> Optional[Page]:
        """Get page by ID"""
        return self.db.query(Page).filter(Page.id == page_id).first()

    def get_page_by_slug(self, slug: str, published_only: bool = False) -> Optional[Page]:
        """Get page by slug"""
        query = self.db.query(Page).filter(Page.slug == slug)
        
        if published_only:
            query = query.filter(Page.is_published == True)
            
        return query.first()

    def create_page(self, page_data: PageCreate) -> Page:
        """Create a new page"""
        db_page = Page(**page_data.dict())
        self.db.add(db_page)
        self.db.commit()
        self.db.refresh(db_page)
        return db_page

    def update_page(self, page_id: int, page_data: PageUpdate) -> Optional[Page]:
        """Update an existing page"""
        page = self.get_page_by_id(page_id)
        if not page:
            return None

        update_data = page_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(page, field, value)

        self.db.commit()
        self.db.refresh(page)
        return page

    def delete_page(self, page_id: int) -> bool:
        """Delete a page"""
        page = self.get_page_by_id(page_id)
        if not page:
            return False

        self.db.delete(page)
        self.db.commit()
        return True

    def create_default_pages(self) -> List[Page]:
        """Create default pages if they don't exist"""
        default_pages = [
            {
                "slug": "privacy-policy",
                "title": "Privacy Policy",
                "content": """
<h1>Privacy Policy</h1>
<p>Last updated: [Date]</p>

<h2>Information We Collect</h2>
<p>We collect information you provide directly to us, such as when you create an account, make a reservation, or contact us.</p>

<h2>How We Use Your Information</h2>
<p>We use the information we collect to provide, maintain, and improve our services.</p>

<h2>Information Sharing</h2>
<p>We do not sell, trade, or otherwise transfer your personal information to outside parties.</p>

<h2>Data Security</h2>
<p>We implement appropriate security measures to protect your personal information.</p>

<h2>Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us.</p>
                """,
                "meta_title": "Privacy Policy - TravelKit",
                "meta_description": "Learn about how TravelKit collects, uses, and protects your personal information."
            },
            {
                "slug": "terms-of-service",
                "title": "Terms of Service",
                "content": """
<h1>Terms of Service</h1>
<p>Last updated: [Date]</p>

<h2>Acceptance of Terms</h2>
<p>By accessing and using TravelKit, you accept and agree to be bound by the terms and provision of this agreement.</p>

<h2>Services</h2>
<p>TravelKit provides a platform for organizing group travel experiences.</p>

<h2>User Responsibilities</h2>
<p>You are responsible for your use of the service and for any content you provide.</p>

<h2>Payment Terms</h2>
<p>Payment terms and cancellation policies are clearly stated during the booking process.</p>

<h2>Limitation of Liability</h2>
<p>TravelKit shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>

<h2>Changes to Terms</h2>
<p>We reserve the right to modify these terms at any time.</p>
                """,
                "meta_title": "Terms of Service - TravelKit",
                "meta_description": "Read TravelKit's terms of service and understand your rights and responsibilities."
            },
            {
                "slug": "contact-us",
                "title": "Contact Us",
                "content": """
<h1>Contact Us</h1>
<p>We'd love to hear from you! Get in touch with us for any questions or support.</p>

<h2>Customer Support</h2>
<p><strong>Email:</strong> support@travelkit.com</p>
<p><strong>Phone:</strong> +1-800-TRAVEL-KIT</p>
<p><strong>Hours:</strong> Monday - Friday, 9 AM - 6 PM EST</p>

<h2>Business Inquiries</h2>
<p><strong>Email:</strong> business@travelkit.com</p>
<p><strong>Phone:</strong> +1-800-BUSINESS</p>

<h2>Office Address</h2>
<p>TravelKit Inc.<br>
123 Travel Street<br>
Adventure City, AC 12345<br>
United States</p>

<h2>Social Media</h2>
<p>Follow us on social media for the latest updates and travel inspiration:</p>
<ul>
<li>Facebook: @TravelKitOfficial</li>
<li>Instagram: @travelkit</li>
<li>Twitter: @travelkit</li>
</ul>
                """,
                "meta_title": "Contact Us - TravelKit",
                "meta_description": "Get in touch with TravelKit for customer support, business inquiries, or general questions."
            }
        ]

        created_pages = []
        for page_data in default_pages:
            existing_page = self.get_page_by_slug(page_data["slug"])
            if not existing_page:
                page = self.create_page(PageCreate(**page_data))
                created_pages.append(page)

        return created_pages