from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from app.database import submissions_collection, assessments_collection
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

    # Validate marks against maxMarks
    if data.marks is not None:
        assessment = await assessments_collection.find_one({"_id": ObjectId(doc["assessmentId"])})
        max_marks = assessment.get("maxMarks") if assessment else None
        if max_marks is not None and data.marks > max_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Marks ({data.marks}) cannot exceed max marks ({max_marks})",
            )

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
    errors = []
    for update in data.updates:
        sub_doc = await submissions_collection.find_one({"_id": ObjectId(update["submissionId"])})
        if not sub_doc:
            continue

        marks_val = update.get("marks")
        if marks_val is not None:
            assessment = await assessments_collection.find_one({"_id": ObjectId(sub_doc["assessmentId"])})
            max_marks = assessment.get("maxMarks") if assessment else None
            if max_marks is not None and marks_val > max_marks:
                errors.append(f"Marks ({marks_val}) exceed max ({max_marks})")
                continue

        result = await submissions_collection.update_one(
            {"_id": ObjectId(update["submissionId"])},
            {
                "$set": {
                    "marks": marks_val,
                    "feedback": update.get("feedback", ""),
                }
            },
        )
        if result.modified_count > 0:
            updated_count += 1

    msg = f"Updated {updated_count} submissions"
    if errors:
        msg += f". Skipped {len(errors)} (marks exceeded max)."
    return {"message": msg}


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
