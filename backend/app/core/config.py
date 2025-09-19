from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev-secret-key"
    JWT_SECRET: str = "jwt-secret-key"
    
    # Database
    DATABASE_URL: str = "postgresql://travelkit:password@localhost:5432/travelkit"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["*"]  # Temporarily allow all origins for debugging
    
    # External Services
    SENDGRID_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"  # Default Twilio sandbox number
    STRIPE_SECRET_KEY: str = ""
    
    # Notification Settings
    FROM_EMAIL: str = "noreply@travelkit.com"
    FROM_NAME: str = "TravelKit"
    NOTIFICATION_RETRY_ATTEMPTS: int = 3
    NOTIFICATION_RETRY_DELAY: int = 300  # 5 minutes
    
    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    
    # Application
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"


settings = Settings()