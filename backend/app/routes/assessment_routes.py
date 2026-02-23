from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.database import assessments_collection, programs_collection
from app.auth import require_admin, get_current_user
from app.models.assessment import AssessmentCreate, AssessmentUpdate, AssessmentResponse
from app.firebase_storage import upload_file_to_firebase, generate_unique_filename, generate_signed_url

router = APIRouter(prefix="/assessments", tags=["Assessments"])


def compute_status(start_at: datetime, deadline: datetime) -> str:
    now = datetime.now(timezone.utc)
    
    # Ensure start_at and deadline are timezone-aware for comparison
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
        
    if now < start_at:
        return "Upcoming"
    elif now <= deadline:
        return "Active"
    else:
        return "Closed"


async def assessment_doc_to_response(doc: dict) -> dict:
    now_utc = datetime.now(timezone.utc)
    start_at = doc.get("startAt", now_utc)
    deadline = doc.get("deadline", now_utc)
    
    # Ensure they are aware
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    attached_files = doc.get("attachedFiles", [])
    # Generate signed URLs for private files
    for f in attached_files:
        if f.get("path"):
            signed_url = await generate_signed_url(f["path"])
            if signed_url:
                f["url"] = signed_url
        
    return {
        "id": str(doc["_id"]),
        "programId": doc.get("programId", ""),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "attachedFiles": attached_files,
        "startAt": start_at,
        "deadline": deadline,
        "status": compute_status(start_at, deadline),
        "isLocked": doc.get("isLocked", False),
        "maxMarks": doc.get("maxMarks"),
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

    print(f"DEBUG: list_assessments query: {query}")
    assessments = []
    async for doc in assessments_collection.find(query).sort("createdAt", -1):
        assessments.append(await assessment_doc_to_response(doc))
    print(f"DEBUG: Found {len(assessments)} assessments")
    return assessments


@router.get("/{assessment_id}", response_model=dict)
async def get_assessment(
    assessment_id: str, current_user: dict = Depends(get_current_user)
):
    doc = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return await assessment_doc_to_response(doc)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_assessment(data: AssessmentCreate, admin: dict = Depends(require_admin)):
    print(f"DEBUG: create_assessment data: {data}")
    # Verify program exists
    program = await programs_collection.find_one({"_id": ObjectId(data.programId)})
    if not program:
        print(f"DEBUG: create_assessment failed - Invalid program: {data.programId}")
        raise HTTPException(status_code=400, detail="Invalid program")

    if data.deadline <= data.startAt:
        print(f"DEBUG: create_assessment failed - Invalid timeline")
        raise HTTPException(status_code=400, detail="Deadline must be after start time")

    assessment_doc = {
        "programId": data.programId,
        "title": data.title,
        "description": data.description,
        "attachedFiles": [],
        "startAt": data.startAt,
        "deadline": data.deadline,
        "maxMarks": data.maxMarks,
        "isLocked": False,
        "createdBy": admin["id"],
        "createdAt": datetime.now(timezone.utc),
    }
    result = await assessments_collection.insert_one(assessment_doc)
    assessment_doc["_id"] = result.inserted_id
    print(f"DEBUG: create_assessment success - ID: {result.inserted_id}")
    return await assessment_doc_to_response(assessment_doc)


@router.put("/{assessment_id}", response_model=dict)
async def update_assessment(
    assessment_id: str,
    data: AssessmentUpdate,
    admin: dict = Depends(require_admin),
):
    doc = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if doc.get("isLocked"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assessment is locked and cannot be edited",
        )

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    await assessments_collection.update_one(
        {"_id": ObjectId(assessment_id)}, {"$set": update_data}
    )
    updated = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    return await assessment_doc_to_response(updated)


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

    if doc.get("isLocked"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assessment is locked and cannot be edited",
        )

    uploaded_files = []
    for file in files:
        file_bytes = await file.read()
        unique_name = generate_unique_filename(file.filename)
        destination = f"assessments/{assessment_id}/{unique_name}"
        url, path = await upload_file_to_firebase(
            file_bytes, destination, file.content_type or "application/octet-stream"
        )
        uploaded_files.append({"name": file.filename, "url": url, "path": path})

    await assessments_collection.update_one(
        {"_id": ObjectId(assessment_id)},
        {"$push": {"attachedFiles": {"$each": uploaded_files}}},
    )

    updated = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    return await assessment_doc_to_response(updated)


@router.post("/{assessment_id}/lock", response_model=dict)
async def lock_assessment(assessment_id: str, admin: dict = Depends(require_admin)):
    result = await assessments_collection.update_one(
        {"_id": ObjectId(assessment_id)}, {"$set": {"isLocked": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    updated = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    return await assessment_doc_to_response(updated)


@router.post("/{assessment_id}/unlock", response_model=dict)
async def unlock_assessment(assessment_id: str, admin: dict = Depends(require_admin)):
    result = await assessments_collection.update_one(
        {"_id": ObjectId(assessment_id)}, {"$set": {"isLocked": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    updated = await assessments_collection.find_one({"_id": ObjectId(assessment_id)})
    return await assessment_doc_to_response(updated)
