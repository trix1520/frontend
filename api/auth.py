import hmac
import hashlib
import json
from urllib.parse import parse_qs
import os

BOT_TOKEN = os.environ.get("BOT_TOKEN", "8207211595:AAEymQ8x5HpD4cOU_UYlFWyAQD1VXTy2Dhw")

def validate_init_data(raw_init_data: str) -> bool:
    if not raw_init_data:
        return False
    
    try:
        parsed = parse_qs(raw_init_data)
        hash_value = parsed.get("hash", [None])[0]
        if not hash_value:
            return False
        
        data_check_string = "\n".join(
            f"{k}={v[0]}" for k, v in sorted(parsed.items()) if k != "hash"
        )
        
        secret_key = hmac.new(
            b"WebAppData",
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return calculated_hash == hash_value
    except Exception as e:
        print(f"Validation error: {e}")
        return False
