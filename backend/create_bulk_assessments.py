import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ai_lab_assessment")

async def create_assessments():
    if not MONGODB_URI:
        print("❌ Error: MONGODB_URI not found in environment variables. Please check your .env file.")
        return

    print(f"Connecting to MongoDB database: {DB_NAME}...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    try:
        # Fetch all programs
        programs_cursor = db.programs.find({}, {"_id": 1})
        programs = await programs_cursor.to_list(length=None)
        
        if not programs:
            print("⚠️ No programs found in the database. Exiting.")
            return

        print(f"✅ Found {len(programs)} programs. Preparing to create assessments...")

        now = datetime.now(timezone.utc)
        
        # -------------------------------------------------------------------
        # CUSTOMIZE YOUR ASSESSMENT DETAILS HERE
        # -------------------------------------------------------------------
        title = f"Assessment 2"
        description = """Assignment: Prompt Engineering Certification

Objective: Complete the free online course "Prompt Engineering for Everyone" offered by IBM Skills Network on Cognitive Class and submit proof of completion.

Course Details:
Course: Prompt Engineering for Everyone
Provider: IBM Skills Network / Cognitive Class
Cost: Free
Link: https://cognitiveclass.ai/courses/prompt-engineering-for-everyone
Topics Covered: Chain-of-Thought prompting, Persona Pattern, advanced AI prompting strategies

Steps to Complete:
1. Visit the course link and create a free account.
2. Enroll in the course and complete all modules.
3. Download your certificate upon successful completion.
4. Post on LinkedIn with your certificate.
5. Upload your certificate in the submission area.
6. Submit the LinkedIn post URL in the submission link area.

Submission Requirements:
1. Certificate downloaded - Mandatory
2. Certificate uploaded in submission area - Mandatory
3. LinkedIn post published with certificate - Mandatory
4. LinkedIn post URL submitted - Mandatory
5. Tag @Kartavya Baluja - Optional (Recommended)
6. Tag @Pankaj Bajaj - Optional (Recommended)
7. Tag @Geeta University - Optional (Recommended)
8. Tag @Geeta Technical Hub - Optional (Recommended)

Note: Tagging @Kartavya Baluja, @Pankaj Bajaj, @Geeta University, and @Geeta Technical Hub in your LinkedIn post is optional but highly recommended; it helps showcase your achievement to the academic community and builds your professional network.

Important:
- LinkedIn posting is mandatory; submissions without a post will not be accepted.
- Certificate must be uploaded directly in the submission area.
- Incomplete submissions will not be evaluated.

Good luck!"""
        start_at = datetime(2026, 3, 14, 8, 0, tzinfo=timezone.utc)
        deadline = datetime(2026, 3, 22, 23, 59, tzinfo=timezone.utc)
        max_marks = 25
        created_by = "System Admin Script"  # Could optionally be a specific Admin ID
        # -------------------------------------------------------------------

        docs_to_insert = []
        
        for prog in programs:
            prog_id = str(prog["_id"])
            
            assessment_doc = {
                "programId": prog_id,
                "title": title,
                "description": description,
                "attachedFiles": [],
                "startAt": start_at,
                "deadline": deadline,
                "isLocked": False,
                "maxMarks": max_marks,
                "createdBy": created_by,
                "createdAt": now,
            }
            docs_to_insert.append(assessment_doc)

        if docs_to_insert:
            result = await db.assessments.insert_many(docs_to_insert)
            print(f"✅ Successfully inserted {len(result.inserted_ids)} assessments across all programs!")
            
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        client.close()
        print("🔌 MongoDB connection closed.")

if __name__ == "__main__":
    asyncio.run(create_assessments())
