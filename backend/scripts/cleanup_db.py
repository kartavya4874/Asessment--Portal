import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db, connect_db, client

async def cleanup_database():
    try:
        print("🔍 Connecting to database...")
        await connect_db()
        
        collections_to_clear = ["students", "programs", "assessments", "submissions"]
        
        print(f"⚠️  WARNING: This will delete all data in: {', '.join(collections_to_clear)}")
        confirm = input("Are you sure you want to proceed? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ Cleanup cancelled.")
            return

        for coll_name in collections_to_clear:
            print(f"🧹 Clearing collection: {coll_name}...")
            await db[coll_name].delete_many({})
            
        print("✅ Cleanup complete! Admins have been preserved.")
        print("💡 The next time you start the backend, admins will be auto-seeded from your .env file.")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_database())
