import asyncio
from datetime import datetime, timezone, timedelta
from app.database import assessments_collection, students_collection
from app.utils.email_service import email_service
from app.config import get_settings

settings = get_settings()

async def send_closing_reminders():
    """
    Background job that checks for any assessment closing within the next 72 hours.
    Sends an email reminder to students enrolled in the corresponding program.
    Because there is an email daily quota, we queue these 3 days in advance.
    """
    if not settings.EMAIL_ENABLED:
        return
        
    print("⏰ Running background job: Checking for assessments closing within 72 hrs...")
    now = datetime.now(timezone.utc)
    seventy_two_hours_from_now = now + timedelta(hours=72)
    
    # Find assessments that close between now and 72 hours from now
    query = {
        "deadline": {
            "$gt": now,
            "$lte": seventy_two_hours_from_now
        },
        # Optionally, we could add a field to ensure we only send the reminder ONCE
        # "reminder_sent": {"$ne": True}  
    }
    
    closing_assessments = await assessments_collection.find(query).to_list(length=None)
    
    for assessment in closing_assessments:
        # Check if we already sent a reminder for this assessment
        if assessment.get("reminder_sent"):
            continue
            
        program_id = assessment.get("programId")
        if not program_id:
            continue
            
        students = await students_collection.find({"programId": program_id}).to_list(length=None)
        
        end_str = assessment["deadline"].strftime("%B %d, %Y at %I:%M %p")
        portal_url = f"{settings.FRONTEND_URL.split(',')[0]}/student/assessment/{assessment['_id']}"
        
        for student in students:
            # Note: In a production app you'd also want to verify if the student has already submitted.
            # We'll skip that complex query for now to guarantee the reminder is reliably sent.
            await email_service.send_email(
                recipient=student["email"],
                template_name="assessment_reminder.html",
                context={
                    "student_name": student.get("name", "Student"),
                    "assessment_title": assessment.get("title", "Assessment"),
                    "end_time": end_str,
                    "portal_url": portal_url
                },
                subject=f"Reminder: {assessment.get('title')} closing within 3 days"
            )
            
        # Mark as reminder sent
        await assessments_collection.update_one(
            {"_id": assessment["_id"]},
            {"$set": {"reminder_sent": True}}
        )
        print(f"✅ Reminders queued for assessment: {assessment.get('title')}")

async def send_opening_notifications():
    """
    Background job that checks for any assessment opening within the next 72 hours.
    Sends an 'assessment opening' notification to students enrolled in the corresponding program.
    Because there is an email daily quota, we queue these 3 days in advance.
    """
    if not settings.EMAIL_ENABLED:
        return
        
    print("⏰ Running background job: Checking for assessments opening within 72 hrs...")
    now = datetime.now(timezone.utc)
    seventy_two_hours_from_now = now + timedelta(hours=72)
    
    # Find assessments that started or start before 72 hours from now
    query = {
        "startAt": {
            "$lte": seventy_two_hours_from_now
        },
        "opened_email_sent": {"$ne": True}
    }
    
    opening_assessments = await assessments_collection.find(query).to_list(length=None)
    
    for assessment in opening_assessments:
        program_id = assessment.get("programId")
        if not program_id:
            continue
            
        students = await students_collection.find({"programId": program_id}).to_list(length=None)
        
        end_str = assessment["deadline"].strftime("%B %d, %Y at %I:%M %p")
        portal_url = f"{settings.FRONTEND_URL.split(',')[0]}/student/assessment/{assessment['_id']}"
        
        for student in students:
            # Note: email service automatically handles queuing if daily limit is reached
            await email_service.send_email(
                recipient=student["email"],
                template_name="assessment_opens.html",
                context={
                    "student_name": student.get("name", "Student"),
                    "assessment_title": assessment.get("title", "Assessment"),
                    "end_time": end_str,
                    "portal_url": portal_url
                },
                subject=f"Get Ready: {assessment.get('title')} opens within 3 days"
            )
            
        # Mark as opened email sent
        await assessments_collection.update_one(
            {"_id": assessment["_id"]},
            {"$set": {"opened_email_sent": True}}
        )
        print(f"✅ Opening notifications queued for assessment: {assessment.get('title')}")
