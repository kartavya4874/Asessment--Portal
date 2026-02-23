from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.database import submissions_collection, assessments_collection, students_collection
from app.auth import require_student, require_admin, get_current_user
from app.models.submission import SubmissionCreate, SubmissionResponse
from app.firebase_storage import upload_file_to_firebase, generate_unique_filename, generate_signed_url

router = APIRouter(prefix="/submissions", tags=["Submissions"])


async def submission_doc_to_response(doc: dict) -> dict:
    files = doc.get("files", [])
    # If path exists, generate signed URL for admin viewing
    for f in files:
        if f.get("path"):
            signed_url = await generate_signed_url(f["path"])
            if signed_url:
                f["url"] = signed_url

    return {
        "id": str(doc["_id"]),
        "assessmentId": doc.get("assessmentId", ""),
        "studentId": doc.get("studentId", ""),
        "files": files,
        "urls": doc.get("urls", []),
        "textAnswer": doc.get("textAnswer", ""),
        "submittedAt": doc.get("submittedAt", datetime.now(timezone.utc)),
        "marks": doc.get("marks"),
        "feedback": doc.get("feedback"),
        "marksPublished": doc.get("marksPublished", False),
    }


@router.get("", response_model=list)
async def list_submissions(
    assessmentId: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    query = {}
    if assessmentId:
        query["assessmentId"] = assessmentId

    submissions = []
    async for doc in submissions_collection.find(query).sort("submittedAt", -1):
        # Enrich with student info
        student = await students_collection.find_one(
            {"_id": ObjectId(doc["studentId"])}
        )
        resp = await submission_doc_to_response(doc)
        if student:
            resp["studentName"] = student.get("name", "")
            resp["studentEmail"] = student.get("email", "")
            resp["rollNumber"] = student.get("rollNumber", "")
            resp["specialization"] = student.get("specialization", "")
            resp["year"] = student.get("year", "")
        submissions.append(resp)
    return submissions


@router.get("/my", response_model=dict)
async def get_my_submission(
    assessmentId: str,
    student: dict = Depends(require_student),
):
    doc = await submissions_collection.find_one(
        {"assessmentId": assessmentId, "studentId": student["id"]}
    )
    if not doc:
        return {"submitted": False}
    resp = await submission_doc_to_response(doc)
    resp["submitted"] = True
    return resp


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_or_update_submission(
    assessmentId: str = Form(...),
    urls: str = Form(""),  # JSON string array or comma-separated
    textAnswer: str = Form(""),
    files: Optional[List[UploadFile]] = File(None),
    student: dict = Depends(require_student),
):
    # Verify assessment exists and is active
    assessment = await assessments_collection.find_one(
        {"_id": ObjectId(assessmentId)}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    now = datetime.now(timezone.utc)
    deadline = assessment["deadline"]
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    is_late = now > deadline

    # Parse URLs
    import json
    try:
        url_list = json.loads(urls) if urls.startswith("[") else [u.strip() for u in urls.split(",") if u.strip()]
    except (json.JSONDecodeError, Exception):
        url_list = [u.strip() for u in urls.split(",") if u.strip()]

    # Upload files
    uploaded_files = []
    if files:
        for file in files:
            if file.filename:
                file_bytes = await file.read()
                unique_name = generate_unique_filename(file.filename)
                destination = f"submissions/{student['id']}/{assessmentId}/{unique_name}"
                url, path = await upload_file_to_firebase(
                    file_bytes,
                    destination,
                    file.content_type or "application/octet-stream",
                )
                uploaded_files.append({"name": file.filename, "url": url, "path": path})

    # Check if submission exists (upsert)
    existing = await submissions_collection.find_one(
        {"assessmentId": assessmentId, "studentId": student["id"]}
    )

    submission_data = {
        "assessmentId": assessmentId,
        "studentId": student["id"],
        "urls": url_list,
        "textAnswer": textAnswer,
        "submittedAt": now,
        "isLate": is_late,
    }

    if existing:
        # Update: append new files to existing, or replace
        if uploaded_files:
            submission_data["files"] = uploaded_files
        else:
            submission_data["files"] = existing.get("files", [])

        await submissions_collection.update_one(
            {"_id": existing["_id"]}, {"$set": submission_data}
        )
        updated = await submissions_collection.find_one({"_id": existing["_id"]})
        return await submission_doc_to_response(updated)
    else:
        submission_data["files"] = uploaded_files
        submission_data["marks"] = None
        submission_data["feedback"] = None
        submission_data["marksPublished"] = False
        result = await submissions_collection.insert_one(submission_data)
        submission_data["_id"] = result.inserted_id
        return await submission_doc_to_response(submission_data)


@router.get("/students/{assessment_id}", response_model=list)
async def get_students_for_assessment(
    assessment_id: str,
    admin: dict = Depends(require_admin),
):
    """Get all students enrolled in the assessment's program with their submission status."""
    assessment = await assessments_collection.find_one(
        {"_id": ObjectId(assessment_id)}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    program_id = assessment["programId"]

    students = []
    async for student in students_collection.find({"programId": program_id}):
        submission = await submissions_collection.find_one(
            {"assessmentId": assessment_id, "studentId": str(student["_id"])}
        )

        student_data = {
            "id": str(student["_id"]),
            "name": student.get("name", ""),
            "email": student.get("email", ""),
            "rollNumber": student.get("rollNumber", ""),
            "specialization": student.get("specialization", ""),
            "year": student.get("year", ""),
        }

        if submission:
            student_data["submissionStatus"] = "Late" if submission.get("isLate") else "Submitted"
            student_data["submission"] = await submission_doc_to_response(submission)
        else:
            student_data["submissionStatus"] = "Not Submitted"
            student_data["submission"] = None

        students.append(student_data)

    return students
