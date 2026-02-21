import motor.motor_asyncio
import certifi
from app.config import get_settings

settings = get_settings()

client = motor.motor_asyncio.AsyncIOMotorClient(
    settings.MONGODB_URI,
    tlsCAFile=certifi.where()
)
db = client[settings.DB_NAME]

# Collection references
admins_collection = db["admins"]
students_collection = db["students"]
programs_collection = db["programs"]
assessments_collection = db["assessments"]
submissions_collection = db["submissions"]


async def connect_db():
    """Ping MongoDB to verify connection."""
    await client.admin.command("ping")
    print(f"✅ Connected to MongoDB: {settings.DB_NAME}")


async def close_db():
    """Close MongoDB client."""
    client.close()
    print("🔌 MongoDB connection closed")
