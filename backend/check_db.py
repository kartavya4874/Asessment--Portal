import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

async def check_admins():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    
    print(f"Checking database: {settings.DB_NAME}")
    print(f"Admins Collection:")
    async for admin in db.admins.find():
        # Remove sensitive data
        admin.pop('passwordHash', None)
        print(admin)
    
    print("\nStudents Collection (with admin email):")
    async for student in db.students.find({"email": {"$regex": "admin", "$options": "i"}}):
        student.pop('passwordHash', None)
        print(student)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_admins())
