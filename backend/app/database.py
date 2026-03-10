import motor.motor_asyncio
import certifi
from app.config import get_settings

settings = get_settings()

client = motor.motor_asyncio.AsyncIOMotorClient(
    settings.MONGODB_URI,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=5000
)
db = client[settings.DB_NAME]

# Collection references
admins_collection = db["admins"]
students_collection = db["students"]
programs_collection = db["programs"]
assessments_collection = db["assessments"]
submissions_collection = db["submissions"]
password_resets_collection = db["password_resets"]
email_queue_collection = db["email_queue"]  # For rate-limited email delivery


async def connect_db():
    """Ping MongoDB to verify connection."""
    await client.admin.command("ping")
    print(f"✅ Connected to MongoDB: {settings.DB_NAME}")


async def setup_indexes():
    """Create MongoDB indexes for performance."""
    import pymongo

    try:
        # Submissions: query by assessmentId or studentId frequently
        await submissions_collection.create_index([("assessmentId", pymongo.ASCENDING)])
        await submissions_collection.create_index([("studentId", pymongo.ASCENDING)])
        await submissions_collection.create_index(
            [("assessmentId", pymongo.ASCENDING), ("studentId", pymongo.ASCENDING)],
            unique=True
        )

        # Assessments: query by programId and status
        await assessments_collection.create_index([("programId", pymongo.ASCENDING)])
        await assessments_collection.create_index([("createdAt", pymongo.DESCENDING)])

        # Students: query by email (login) and programId
        await students_collection.create_index([("email", pymongo.ASCENDING)], unique=True)
        await students_collection.create_index([("rollNumber", pymongo.ASCENDING)], unique=True)
        await students_collection.create_index([("programId", pymongo.ASCENDING)])

        print("⚡ MongoDB indexes created/verified")
    except Exception as e:
        print(f"⚠️ Failed to create MongoDB indexes: {e}")


async def close_db():
    """Close MongoDB client."""
    client.close()
    print("🔌 MongoDB connection closed")

