from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.database import assessments_collection, programs_collection
from app.auth import require_admin, get_current_user
from app.models.assessment import AssessmentCreate, AssessmentUpdate, AssessmentResponse
from app.firebase_storage import upload_file_to_firebase, generate_unique_filename

router = APIRouter(prefix="/assessments", tags=["Assessments"])


def compute_status(start_at: datetime, deadline: datetime) -> str:
    now = datetime.now(timezone.utc)
    if now < start_at:
        return "Upcoming"
    elif now <= deadline:
        return "Active"
    else:
        return "Closed"


def assessment_doc_to_response(doc: dict) -> dict:
    start_at = doc.get("startAt", datetime.now(timezone.utc))
    deadline = doc.get("deadline", datetime.now(timezone.utc))
    return {
        "id": str(doc["_id"]),
        "programId": doc.get("programId", ""),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "attachedFiles": doc.get("attachedFiles", []),
        "startAt": start_at,
        "deadline": deadline,
        "status": compute_status(start_at, deadline),
        "createdBy": doc.get("createdBy", ""),
        "createdAt": doc.get("createdAt", datetime.now(timezone.utc)),
    }


@router.get("", response_model=list)
async def list_assessments(
    programId: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query = {}
    if programId:
        query["programId"] = programId

    assessments = []
    async for doc in assessments_collection.find(query).sort("createdAt", -1):
        assessments.append(assessment_doc_to_response(doc))
    return assessments


@router.get("/{assessment_id}", response_model=dict)
async def get_assessment(
    assessment_id: str, current_user: dict = Depends(get_current_user)
):
    doc = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment_doc_to_response(doc)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_assessment(data: AssessmentCreate, admin: dict = Depends(require_admin)):
    # Verify program exists
    program = await programs_collection.find_one({"_id": ObjectId(data.programId)})
    if not program:
        raise HTTPException(status_code=400, detail="Invalid program")

    if data.deadline <= data.startAt:
        raise HTTPException(status_code=400, detail="Deadline must be after start time")

    assessment_doc = {
        "programId": data.programId,
        "title": data.title,
        "description": data.description,
        "attachedFiles": [],
        "startAt": data.startAt,
        "deadline": data.deadline,
        "createdBy": admin["id"],
        "createdAt": datetime.now(timezone.utc),
    }
    result = await assessments_collection.insert_one(assessment_doc)
    assessment_doc["_id"] = result.inserted_id
    return assessment_doc_to_response(assessment_doc)


@router.put("/{assessment_id}", response_model=dict)
async def update_assessment(
    assessment_id: str,
    data: AssessmentUpdate,
    admin: dict = Depends(require_admin),
):
    doc = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    await assessments_collection.update_one(
        {"_id": ObjectId(assessment_id)}, {"$set": update_data}
    )
    updated = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    return assessment_doc_to_response(updated)


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assessment(assessment_id: str, admin: dict = Depends(require_admin)):
    result = await assessments_collection.delete_one({"_id": ObjectId(assessment_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")


@router.post("/{assessment_id}/files", response_model=dict)
async def upload_assessment_files(
    assessment_id: str,
    files: List[UploadFile] = File(...),
    admin: dict = Depends(require_admin),
):
    doc = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")

    uploaded_files = []
    for file in files:
        file_bytes = await file.read()
        unique_name = generate_unique_filename(file.filename)
        destination = f"assessments/{assessment_id}/{unique_name}"
        url = await upload_file_to_firebase(
            file_bytes, destination, file.content_type or "application/octet-stream"
        )
        uploaded_files.append({"name": file.filename, "url": url})

    await assessments_collection.update_one(
        {"_id": ObjectId(assessment_id)},
        {"$push": {"attachedFiles": {"$each": uploaded_files}}},
    )

    updated = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    return assessment_doc_to_response(updated)
