from jose import jwt
from app.config import get_settings
from datetime import datetime, timedelta, timezone

def test_token():
    settings = get_settings()
    print(f"Using Secret: {settings.JWT_SECRET[:5]}...")
    print(f"Algorithm: {settings.JWT_ALGORITHM}")
    
    data = {"sub": "test_id", "role": "admin"}
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    data.update({"exp": expire})
    
    token = jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    print(f"Generated Token: {token[:20]}...")
    
    decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    print(f"Decoded Data: {decoded}")
    
    if decoded.get("role") == "admin":
        print("✅ Role 'admin' is correctly preserved in token.")
    else:
        print("❌ Role 'admin' is MISSING or INCORRECT in token.")

if __name__ == "__main__":
    test_token()
