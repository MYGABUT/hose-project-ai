"""
Configuration settings for the application
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    # App Info
    APP_NAME: str = os.getenv("APP_NAME", "HOSE PRO AI Scanner")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data_source"
    CSV_PATH: str = str(DATA_DIR / "HoseDataset_Full.csv")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/hose_db_v3"
    )
    
    # Async Database URL (auto-derived from DATABASE_URL)
    @property
    def DATABASE_URL_ASYNC(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    # OCR Settings
    OCR_LANG: str = os.getenv("OCR_LANG", "en")
    OCR_USE_GPU: bool = os.getenv("OCR_USE_GPU", "False").lower() == "true"
    
    # Fuzzy Match Threshold
    BRAND_MATCH_THRESHOLD: int = 85
    PRODUCT_MATCH_THRESHOLD: int = 80
    
    # API Settings
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")

    # Email Ingestion Settings
    EMAIL_SERVER: str = os.getenv("EMAIL_SERVER", "imap.gmail.com")
    
    # Security
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY")
    EMAIL_USER: str = os.getenv("EMAIL_USER", "ap@hosepro.com")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "changeme")
    EMAIL_FOLDER: str = os.getenv("EMAIL_FOLDER", "INBOX")

    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION_IF_MISSING")
    REFRESH_TOKEN_SECRET: str = os.getenv("REFRESH_TOKEN_SECRET", "REFRESH_CHANGE_THIS_TOO")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Business Logic Constants
    LABOR_COST_PER_UNIT: float = 5000.0
    WASTE_THRESHOLD_METERS: float = 0.5
    DEFAULT_TAX_RATE: float = float(os.getenv("TAX_RATE", "11.0"))

settings = Settings()
