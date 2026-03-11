from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Tuple


class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "ai_lab_assessment"
    JWT_SECRET: str = "dev-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-credentials.json"
    FIREBASE_STORAGE_BUCKET: str = ""
    DEV_MODE: bool = True
    FRONTEND_URL: str = "http://localhost:5173,https://assessments.kartavyabaluja.in"
    CLOUDFLARE_EMAIL_WORKER_URL: str = ""
    RESEND_API_KEY: str = ""
    
    # Email Configuration (Brevo HTTP API — avoids SMTP port 587 blocked by Render)
    # Get your API key from: https://app.brevo.com/settings/keys/api
    BREVO_API_KEY: str = ""
    SENDER_EMAIL: str = ""
    EMAIL_ENABLED: bool = True

    # Format: "name|email|password,name|email|password,..."
    # ⚠️ DO NOT set defaults here. All values must come from the .env file.
    ADMIN_CREDENTIALS: str = ""

    def get_admin_list(self) -> List[Tuple[str, str, str]]:
        """Parse ADMIN_CREDENTIALS into a list of (name, email, password) tuples."""
        admins = []
        for entry in self.ADMIN_CREDENTIALS.split(","):
            entry = entry.strip()
            if not entry:
                continue
            parts = entry.split("|")
            if len(parts) == 3:
                admins.append((parts[0].strip(), parts[1].strip(), parts[2].strip()))
            else:
                print(f"⚠️  Skipping malformed admin entry: {entry}")
        return admins

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
