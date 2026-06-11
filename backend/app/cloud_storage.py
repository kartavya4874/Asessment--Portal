import os
import uuid
import time
import boto3
from botocore.config import Config
from typing import Optional
from app.config import get_settings

settings = get_settings()

_s3_client = None

# In-memory signed URL cache: {blob_name: (url, expiry_timestamp)}
_signed_url_cache = {}
_CACHE_TTL_SECONDS = 30 * 60  # Cache for 30 minutes (URLs expire in 60 min)
_MAX_CACHE_SIZE = 1000  # Evict oldest entries beyond this limit

def _get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    if not settings.CLOUDFLARE_R2_ACCOUNT_ID:
        print("⚠️ Cloudflare R2 Account ID not configured. File uploads will be disabled.")
        return None

    try:
        _s3_client = boto3.client(
            's3',
            endpoint_url=f"https://{settings.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        return _s3_client
    except Exception as e:
        print(f"⚠️ R2 initialization failed: {e}")
        return None


async def upload_file_to_cloud(
    file_bytes: bytes,
    destination_path: str,
    content_type: str = "application/octet-stream",
) -> tuple:
    """Upload file bytes to Cloudflare R2 and return (url, path) tuple."""
    client = _get_s3_client()
    if client is None:
        # In dev mode without R2, return a placeholder URL
        return f"/local-placeholder/{destination_path}", destination_path

    bucket_name = settings.CLOUDFLARE_R2_BUCKET
    try:
        client.put_object(
            Bucket=bucket_name,
            Key=destination_path,
            Body=file_bytes,
            ContentType=content_type
        )
        
        # If public URL is configured, return it
        if settings.CLOUDFLARE_R2_PUBLIC_URL:
            public_url = f"{settings.CLOUDFLARE_R2_PUBLIC_URL}/{destination_path}"
            return public_url, destination_path
            
        # Otherwise, generate a signed url right away or just return a placeholder
        # The frontend will use the signed url generation route if needed.
        return f"/r2/{destination_path}", destination_path
    except Exception as e:
        print(f"❌ ERROR: Failed to upload file to R2: {e}")
        raise


async def generate_signed_url(
    blob_name: str, expiration_minutes: int = 60
) -> Optional[str]:
    """Generate a signed URL for a Cloudflare R2 object, with in-memory caching."""
    # Check cache first
    now = time.time()
    cached = _signed_url_cache.get(blob_name)
    if cached and cached[1] > now:
        return cached[0]

    client = _get_s3_client()
    if client is None:
        return f"/local-placeholder/{blob_name}"

    try:
        url = client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.CLOUDFLARE_R2_BUCKET,
                'Key': blob_name
            },
            ExpiresIn=expiration_minutes * 60
        )

        # Cache the URL
        _signed_url_cache[blob_name] = (url, now + _CACHE_TTL_SECONDS)

        # Evict expired entries and enforce max size
        if len(_signed_url_cache) > _MAX_CACHE_SIZE:
            expired = [k for k, (_, exp) in _signed_url_cache.items() if exp <= now]
            for k in expired:
                del _signed_url_cache[k]
            if len(_signed_url_cache) > _MAX_CACHE_SIZE:
                sorted_keys = sorted(_signed_url_cache, key=lambda k: _signed_url_cache[k][1])
                for k in sorted_keys[:len(_signed_url_cache) - _MAX_CACHE_SIZE]:
                    del _signed_url_cache[k]

        return url
    except Exception as e:
        print(f"❌ ERROR: Failed to generate signed URL: {e}")
        return None


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving the extension."""
    ext = os.path.splitext(original_filename)[1]
    return f"{uuid.uuid4().hex}{ext}"
