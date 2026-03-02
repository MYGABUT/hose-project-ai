from cryptography.fernet import Fernet
from app.core.config import settings
import base64

class EncryptionService:
    def __init__(self):
        self.key = settings.ENCRYPTION_KEY
        if not self.key:
            raise ValueError("ENCRYPTION_KEY is not set in configuration")
        self.fernet = Fernet(self.key)

    def encrypt(self, data: str) -> str:
        """Encrypts a string and returns a url-safe base64 encoded string."""
        if not data:
            return None
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, token: str) -> str:
        """Decrypts a token and returns the original string."""
        if not token:
            return None
        return self.fernet.decrypt(token.encode()).decode()

encryption_service = None

def get_encryption_service():
    global encryption_service
    if encryption_service is None:
        encryption_service = EncryptionService()
    return encryption_service
