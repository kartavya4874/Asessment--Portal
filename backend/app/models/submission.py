from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class SubmittedFile(BaseModel):
    name: str
    url: str


class SubmissionCreate(BaseModel):
    assessmentId: str
    urls: Optional[List[str]] = []
    textAnswer: Optional[str] = ""


class SubmissionResponse(BaseModel):
    id: str
    assessmentId: str
    studentId: str
    files: List[SubmittedFile]
    urls: List[str]
    textAnswer: str
    submittedAt: datetime
    marks: Optional[float] = None
    feedback: Optional[str] = None
    marksPublished: bool = False


class MarksUpdate(BaseModel):
    marks: float
    feedback: Optional[str] = ""


class BulkMarksUpdate(BaseModel):
    assessmentId: str
    updates: List[dict]  # [{submissionId, marks, feedback}]
