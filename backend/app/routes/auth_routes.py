import re
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from app.database import admins_collection, students_collection, programs_collection, password_resets_collection
from app.auth import hash_password, verify_password, create_access_token
from app.models.admin import AdminLogin, AdminResponse
from app.models.student import StudentRegister, StudentLogin, StudentResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.config import get_settings
from app.utils.email_service import email_service
import asyncio

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@geetauniversity\.edu\.in$"

OTP_EXPIRY_MINUTES = 15


@router.post("/admin/login", response_model=dict)
async def admin_login(data: AdminLogin):
    try:
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
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        )


# ─── Student Auth ──────────────────────────────────────────
@router.post("/student/register", response_model=dict)
async def student_register(data: StudentRegister):
    # Email domain validation
    email = data.email.lower().strip()
    if not settings.DEV_MODE:
        if not re.match(EMAIL_REGEX, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email must be @geetauniversity.edu.in",
            )

    # Check for existing email or roll number
    existing_email = await students_collection.find_one({"email": email})
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
    try:
        program_id = ObjectId(data.programId)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid program ID format",
        )

    program = await programs_collection.find_one({"_id": program_id})
    if not program:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid program selected",
        )

    student_doc = {
        "name": data.name,
        "rollNumber": data.rollNumber,
        "email": email,
        "programId": data.programId,
        "specialization": data.specialization,
        "year": data.year,
        "passwordHash": hash_password(data.password),
        "createdAt": datetime.now(timezone.utc),
    }
    result = await students_collection.insert_one(student_doc)
    
    # 📧 Send Welcome Email (Fire and forget so we don't block the response)
    if settings.EMAIL_ENABLED:
        login_url = f"{settings.PORTAL_URL}/student/login"
        asyncio.create_task(
            email_service.send_email(
                recipient=email,
                template_name="welcome.html",
                context={
                    "student_name": data.name,
                    "roll_number": data.rollNumber,
                    "email": email,
                    "login_url": login_url
                },
                subject="Welcome to AI Lab Assessment Portal!"
            )
        )

    token = create_access_token({"sub": str(result.inserted_id), "role": "student"})
    return {
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "name": data.name,
            "email": email,
            "rollNumber": data.rollNumber,
            "programId": data.programId,
            "specialization": data.specialization,
            "year": data.year,
            "role": "student",
        },
    }


@router.post("/student/login", response_model=dict)
async def student_login(data: StudentLogin):
    email = data.email.lower().strip()
    student = await students_collection.find_one({"email": email})
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


# ─── Password Reset ───────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """
    Generate a 6-digit OTP and email it instantly via Resend API.
    Always returns success so we don't leak whether the email exists.
    """
    email = data.email.lower().strip()
    student = await students_collection.find_one({"email": email})

    if student:
        # Delete any previous OTPs for this email
        await password_resets_collection.delete_many({"email": email})

        otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

        await password_resets_collection.insert_one({
            "email": email,
            "otp": otp,
            "expiresAt": expires_at,
            "createdAt": datetime.now(timezone.utc),
        })

        # Send OTP email instantly via Resend API (no queue, no daily limit)
        login_url = f"{settings.PORTAL_URL}/student/login"
        await email_service.send_via_resend_template(
            recipient=email,
            template_name="password_reset.html",
            context={
                "otp": otp,
                "expiry_minutes": OTP_EXPIRY_MINUTES,
                "login_url": login_url
            },
            subject="Password Reset - AI Lab Assessment Portal"
        )

    # Always return success
    return {"message": "If that email is registered, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Validate OTP and update password."""
    email = data.email.lower().strip()
    otp = data.otp.strip()
    reset_record = await password_resets_collection.find_one({
        "email": email,
        "otp": otp,
    })

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    # Check expiry
    expires_at = reset_record["expiresAt"]
    # Ensure expires_at is timezone-aware for comparison if it's stored as naive
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if datetime.now(timezone.utc) > expires_at:
        print(f"⚠️ Reset code for {email} has expired")
        await password_resets_collection.delete_one({"_id": reset_record["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one.",
        )

    # Update password
    try:
        new_hash = hash_password(data.newPassword)
        result = await students_collection.update_one(
            {"email": email},
            {"$set": {"passwordHash": new_hash}},
        )

        if result.modified_count == 0:
            print(f"⚠️ No student record updated for {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not update password. Please try again.",
            )

        # Clean up used OTP
        await password_resets_collection.delete_many({"email": email})
        print(f"✅ Password reset successfully for {email}")

        return {"message": "Password has been reset successfully. You can now log in."}
    except Exception as e:
        print(f"❌ Error during password update for {email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password. Please try again later.",
        )
