import asyncio
import os
import certifi
from dotenv import load_dotenv

async def test_mongo():
    try:
        import motor.motor_asyncio
        uri = os.environ.get("MONGODB_URI")
        print(f"MongoDB URI found: {'Yes' if uri else 'No'}")
        client = motor.motor_asyncio.AsyncIOMotorClient(
            uri,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000
        )
        await client.admin.command("ping")
        print("SUCCESS MongoDB connection")
    except Exception as e:
        print(f"FAILED MongoDB connection: {e}")

def test_firebase():
    try:
        import firebase_admin
        from firebase_admin import credentials, storage
        cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
        print(f"Firebase Cred Path: {cred_path}")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET")
            print(f"Firebase Bucket: {bucket_name}")
            if bucket_name.startswith("gs://"):
                bucket_name = bucket_name[5:]
            firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
            bucket = storage.bucket()
            print("SUCCESS Firebase initialization")
        else:
            print("FAILED Firebase credentials file not found!")
    except Exception as e:
        print(f"FAILED Firebase initialization: {e}")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(test_mongo())
    test_firebase()
