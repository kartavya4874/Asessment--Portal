"""
Auto-seed admin accounts on app startup.
- The HARDCODED super admin is the ONLY super_admin in the system.
- Any admins from ADMIN_CREDENTIALS env var are seeded as instructors.
- Existing passwords are never overwritten (so manual changes survive restarts).
"""
from datetime import datetime, timezone
from passlib.context import CryptContext
from app.config import get_settings
from app.database import db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ──────────────────────────────────────────────────────────────
# The ONE and ONLY super admin — hardcoded, never deletable
# ──────────────────────────────────────────────────────────────
SUPER_ADMIN_EMAIL = "admin@geetauniversity.edu.in"
SUPER_ADMIN_NAME = "Super Admin"
SUPER_ADMIN_PASSWORD = "Random@123"


async def seed_admins():
    """Upsert the hardcoded super admin + env-defined instructor accounts."""
    settings = get_settings()

    # ── 1. Seed the single super admin ─────────────────────────
    await _upsert_admin(
        name=SUPER_ADMIN_NAME,
        email=SUPER_ADMIN_EMAIL,
        password=SUPER_ADMIN_PASSWORD,
        role="super_admin",
    )

    # ── 2. Seed env-defined admins as instructors ──────────────
    env_admins = settings.get_admin_list()
    for name, email, password in env_admins:
        email_lower = email.lower().strip()
        # Never overwrite the hardcoded super admin via env
        if email_lower == SUPER_ADMIN_EMAIL:
            continue
        await _upsert_admin(
            name=name,
            email=email_lower,
            password=password,
            role="instructor",
        )


async def _upsert_admin(*, name: str, email: str, password: str, role: str):
    """Insert a new admin or update name only (never overwrite existing password)."""
    email = email.lower().strip()
    try:
        existing = await db.admins.find_one({"email": email})
        if existing:
            # Only update the name; never touch the password
            # (so manual password changes via UI survive restarts)
            update_fields = {"name": name}
            # Ensure the hardcoded super admin always keeps super_admin role
            if email == SUPER_ADMIN_EMAIL:
                update_fields["adminRole"] = "super_admin"
            await db.admins.update_one(
                {"email": email},
                {"$set": update_fields},
            )
            print(f"✅ Admin verified: {email} (role: {existing.get('adminRole', role)})")
        else:
            await db.admins.insert_one({
                "name": name,
                "email": email,
                "passwordHash": pwd_context.hash(password),
                "adminRole": role,
                "createdAt": datetime.now(timezone.utc),
            })
            print(f"✅ Admin created: {email} (role: {role})")
    except Exception as e:
        print(f"⚠️  Failed to seed admin {email}: {e}")
