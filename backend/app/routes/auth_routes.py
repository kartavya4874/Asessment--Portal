import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.database import admins_collection, students_collection, programs_collection
from app.auth import hash_password, verify_password, create_access_token
from app.models.admin import AdminLogin, AdminResponse
from app.models.student import StudentRegister, StudentLogin, StudentResponse
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@geetauniversity\.edu\.in$"


@router.post("/admin/login", response_model=dict)
async def admin_login(data: AdminLogin):
    admin = await admins_collection.find_one({"email": data.email})
    if not admin or not verify_password(data.password, admin["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": str(admin["_id"]), "role": "admin"})
    return {
        "token": token,
        "user": {
            "id": str(admin["_id"]),
            "name": admin["name"],
            "email": admin["email"],
            "role": "admin",
        },
    }


# ─── Student Auth ──────────────────────────────────────────
@router.post("/student/register", response_model=dict)
async def student_register(data: StudentRegister):
    # Email domain validation
    if not settings.DEV_MODE:
        if not re.match(EMAIL_REGEX, data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email must be @geetauniversity.edu.in",
            )

    # Check for existing email or roll number
    existing_email = await students_collection.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    existing_roll = await students_collection.find_one({"rollNumber": data.rollNumber})
    if existing_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Roll number already registered",
        )

    # Verify program exists
    from bson import ObjectId

    program = await programs_collection.find_one({"_id": ObjectId(data.programId)})
    if not program:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid program selected",
        )

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
    token = create_access_token({"sub": str(result.inserted_id), "role": "student"})
    return {
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "name": data.name,
            "email": data.email,
            "rollNumber": data.rollNumber,
            "programId": data.programId,
            "specialization": data.specialization,
            "year": data.year,
            "role": "student",
        },
    }


@router.post("/student/login", response_model=dict)
async def student_login(data: StudentLogin):
    student = await students_collection.find_one({"email": data.email})
    if not student or not verify_password(data.password, student["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": str(student["_id"]), "role": "student"})
    return {
        "token": token,
        "user": {
            "id": str(student["_id"]),
            "name": student["name"],
            "email": student["email"],
            "rollNumber": student["rollNumber"],
            "programId": student["programId"],
            "specialization": student["specialization"],
            "year": student["year"],
            "role": "student",
        },
    }
