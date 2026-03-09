import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ai_lab_assessment")

async def cleanup_db():
    print(f"Connecting to MongoDB database: {DB_NAME}...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    try:
        # Fetch all assessments to inspect them
        cursor = db.assessments.find({})
        assessments = await cursor.to_list(length=None)
        
        print(f"Total assessments in DB before cleanup: {len(assessments)}")

        # Titles we want to target for deletion (the ones we created today)
        target_prefixes = ["Assessment 2", "New Automated Assessment"]
        
        docs_to_delete = []
        for a in assessments:
            title = a.get("title", "")
            if any(title.startswith(p) for p in target_prefixes):
                docs_to_delete.append(a["_id"])
                
        if docs_to_delete:
            print(f"Found {len(docs_to_delete)} duplicate/old 'Assessment 2' items. Deleting them...")
            result = await db.assessments.delete_many({"_id": {"$in": docs_to_delete}})
            print(f"✅ Deleted {result.deleted_count} assessments.")
        else:
            print("No matching 'Assessment 2' items found to delete.")
            
        # Verify remaining count
        remaining = await db.assessments.count_documents({})
        print(f"Total assessments remaining in DB: {remaining}")
        print("Note: You should now run 'python create_bulk_assessments.py' once to create exactly 10 fresh 'Assessment 2' items.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        client.close()
        print("🔌 MongoDB connection closed.")

if __name__ == "__main__":
    asyncio.run(cleanup_db())
