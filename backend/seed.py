"""
Seed script — creates admin accounts from ADMIN_CREDENTIALS in .env.
Run: python seed.py

This is a convenience script for local development.
In production, admins are auto-seeded on app startup (see app/seed_admins.py).
"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_lab_assessment")
ADMIN_CREDENTIALS = os.getenv(
    "ADMIN_CREDENTIALS",
    "Kartavya Baluja|kartavya.baluja@geetauniversity.edu.in|Kartavya.Baluja@123",
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def parse_admins(creds: str):
    """Parse 'name|email|password,name|email|password,...' into tuples."""
    admins = []
    for entry in creds.split(","):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("|")
        if len(parts) == 3:
            admins.append((parts[0].strip(), parts[1].strip(), parts[2].strip()))
        else:
            print(f"⚠️  Skipping malformed entry: {entry}")
    return admins


async def seed():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    admins = parse_admins(ADMIN_CREDENTIALS)

    if not admins:
        print("⚠️  No admin credentials found in ADMIN_CREDENTIALS.")
        client.close()
        return

    for name, email, password in admins:
        existing = await db.admins.find_one({"email": email})
        if existing:
            await db.admins.update_one(
                {"email": email},
                {"$set": {
                    "name": name,
                    "passwordHash": pwd_context.hash(password),
                }},
            )
            print(f"✅ Admin account updated:")
        else:
            admin_doc = {
                "name": name,
                "email": email,
                "passwordHash": pwd_context.hash(password),
                "createdAt": datetime.now(timezone.utc),
            }
            await db.admins.insert_one(admin_doc)
            print(f"✅ Admin account created:")

        print(f"   Name:     {name}")
        print(f"   Email:    {email}")
        print(f"   Password: {'*' * len(password)}")

    print(f"\n⚠️  Credentials are read from .env ADMIN_CREDENTIALS — update there to change.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
