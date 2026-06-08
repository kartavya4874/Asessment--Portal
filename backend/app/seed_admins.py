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
    """Upsert the hardcoded super admin + env-defined instructor accounts.
    Also demotes any stale super_admin accounts from previous versions.
    """
    settings = get_settings()

    # ── 0. Demote stale super_admins from previous deployments ──
    # Only the hardcoded email should ever be super_admin.
    # Any other account that was previously granted super_admin
    # (e.g. from old seeding logic) gets demoted to instructor.
    demote_result = await db.admins.update_many(
        {
            "adminRole": "super_admin",
            "email": {"$ne": SUPER_ADMIN_EMAIL},
        },
        {"$set": {"adminRole": "instructor"}},
    )
    if demote_result.modified_count > 0:
        print(f"Demoted {demote_result.modified_count} stale super_admin(s) to instructor")

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

    # ── 3. Seed default subject domains ─────────────────────────
    await seed_default_domains()


async def seed_default_domains():
    """Seed initial subject/domain options if database is empty."""
    try:
        count = await db.domains.count_documents({})
        if count == 0:
            default_domains = [
                {
                    "name": "Graphic Design",
                    "description": "Learn layout design, visual branding, typography, and professional software usage.",
                    "code": "GD-101",
                    "createdAt": datetime.now(timezone.utc)
                },
                {
                    "name": "Social Media Marketing",
                    "description": "Master online community management, content scheduling, and social media analytics.",
                    "code": "SMM-102",
                    "createdAt": datetime.now(timezone.utc)
                },
                {
                    "name": "SEO (Search Engine Optimization)",
                    "description": "On-page and off-page optimization, search algorithms, keyword research, and traffic analytics.",
                    "code": "SEO-103",
                    "createdAt": datetime.now(timezone.utc)
                }
            ]
            await db.domains.insert_many(default_domains)
            print("Default subject/domain tracks seeded")
    except Exception as e:
        print(f"Failed to seed default subject/domain tracks: {e}")


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
            print(f"Admin verified: {email} (role: {existing.get('adminRole', role)})")
        else:
            await db.admins.insert_one({
                "name": name,
                "email": email,
                "passwordHash": pwd_context.hash(password),
                "adminRole": role,
                "createdAt": datetime.now(timezone.utc),
            })
            print(f"Admin created: {email} (role: {role})")
    except Exception as e:
        print(f"Failed to seed admin {email}: {e}")
