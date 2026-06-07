from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Request Models ────────────────────────────────────────

VALID_SLOT_TYPES = [
    "morning_checkin",
    "pre_lunch",
    "post_lunch",
    "end_of_day",
]


class CreateSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slotType: str = Field(default="morning_checkin")
    lateThresholdMinutes: int = Field(default=15, ge=1, le=120)
    sessionDurationMinutes: int = Field(default=120, ge=10, le=480)


class MarkAttendanceRequest(BaseModel):
    sessionId: str
    qrToken: str


# ─── Response Models ───────────────────────────────────────

class SessionResponse(BaseModel):
    id: str
    title: str
    date: datetime
    createdBy: str
    isActive: bool
    sessionStart: datetime
    sessionEnd: Optional[datetime] = None
    lateThresholdMinutes: int
    presentCount: int = 0
    lateCount: int = 0
    totalStudents: int = 0
    createdAt: datetime


class SessionDetailResponse(SessionResponse):
    records: List[dict] = []


class AttendanceRecordResponse(BaseModel):
    id: str
    sessionId: str
    sessionTitle: str
    sessionDate: datetime
    markedAt: datetime
    status: str  # "present" | "late"


class StudentAttendanceStats(BaseModel):
    totalSessions: int
    attendedSessions: int
    lateCount: int
    presentCount: int
    absentCount: int
    attendancePercentage: float
    currentStreak: int
    longestStreak: int


class AdminStudentAttendance(BaseModel):
    studentId: str
    name: str
    rollNumber: str
    email: str
    totalSessions: int
    attendedSessions: int
    presentCount: int
    lateCount: int
    absentCount: int
    attendancePercentage: float


class QRDataResponse(BaseModel):
    sessionId: str
    qrToken: str
    qrUrl: str
    expiresAt: datetime
    presentCount: int
    lateCount: int
    isActive: bool
