import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Request, Depends
from bson import ObjectId
from bson.errors import InvalidId
from app.database import (
    attendance_sessions_collection,
    attendance_records_collection,
    students_collection,
)
from app.auth import require_admin, require_student, get_current_user, get_scoped_program_ids
from app.models.attendance import (
    CreateSessionRequest,
    MarkAttendanceRequest,
    QRDataResponse,
    VALID_SLOT_TYPES,
)
from app.config import get_settings

SLOT_LABELS = {
    "morning_checkin": "🌅 Morning Check-in",
    "pre_lunch": "🕐 Pre-Lunch",
    "post_lunch": "☀️ Post-Lunch",
    "end_of_day": "🌇 End of Day",
}

router = APIRouter(prefix="/attendance", tags=["Attendance"])
settings = get_settings()

# ─── Helpers ───────────────────────────────────────────────

def _generate_qr_token() -> str:
    """Generate a cryptographically secure QR token."""
    return secrets.token_urlsafe(32)


async def _count_records(session_id: str):
    """Count present and late records for a session."""
    pipeline = [
        {"$match": {"sessionId": session_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    counts = {"present": 0, "late": 0}
    async for doc in attendance_records_collection.aggregate(pipeline):
        counts[doc["_id"]] = doc["count"]
    return counts


async def _get_total_students():
    """Get total registered students."""
    return await students_collection.count_documents({})


# ─── Admin: Session Management ────────────────────────────

@router.post("/sessions", response_model=dict)
async def create_session(data: CreateSessionRequest, admin=Depends(require_admin)):
    """Create a new attendance session and generate first QR token."""
    now = datetime.now(timezone.utc)
    qr_token = _generate_qr_token()

    # Validate slot type
    slot_type = data.slotType if data.slotType in VALID_SLOT_TYPES else "morning_checkin"

    session_doc = {
        "title": data.title.strip(),
        "slotType": slot_type,
        "date": now,
        "createdBy": admin["id"],
        "qrToken": qr_token,
        "qrExpiresAt": now + timedelta(seconds=30),
        "sessionStart": now,
        "sessionEnd": now + timedelta(minutes=data.sessionDurationMinutes),
        "scheduledEnd": now + timedelta(minutes=data.sessionDurationMinutes),
        "isActive": True,
        "lateThresholdMinutes": data.lateThresholdMinutes,
        "createdAt": now,
    }

    result = await attendance_sessions_collection.insert_one(session_doc)
    session_id = str(result.inserted_id)

    # Build the QR URL
    frontend_url = settings.PORTAL_URL or settings.FRONTEND_URL.split(",")[0].strip()
    qr_url = f"{frontend_url}/attendance/scan?session={session_id}&token={qr_token}"

    return {
        "id": session_id,
        "title": data.title,
        "qrToken": qr_token,
        "qrUrl": qr_url,
        "isActive": True,
        "sessionStart": now.isoformat(),
        "message": "Session created! Display the QR code for students to scan.",
    }


@router.get("/sessions")
async def list_sessions(admin=Depends(require_admin)):
    """List all attendance sessions (newest first), scoped by instructor."""
    query = {}
    # Instructors only see their own sessions
    if admin.get("adminRole") != "super_admin":
        query["createdBy"] = admin["id"]

    sessions = []
    cursor = attendance_sessions_collection.find(query).sort("date", -1)
    async for s in cursor:
        sid = str(s["_id"])
        counts = await _count_records(sid)
        total_students = await _get_total_students()
        sessions.append({
            "id": sid,
            "title": s["title"],
            "slotType": s.get("slotType", "morning_checkin"),
            "slotLabel": SLOT_LABELS.get(s.get("slotType", "morning_checkin"), "📋 Session"),
            "date": s["date"].isoformat(),
            "isActive": s.get("isActive", False),
            "sessionStart": s["sessionStart"].isoformat(),
            "sessionEnd": s.get("sessionEnd", "").isoformat() if s.get("sessionEnd") else None,
            "lateThresholdMinutes": s.get("lateThresholdMinutes", 15),
            "presentCount": counts["present"],
            "lateCount": counts["late"],
            "totalStudents": total_students,
            "createdAt": s["createdAt"].isoformat(),
        })
    return sessions


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str, admin=Depends(require_admin)):
    """Get session details with all attendance records."""
    try:
        session = await attendance_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get all records for this session
    records = []
    cursor = attendance_records_collection.find({"sessionId": session_id}).sort("markedAt", 1)
    async for r in cursor:
        student = await students_collection.find_one({"_id": ObjectId(r["studentId"])})
        records.append({
            "id": str(r["_id"]),
            "studentId": r["studentId"],
            "studentName": student["name"] if student else "Unknown",
            "rollNumber": student["rollNumber"] if student else "N/A",
            "email": student["email"] if student else "N/A",
            "markedAt": r["markedAt"].isoformat(),
            "status": r["status"],
        })

    counts = await _count_records(session_id)
    total_students = await _get_total_students()

    # Get list of absent students
    attended_ids = [r["studentId"] for r in records]
    absent_students = []
    all_students_cursor = students_collection.find()
    async for st in all_students_cursor:
        sid = str(st["_id"])
        if sid not in attended_ids:
            absent_students.append({
                "studentId": sid,
                "studentName": st["name"],
                "rollNumber": st["rollNumber"],
                "email": st["email"],
                "status": "absent",
            })

    return {
        "id": session_id,
        "title": session["title"],
        "slotType": session.get("slotType", "morning_checkin"),
        "slotLabel": SLOT_LABELS.get(session.get("slotType", "morning_checkin"), "📋 Session"),
        "date": session["date"].isoformat(),
        "isActive": session.get("isActive", False),
        "sessionStart": session["sessionStart"].isoformat(),
        "sessionEnd": session.get("sessionEnd", "").isoformat() if session.get("sessionEnd") else None,
        "lateThresholdMinutes": session.get("lateThresholdMinutes", 15),
        "presentCount": counts["present"],
        "lateCount": counts["late"],
        "absentCount": total_students - counts["present"] - counts["late"],
        "totalStudents": total_students,
        "records": records,
        "absentStudents": absent_students,
    }


@router.post("/sessions/{session_id}/refresh-qr")
async def refresh_qr(session_id: str, admin=Depends(require_admin)):
    """Refresh the QR token for a session."""
    try:
        session = await attendance_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("isActive"):
        raise HTTPException(status_code=400, detail="Session is no longer active")

    now = datetime.now(timezone.utc)
    new_token = _generate_qr_token()

    await attendance_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"qrToken": new_token, "qrExpiresAt": now + timedelta(seconds=30)}},
    )

    frontend_url = settings.PORTAL_URL or settings.FRONTEND_URL.split(",")[0].strip()
    qr_url = f"{frontend_url}/attendance/scan?session={session_id}&token={new_token}"

    counts = await _count_records(session_id)

    return {
        "sessionId": session_id,
        "qrToken": new_token,
        "qrUrl": qr_url,
        "expiresAt": (now + timedelta(seconds=30)).isoformat(),
        "presentCount": counts["present"],
        "lateCount": counts["late"],
        "isActive": True,
    }


@router.put("/sessions/{session_id}/end")
async def end_session(session_id: str, admin=Depends(require_admin)):
    """End an active session."""
    try:
        session = await attendance_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    await attendance_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"isActive": False, "sessionEnd": now, "qrToken": ""}},
    )

    counts = await _count_records(session_id)
    return {
        "message": "Session ended successfully",
        "presentCount": counts["present"],
        "lateCount": counts["late"],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, admin=Depends(require_admin)):
    """Delete a session and all its records."""
    try:
        result = await attendance_sessions_collection.delete_one({"_id": ObjectId(session_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete all attendance records for this session
    await attendance_records_collection.delete_many({"sessionId": session_id})

    return {"message": "Session and all records deleted"}


# ─── Student: Mark Attendance ─────────────────────────────

@router.post("/mark")
async def mark_attendance(data: MarkAttendanceRequest, request: Request, student=Depends(require_student)):
    """Mark attendance by validating the QR token."""
    try:
        session = await attendance_sessions_collection.find_one({"_id": ObjectId(data.sessionId)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if session is active
    if not session.get("isActive"):
        raise HTTPException(status_code=400, detail="This session is no longer active. Attendance window is closed.")

    # Validate QR token
    if session.get("qrToken") != data.qrToken:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired QR code. Please scan the latest QR code displayed on screen."
        )

    # Check if already marked
    existing = await attendance_records_collection.find_one({
        "sessionId": data.sessionId,
        "studentId": student["id"],
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already marked your attendance for this session."
        )

    # Determine if late
    now = datetime.now(timezone.utc)
    session_start = session["sessionStart"]
    if session_start.tzinfo is None:
        session_start = session_start.replace(tzinfo=timezone.utc)

    minutes_diff = (now - session_start).total_seconds() / 60
    is_late = minutes_diff > session.get("lateThresholdMinutes", 15)

    # Get client info for audit
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    record_doc = {
        "sessionId": data.sessionId,
        "studentId": student["id"],
        "markedAt": now,
        "status": "late" if is_late else "present",
        "ipAddress": client_ip,
        "userAgent": user_agent,
    }

    try:
        await attendance_records_collection.insert_one(record_doc)
    except Exception as e:
        # Duplicate key error (race condition)
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Attendance already marked.")
        raise

    # Get student info
    student_doc = await students_collection.find_one({"_id": ObjectId(student["id"])})
    student_name = student_doc["name"] if student_doc else "Student"

    return {
        "message": f"Attendance marked successfully! {'(Late)' if is_late else ''}",
        "status": "late" if is_late else "present",
        "markedAt": now.isoformat(),
        "studentName": student_name,
        "sessionTitle": session["title"],
    }


# ─── Student: View Own Attendance ─────────────────────────

@router.get("/my")
async def get_my_attendance(student=Depends(require_student)):
    """Get all attendance records for the current student."""
    records = []
    cursor = attendance_records_collection.find(
        {"studentId": student["id"]}
    ).sort("markedAt", -1)

    async for r in cursor:
        session = await attendance_sessions_collection.find_one(
            {"_id": ObjectId(r["sessionId"])}
        )
        records.append({
            "id": str(r["_id"]),
            "sessionId": r["sessionId"],
            "sessionTitle": session["title"] if session else "Unknown Session",
            "slotType": session.get("slotType", "morning_checkin") if session else "morning_checkin",
            "slotLabel": SLOT_LABELS.get(session.get("slotType", "morning_checkin"), "📋 Session") if session else "📋 Session",
            "sessionDate": session["date"].isoformat() if session else None,
            "markedAt": r["markedAt"].isoformat(),
            "status": r["status"],
        })

    return records


@router.get("/my/stats")
async def get_my_stats(student=Depends(require_student)):
    """Get attendance statistics for the current student."""
    # Total sessions
    total_sessions = await attendance_sessions_collection.count_documents({})

    # My attended sessions
    my_records = []
    cursor = attendance_records_collection.find(
        {"studentId": student["id"]}
    ).sort("markedAt", 1)
    async for r in cursor:
        my_records.append(r)

    attended = len(my_records)
    present_count = sum(1 for r in my_records if r["status"] == "present")
    late_count = sum(1 for r in my_records if r["status"] == "late")
    absent_count = total_sessions - attended

    # Calculate attendance percentage
    percentage = (attended / total_sessions * 100) if total_sessions > 0 else 0

    # Calculate streaks
    all_sessions = []
    session_cursor = attendance_sessions_collection.find().sort("date", 1)
    async for s in session_cursor:
        all_sessions.append(str(s["_id"]))

    attended_session_ids = {r["sessionId"] for r in my_records}

    current_streak = 0
    longest_streak = 0
    streak = 0

    for sid in all_sessions:
        if sid in attended_session_ids:
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0

    # Current streak = streak from the latest session backwards
    current_streak = 0
    for sid in reversed(all_sessions):
        if sid in attended_session_ids:
            current_streak += 1
        else:
            break

    return {
        "totalSessions": total_sessions,
        "attendedSessions": attended,
        "presentCount": present_count,
        "lateCount": late_count,
        "absentCount": absent_count,
        "attendancePercentage": round(percentage, 1),
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
    }


# ─── Admin: Analytics ─────────────────────────────────────

@router.get("/admin/stats")
async def get_admin_stats(admin=Depends(require_admin)):
    """Get overall attendance statistics for admin dashboard."""
    query = {}
    if admin.get("adminRole") != "super_admin":
        query["createdBy"] = admin["id"]

    total_sessions = await attendance_sessions_collection.count_documents(query)
    total_students = await _get_total_students()
    active_q = {**query, "isActive": True}
    active_sessions = await attendance_sessions_collection.count_documents(active_q)

    # Average attendance across all sessions
    total_attended = await attendance_records_collection.count_documents({})
    avg_attendance = (total_attended / (total_sessions * total_students) * 100) if (total_sessions > 0 and total_students > 0) else 0

    # Today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = await attendance_sessions_collection.count_documents({"date": {"$gte": today_start}})
    today_records = await attendance_records_collection.count_documents({"markedAt": {"$gte": today_start}})

    return {
        "totalSessions": total_sessions,
        "totalStudents": total_students,
        "activeSessions": active_sessions,
        "averageAttendancePercentage": round(avg_attendance, 1),
        "todaySessions": today_sessions,
        "todayAttendance": today_records,
    }


@router.get("/admin/students")
async def get_all_student_attendance(admin=Depends(require_admin)):
    """Get attendance summary for all students."""
    total_sessions = await attendance_sessions_collection.count_documents({})
    students = []

    cursor = students_collection.find().sort("name", 1)
    async for st in cursor:
        sid = str(st["_id"])
        attended = await attendance_records_collection.count_documents({"studentId": sid})
        present = await attendance_records_collection.count_documents({"studentId": sid, "status": "present"})
        late = await attendance_records_collection.count_documents({"studentId": sid, "status": "late"})
        absent = total_sessions - attended
        percentage = (attended / total_sessions * 100) if total_sessions > 0 else 0

        students.append({
            "studentId": sid,
            "name": st["name"],
            "rollNumber": st["rollNumber"],
            "email": st["email"],
            "totalSessions": total_sessions,
            "attendedSessions": attended,
            "presentCount": present,
            "lateCount": late,
            "absentCount": absent,
            "attendancePercentage": round(percentage, 1),
        })

    return students


@router.get("/admin/export")
async def export_attendance(admin=Depends(require_admin)):
    """Export all attendance data as JSON (can be used to generate Excel on frontend)."""
    query = {}
    if admin.get("adminRole") != "super_admin":
        query["createdBy"] = admin["id"]

    sessions = []
    cursor = attendance_sessions_collection.find(query).sort("date", 1)
    async for s in cursor:
        sid = str(s["_id"])
        records = []
        rec_cursor = attendance_records_collection.find({"sessionId": sid})
        async for r in rec_cursor:
            student = await students_collection.find_one({"_id": ObjectId(r["studentId"])})
            records.append({
                "studentName": student["name"] if student else "Unknown",
                "rollNumber": student["rollNumber"] if student else "N/A",
                "status": r["status"],
                "markedAt": r["markedAt"].isoformat(),
            })
        sessions.append({
            "sessionId": sid,
            "title": s["title"],
            "slotType": s.get("slotType", "morning_checkin"),
            "slotLabel": SLOT_LABELS.get(s.get("slotType", "morning_checkin"), "📋 Session"),
            "date": s["date"].isoformat(),
            "records": records,
        })

    return {"sessions": sessions}


# ─── Excel Export Endpoints ───────────────────────────────

from fastapi.responses import StreamingResponse
from app.utils.excel_export import generate_attendance_session_excel, generate_attendance_combined_excel


@router.get("/admin/export/session/{session_id}")
async def export_session_excel(session_id: str, admin=Depends(require_admin)):
    """Export a single attendance session as a formatted Excel file."""
    try:
        session = await attendance_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ownership check for instructors
    if admin.get("adminRole") != "super_admin" and session.get("createdBy") != admin["id"]:
        raise HTTPException(status_code=403, detail="You do not have access to this session")

    # Get all records
    records = []
    async for r in attendance_records_collection.find({"sessionId": session_id}).sort("markedAt", 1):
        student = await students_collection.find_one({"_id": ObjectId(r["studentId"])})
        records.append({
            "studentId": r["studentId"],
            "studentName": student["name"] if student else "Unknown",
            "rollNumber": student["rollNumber"] if student else "N/A",
            "email": student["email"] if student else "N/A",
            "status": r["status"],
            "markedAt": r["markedAt"].isoformat(),
        })

    # Get absent students
    attended_ids = {r["studentId"] for r in records}
    absent_students = []
    async for st in students_collection.find():
        sid = str(st["_id"])
        if sid not in attended_ids:
            absent_students.append({
                "studentId": sid,
                "studentName": st["name"],
                "rollNumber": st["rollNumber"],
                "email": st["email"],
            })

    session_date = session["date"].strftime("%d %b %Y")
    slot_label = SLOT_LABELS.get(session.get("slotType", "morning_checkin"), "Session")

    excel_buffer = generate_attendance_session_excel(
        session_title=session["title"],
        session_date=session_date,
        slot_label=slot_label,
        records=records,
        absent_students=absent_students,
    )

    filename = f"Attendance_{session['title']}_{session_date}.xlsx".replace(" ", "_")
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/export/all")
async def export_all_attendance_excel(admin=Depends(require_admin)):
    """Export all attendance data as a combined Excel workbook with overview matrix."""
    query = {}
    if admin.get("adminRole") != "super_admin":
        query["createdBy"] = admin["id"]

    # Gather all sessions with their records
    sessions_data = []
    cursor = attendance_sessions_collection.find(query).sort("date", 1)
    async for s in cursor:
        sid = str(s["_id"])
        records = []
        async for r in attendance_records_collection.find({"sessionId": sid}).sort("markedAt", 1):
            student = await students_collection.find_one({"_id": ObjectId(r["studentId"])})
            records.append({
                "studentId": r["studentId"],
                "studentName": student["name"] if student else "Unknown",
                "rollNumber": student["rollNumber"] if student else "N/A",
                "email": student["email"] if student else "N/A",
                "status": r["status"],
                "markedAt": r["markedAt"].isoformat(),
            })
        sessions_data.append({
            "sessionId": sid,
            "title": s["title"],
            "slotType": s.get("slotType", "morning_checkin"),
            "date": s["date"].isoformat(),
            "records": records,
        })

    # Gather all students
    all_students = []
    async for st in students_collection.find().sort("rollNumber", 1):
        all_students.append({
            "id": str(st["_id"]),
            "rollNumber": st["rollNumber"],
            "name": st["name"],
            "email": st["email"],
        })

    excel_buffer = generate_attendance_combined_excel(
        sessions_data=sessions_data,
        all_students=all_students,
    )

    from datetime import datetime as _dt
    date_str = _dt.now().strftime("%d_%b_%Y")
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="Attendance_Report_{date_str}.xlsx"'},
    )
