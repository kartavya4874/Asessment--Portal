import re
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
from app.database import admins_collection, students_collection, programs_collection, password_resets_collection
from app.auth import hash_password, verify_password, create_access_token
from app.models.admin import AdminLogin, AdminResponse
from app.models.student import StudentRegister, StudentLogin, StudentResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.config import get_settings

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


# ─── Password Reset ───────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """
    Generate a 6-digit OTP and email it via Cloudflare Email Worker.
    Always returns success so we don't leak whether the email exists.
    """
    student = await students_collection.find_one({"email": data.email})

    if student:
        # Delete any previous OTPs for this email
        await password_resets_collection.delete_many({"email": data.email})

        otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

        await password_resets_collection.insert_one({
            "email": data.email,
            "otp": otp,
            "expiresAt": expires_at,
            "createdAt": datetime.now(timezone.utc),
        })

        # Send email via Resend API (direct) or Cloudflare Worker (legacy)
        email_html = (
            '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f1a;color:#e4e6eb;border-radius:16px;">'
            '<h2 style="color:#6c5ce7;margin-bottom:8px;">&#128274; Password Reset</h2>'
            '<p style="color:#a0a0b0;">AI Lab Assessment Portal</p>'
            '<hr style="border:1px solid #2d3748;margin:20px 0;" />'
            "<p>You requested a password reset. Use the OTP below:</p>"
            '<div style="background:#16213e;border:2px solid #6c5ce7;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">'
            f'<span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#6c5ce7;">{otp}</span>'
            "</div>"
            f'<p style="color:#a0a0b0;font-size:13px;">This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>.</p>'
            '<p style="color:#a0a0b0;font-size:13px;">If you did not request this, please ignore this email.</p>'
            "</div>"
        )

        email_sent = False

        # Method 1: Direct Resend API (preferred)
        if settings.RESEND_API_KEY:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    resp = await http_client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "from": "AI Lab Assessment Portal <noreply@kartavyabaluja.in>",
                            "to": [data.email],
                            "subject": "Password Reset - AI Lab Assessment Portal",
                            "html": email_html,
                        },
                    )
                    if resp.status_code in (200, 201):
                        email_sent = True
                        print(f"✅ Reset email sent to {data.email} via Resend")
                    else:
                        print(f"⚠️ Resend API error: {resp.status_code} {resp.text}")
            except Exception as e:
                print(f"⚠️ Failed to send via Resend: {e}")

        # Method 2: Cloudflare Worker (fallback)
        if not email_sent and settings.CLOUDFLARE_EMAIL_WORKER_URL:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    await http_client.post(
                        settings.CLOUDFLARE_EMAIL_WORKER_URL,
                        json={
                            "to": data.email,
                            "subject": "Password Reset - AI Lab Assessment Portal",
                            "html": email_html,
                        },
                    )
                    email_sent = True
                    print(f"✅ Reset email sent to {data.email} via Worker")
            except Exception as e:
                print(f"⚠️ Failed to send via Worker: {e}")

        if not email_sent:
            print(f"⚠️ No email provider configured. OTP for {data.email}: {otp}")

    # Always return success
    return {"message": "If that email is registered, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Validate OTP and update password."""
    reset_record = await password_resets_collection.find_one({
        "email": data.email,
        "otp": data.otp,
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
        print(f"⚠️ Reset code for {data.email} has expired")
        await password_resets_collection.delete_one({"_id": reset_record["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one.",
        )

    # Update password
    try:
        new_hash = hash_password(data.newPassword)
        result = await students_collection.update_one(
            {"email": data.email},
            {"$set": {"passwordHash": new_hash}},
        )

        if result.modified_count == 0:
            print(f"⚠️ No student record updated for {data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not update password. Please try again.",
            )

        # Clean up used OTP
        await password_resets_collection.delete_many({"email": data.email})
        print(f"✅ Password reset successfully for {data.email}")

        return {"message": "Password has been reset successfully. You can now log in."}
    except Exception as e:
        print(f"❌ Error during password update for {data.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password. Please try again later.",
        )
