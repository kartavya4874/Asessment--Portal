"""
Auto-seed admin accounts on app startup.
Reads ADMIN_CREDENTIALS from settings and upserts into MongoDB.
"""
from datetime import datetime, timezone
from passlib.context import CryptContext
from app.config import get_settings
from app.database import db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hardcoded super admin accounts that are always seeded
HARDCODED_SUPER_ADMINS = [
    ("Super Admin", "admin@geetauniversity.edu.in", "Random@123"),
]


async def seed_admins():
    """Upsert all admin accounts defined in ADMIN_CREDENTIALS + hardcoded list."""
    settings = get_settings()
    admins = settings.get_admin_list()

    # Merge hardcoded admins (avoid duplicates by email)
    existing_emails = {a[1].lower().strip() for a in admins}
    for entry in HARDCODED_SUPER_ADMINS:
        if entry[1].lower().strip() not in existing_emails:
            admins.append(entry)

    if not admins:
        print("⚠️  No admin credentials found — skipping seed.")
        return

    for name, email, password in admins:
        try:
            email = email.lower().strip()
            existing = await db.admins.find_one({"email": email})
            if existing:
                update_fields = {
                    "name": name,
                    "passwordHash": pwd_context.hash(password),
                }
                # Set adminRole to super_admin if not already set
                if not existing.get("adminRole"):
                    update_fields["adminRole"] = "super_admin"
                await db.admins.update_one(
                    {"email": email},
                    {"$set": update_fields},
                )
                print(f"✅ Admin updated: {email} (role: {existing.get('adminRole', 'super_admin')})")
            else:
                await db.admins.insert_one({
                    "name": name,
                    "email": email,
                    "passwordHash": pwd_context.hash(password),
                    "adminRole": "super_admin",  # Seeded admins are super admins
                    "createdAt": datetime.now(timezone.utc),
                })
                print(f"✅ Admin created: {email} (role: super_admin)")
        except Exception as e:
            print(f"⚠️  Failed to seed admin {email}: {e}")

