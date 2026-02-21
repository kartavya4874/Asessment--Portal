from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from app.database import submissions_collection
from app.auth import require_admin
from app.models.submission import MarksUpdate, BulkMarksUpdate

router = APIRouter(prefix="/marks", tags=["Marks & Feedback"])


@router.put("/{submission_id}", response_model=dict)
async def update_marks(
    submission_id: str,
    data: MarksUpdate,
    admin: dict = Depends(require_admin),
):
    doc = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")

    await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"marks": data.marks, "feedback": data.feedback or ""}},
    )
    return {"message": "Marks updated successfully"}


@router.put("/bulk", response_model=dict)
async def bulk_update_marks(
    data: BulkMarksUpdate,
    admin: dict = Depends(require_admin),
):
    updated_count = 0
    for update in data.updates:
        result = await submissions_collection.update_one(
            {"_id": ObjectId(update["submissionId"])},
            {
                "$set": {
                    "marks": update.get("marks"),
                    "feedback": update.get("feedback", ""),
                }
            },
        )
        if result.modified_count > 0:
            updated_count += 1

    return {"message": f"Updated {updated_count} submissions"}


@router.put("/publish/{assessment_id}", response_model=dict)
async def publish_marks(
    assessment_id: str,
    admin: dict = Depends(require_admin),
):
    result = await submissions_collection.update_many(
        {"assessmentId": assessment_id},
        {"$set": {"marksPublished": True}},
    )
    return {
        "message": f"Published marks for {result.modified_count} submissions"
    }
