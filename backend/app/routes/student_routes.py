from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.database import students_collection, programs_collection, submissions_collection
from app.auth import require_admin, hash_password
from pydantic import BaseModel, EmailStr
from app.utils.email_service import email_service
from app.config import get_settings
import asyncio

settings = get_settings()

router = APIRouter(prefix="/students", tags=["Student Management"])


class AdminStudentCreate(BaseModel):
    name: str
    rollNumber: str
    email: EmailStr
    programId: str
    specialization: str
    year: str
    password: str


class AdminStudentUpdate(BaseModel):
    name: Optional[str] = None
    rollNumber: Optional[str] = None
    email: Optional[EmailStr] = None
    programId: Optional[str] = None
    specialization: Optional[str] = None
    year: Optional[str] = None


def student_doc_to_response(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "rollNumber": doc.get("rollNumber", ""),
        "email": doc.get("email", ""),
        "programId": doc.get("programId", ""),
        "specialization": doc.get("specialization", ""),
        "year": doc.get("year", ""),
        "createdAt": doc.get("createdAt", datetime.now(timezone.utc)),
    }


@router.get("", response_model=list)
async def list_students(
    programId: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    """List students with optional program filter and search."""
    query = {}
    if programId:
        query["programId"] = programId
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"rollNumber": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    students = []
    async for doc in students_collection.find(query).sort("rollNumber", 1):
        students.append(student_doc_to_response(doc))
    return students


@router.get("/{student_id}", response_model=dict)
async def get_student(student_id: str, admin: dict = Depends(require_admin)):
    doc = await students_collection.find_one({"_id": ObjectId(student_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    return student_doc_to_response(doc)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_student(data: AdminStudentCreate, admin: dict = Depends(require_admin)):
    """Admin creates a student account."""
    # Check for existing email or roll number
    existing_email = await students_collection.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_roll = await students_collection.find_one({"rollNumber": data.rollNumber})
    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already registered")

    # Verify program exists
    program = await programs_collection.find_one({"_id": ObjectId(data.programId)})
    if not program:
        raise HTTPException(status_code=400, detail="Invalid program")

    student_doc = {
        "name": data.name,
        "rollNumber": data.rollNumber,
        "email": data.email,
        "programId": data.programId,
        "specialization": data.specialization,
        "year": data.year,
        "passwordHash": hash_password(data.password),
        "createdAt": datetime.now(timezone.utc),
    }
    result = await students_collection.insert_one(student_doc)
    student_doc["_id"] = result.inserted_id
    
    # 📧 Send Welcome Email (Fire and forget so we don't block the response)
    if settings.EMAIL_ENABLED:
        login_url = f"{settings.PORTAL_URL}/student/login"
        asyncio.create_task(
            email_service.send_email(
                recipient=data.email,
                template_name="welcome.html",
                context={
                    "student_name": data.name,
                    "roll_number": data.rollNumber,
                    "email": data.email,
                    "login_url": login_url
                },
                subject="Welcome to AI Lab Assessment Portal!"
            )
        )
        
    return student_doc_to_response(student_doc)


@router.put("/{student_id}", response_model=dict)
async def update_student(
    student_id: str,
    data: AdminStudentUpdate,
    admin: dict = Depends(require_admin),
):
    """Admin updates student details (roll number, program, specialization, etc.)."""
    doc = await students_collection.find_one({"_id": ObjectId(student_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check uniqueness if changing roll number or email
    if "rollNumber" in update_data and update_data["rollNumber"] != doc.get("rollNumber"):
        existing = await students_collection.find_one({"rollNumber": update_data["rollNumber"]})
        if existing:
            raise HTTPException(status_code=400, detail="Roll number already in use")

    if "email" in update_data and update_data["email"] != doc.get("email"):
        existing = await students_collection.find_one({"email": update_data["email"]})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")

    if "programId" in update_data:
        program = await programs_collection.find_one({"_id": ObjectId(update_data["programId"])})
        if not program:
            raise HTTPException(status_code=400, detail="Invalid program")

    await students_collection.update_one(
        {"_id": ObjectId(student_id)}, {"$set": update_data}
    )
    updated = await students_collection.find_one({"_id": ObjectId(student_id)})
    
    # 📧 Send Profile Update Email
    if settings.EMAIL_ENABLED:
        updated_fields = list(update_data.keys())
        asyncio.create_task(
            email_service.send_email(
                recipient=updated["email"],
                template_name="profile_update.html",
                context={
                    "student_name": updated.get("name", "Student"),
                    "updated_fields": updated_fields
                },
                subject="Notice: Your Profile Data was Updated"
            )
        )

    return student_doc_to_response(updated)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: str, admin: dict = Depends(require_admin)):
    """Remove a student and their submissions."""
    result = await students_collection.delete_one({"_id": ObjectId(student_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    # Also clean up their submissions
    await submissions_collection.delete_many({"studentId": student_id})
