from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    
    # 🏢 Company Profile (JSON)
    # Stores: name, address, phone, email, website, npwp, logo(base64/url)
    company_profile = Column(JSON, nullable=True)
    
    # 💰 Tax & Finance (JSON)
    # Stores: ppnRate, currency, currencySymbol
    tax_config = Column(JSON, nullable=True)
    
    # 📄 Document Formats (JSON)
    # Stores: invoiceFooter, invoiceFormat, doFormat, poFormat
    document_formats = Column(JSON, nullable=True)
    
    # ⚙️ Operations (JSON)
    # Stores: globalMinStock, maxDiscountWithoutApproval, lowStockAlertEnabled
    operations_config = Column(JSON, nullable=True)
    
    # 🔒 Security Policies (JSON)
    # Stores: sessionTimeout, requirePasswordChange, minPasswordLength, pamDefaultDuration
    security_policy = Column(JSON, nullable=True)
    
    # 🔌 Integrations (Sensitive Data Encrypted)
    # Public fields:
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_username = Column(String, nullable=True)
    smtp_from_email = Column(String, nullable=True)
    
    wa_sender_number = Column(String, nullable=True)
    printer_type = Column(String, default="A4")
    
    # 🔐 Encrypted Fields (Fernet)
    # These store URL-safe base64 encoded strings of the encrypted data
    smtp_password_enc = Column(String, nullable=True)
    wa_api_key_enc = Column(String, nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
