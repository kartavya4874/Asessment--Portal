import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ai_lab_assessment")

async def update_db():
    print(f"Connecting to MongoDB database: {DB_NAME}...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    formatted_description = """ASSIGNMENT: Prompt Engineering Certification

---- OBJECTIVE ----
Complete the free online course "Prompt Engineering for Everyone" offered by IBM Skills Network on Cognitive Class and submit proof of completion.

---- COURSE DETAILS ----
1. Course: Prompt Engineering for Everyone
2. Provider: IBM Skills Network / Cognitive Class
3. Cost: Free
4. Link: https://cognitiveclass.ai/courses/prompt-engineering-for-everyone
5. Topics Covered: Chain-of-Thought prompting, Persona Pattern, advanced AI prompting strategies

---- STEPS TO COMPLETE ----
Step 1: Visit the course link and create a free account.
Step 2: Enroll in the course and complete all modules.
Step 3: Download your certificate upon successful completion.
Step 4: Post on LinkedIn with your certificate.
Step 5: Upload your certificate in the submission area.
Step 6: Submit the LinkedIn post URL in the submission link area.

---- SUBMISSION REQUIREMENTS ----
1. Certificate downloaded (Mandatory)
2. Certificate uploaded in submission area (Mandatory)
3. LinkedIn post published with certificate (Mandatory)
4. LinkedIn post URL submitted (Mandatory)
5. Tag @Kartavya Baluja (Optional, Recommended)
6. Tag @Pankaj Bajaj (Optional, Recommended)
7. Tag @Geeta University (Optional, Recommended)
8. Tag @Geeta Technical Hub (Optional, Recommended)

---- NOTE ----
Tagging the above handles in your LinkedIn post is optional but highly recommended; it helps showcase your achievement to the academic community and builds your professional network.

---- IMPORTANT ----
- LinkedIn posting is mandatory; submissions without a post will not be accepted.
- Certificate must be uploaded directly in the submission area.
- Incomplete submissions will not be evaluated.

Good luck!"""

    try:
        # Update all assessments that have title "Assessment 2"
        result = await db.assessments.update_many(
            {"title": "Assessment 2"},
            {"$set": {"description": formatted_description}}
        )
        print(f"✅ Successfully updated {result.modified_count} assessments.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        client.close()
        print("🔌 MongoDB connection closed.")

if __name__ == "__main__":
    asyncio.run(update_db())
