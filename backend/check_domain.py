import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

URI = "mongodb+srv://kartavyabaluja453:XSIE10xhp8zeiMh8@cluster0.wwcan.mongodb.net/?appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "ai_lab_assessment"

async def main():
    client = AsyncIOMotorClient(URI, tlsCAFile=certifi.where())
    db = client[DB_NAME]
    
    domain_id = "6a26982ae9ae8bb8b630beaa"
    domain = await db.domains.find_one({"_id": ObjectId(domain_id)})
    
    if domain:
        print(f"Domain found: {domain['name']}")
    else:
        print("Domain not found!")

if __name__ == "__main__":
    asyncio.run(main())
