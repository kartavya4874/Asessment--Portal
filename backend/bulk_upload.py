import asyncio
import sys

# Try to import from app
try:
    from app.database import assessments_collection, submissions_collection
except ImportError:
    print("Please run this script from the 'backend' directory.")
    sys.exit(1)

async def auto_bulk_upload():
    print("\n--- Auto Bulk Marks Upload (All Programs) ---")
    title = input("Enter the Assessment Title exactly (e.g., 'Assessment 2'): ").strip()
    
    # 1. Find ALL assessments matching this title exactly (case-insensitive)
    cursor = assessments_collection.find({"title": {"$regex": f"^{title}$", "$options": "i"}})
    assessments = await cursor.to_list(length=None)
    
    if not assessments:
        print(f"\n❌ Could not find any assessment matching exact title: {title}")
        print("Possible partial matches:")
        async for a in assessments_collection.find({"title": {"$regex": title, "$options": "i"}}).limit(5):
            print(f"- {a.get('title')} (Program ID: {a.get('programId')})")
        return

    admin_title = assessments[0].get("title")
    print(f"\n✅ Found {len(assessments)} Assessments named '{admin_title}' across different programs.")

    max_marks_list = [a.get("maxMarks") for a in assessments if a.get("maxMarks") is not None]
    min_max_marks = min(max_marks_list) if max_marks_list else None
    
    if min_max_marks is not None:
        print(f"Max Marks Allowed (least maxMarks across programs): {min_max_marks}")
    else:
        print("No Max Marks defined for these assessments.")

    # 2. Get marks to assign
    while True:
        try:
            marks_input = float(input("\nEnter the marks to assign to ALL submitted students: "))
            if min_max_marks is not None and marks_input > min_max_marks:
                print(f"⚠️ Marks cannot exceed the maximum allowed ({min_max_marks}).")
            else:
                break
        except ValueError:
            print("⚠️ Please enter a valid number.")

    # 3. Get optional feedback
    feedback_input = input("Enter feedback (optional, press Enter to skip): ").strip()
    
    # 4. Check how many submissions exist across ALL matching assessments
    assessment_ids = [str(a["_id"]) for a in assessments]
    submission_count = await submissions_collection.count_documents({"assessmentId": {"$in": assessment_ids}})
    
    if submission_count == 0:
        print(f"\n❌ No submissions found for '{admin_title}' across any program.")
        return

    print(f"\nFound a total of {submission_count} submissions across all matching assessments.")
    confirm = input(f"Are you sure you want to assign {marks_input} marks to all {submission_count} students? (y/n): ").strip().lower()
    
    if confirm != 'y':
        print("Aborted.")
        return

    # 5. Update MongoDB
    update_data = {"marks": marks_input}
    if feedback_input:
        update_data["feedback"] = feedback_input

    result = await submissions_collection.update_many(
        {"assessmentId": {"$in": assessment_ids}},
        {"$set": update_data}
    )

    print(f"\n🎉 Successfully updated marks for {result.modified_count} submissions!")

if __name__ == "__main__":
    asyncio.run(auto_bulk_upload())
