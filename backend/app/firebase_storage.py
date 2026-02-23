import os
import uuid
from datetime import timedelta
from typing import Optional
from app.config import get_settings

settings = get_settings()

# Firebase may not be configured in dev mode
_bucket = None


def _get_bucket():
    global _bucket
    if _bucket is not None:
        return _bucket

    try:
        import firebase_admin
        from firebase_admin import credentials, storage

        if not firebase_admin._apps:
            cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
            if cred_json:
                try:
                    import json
                    cred_dict = json.loads(cred_json)
                    cred = credentials.Certificate(cred_dict)
                    bucket_name = settings.FIREBASE_STORAGE_BUCKET
                    if bucket_name.startswith("gs://"):
                        bucket_name = bucket_name[5:]
                    
                    firebase_admin.initialize_app(
                        cred, {"storageBucket": bucket_name}
                    )
                except Exception as e:
                    print(f"❌ ERROR: Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")
                    return None
            else:
                cred_path = settings.FIREBASE_CREDENTIALS_PATH
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    bucket_name = settings.FIREBASE_STORAGE_BUCKET
                    if bucket_name.startswith("gs://"):
                        bucket_name = bucket_name[5:]
                        
                    firebase_admin.initialize_app(
                        cred, {"storageBucket": bucket_name}
                    )
                else:
                    print("⚠️  Firebase credentials not found. File uploads will be disabled.")
                    return None

        _bucket = storage.bucket()
        return _bucket
    except Exception as e:
        print(f"⚠️  Firebase initialization failed: {e}")
        return None


async def upload_file_to_firebase(
    file_bytes: bytes,
    destination_path: str,
    content_type: str = "application/octet-stream",
) -> Optional[str]:
    """Upload file bytes to Firebase Storage and return public URL."""
    bucket = _get_bucket()
    if bucket is None:
        # In dev mode without Firebase, return a placeholder URL
        return f"/local-placeholder/{destination_path}"

    blob = bucket.blob(destination_path)
    blob.upload_from_string(file_bytes, content_type=content_type)
    try:
        blob.make_public()
    except Exception:
        pass
    return blob.public_url, destination_path


async def generate_signed_url(
    blob_name: str, expiration_minutes: int = 60
) -> Optional[str]:
    """Generate a signed URL for a Firebase Storage blob."""
    bucket = _get_bucket()
    if bucket is None:
        return f"/local-placeholder/{blob_name}"

    blob = bucket.blob(blob_name)
    url = blob.generate_signed_url(expiration=timedelta(minutes=expiration_minutes))
    return url


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving the extension."""
    ext = os.path.splitext(original_filename)[1]
    return f"{uuid.uuid4().hex}{ext}"
