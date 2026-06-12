import hmac
import hashlib

def verify_signature(raw_body: bytes, webhook_secret: str, signature_header: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    
    try:
        expected_signature = signature_header.split("sha256=")[1].strip()
    except IndexError:
        return False
    
    computed_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, expected_signature)
