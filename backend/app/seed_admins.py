"""
Auto-seed admin accounts on app startup.
Reads ADMIN_CREDENTIALS from settings and upserts into MongoDB.
"""
from datetime import datetime, timezone
from passlib.context import CryptContext
from app.config import get_settings
from app.database import db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_admins():
    """Upsert all admin accounts defined in ADMIN_CREDENTIALS."""
    settings = get_settings()
    admins = settings.get_admin_list()

    if not admins:
        print("⚠️  No admin credentials found in ADMIN_CREDENTIALS — skipping seed.")
        return

    for name, email, password in admins:
        try:
            existing = await db.admins.find_one({"email": email})
            if existing:
                await db.admins.update_one(
                    {"email": email},
                    {"$set": {
                        "name": name,
                        "passwordHash": pwd_context.hash(password),
                    }},
                )
                print(f"✅ Admin updated: {email}")
            else:
                await db.admins.insert_one({
                    "name": name,
                    "email": email,
                    "passwordHash": pwd_context.hash(password),
                    "createdAt": datetime.now(timezone.utc),
                })
                print(f"✅ Admin created: {email}")
        except Exception as e:
            print(f"⚠️  Failed to seed admin {email}: {e}")
