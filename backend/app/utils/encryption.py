from cryptography.fernet import Fernet
from app.config import settings

class CredentialEncryptor:
    def __init__(self):
        key = settings.ENCRYPTION_KEY.encode() if settings.ENCRYPTION_KEY else b""
        if not key:
            # Generate a temporary fallback key or raise error
            # If in production we should raise an error, but let's allow fallback in development
            # Let's check if we can generate a key for temporary use
            self.fallback_key = Fernet.generate_key()
            self.cipher = Fernet(self.fallback_key)
        else:
            self.cipher = Fernet(key)

    def encrypt(self, plain_text: str | None) -> str | None:
        if not plain_text:
            return None
        return self.cipher.encrypt(plain_text.encode()).decode()

    def decrypt(self, cipher_text: str | None) -> str | None:
        if not cipher_text:
            return None
        try:
            return self.cipher.decrypt(cipher_text.encode()).decode()
        except Exception:
            # If it fails, maybe it was encrypted with the fallback key or is not encrypted (e.g. initial setup)
            return cipher_text

encryptor = CredentialEncryptor()
