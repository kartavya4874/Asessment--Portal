from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AttachedFile(BaseModel):
    name: str
    url: str
    path: Optional[str] = None


class AssessmentCreate(BaseModel):
    programId: str
    title: str
    description: str
    startAt: datetime
    deadline: datetime
    maxMarks: Optional[int] = None


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    startAt: Optional[datetime] = None
    deadline: Optional[datetime] = None
    maxMarks: Optional[int] = None


class AssessmentResponse(BaseModel):
    id: str
    programId: str
    title: str
    description: str
    attachedFiles: List[AttachedFile]
    startAt: datetime
    deadline: datetime
    status: str  # Computed: Upcoming / Active / Closed
    isLocked: bool = False
    maxMarks: Optional[int] = None
    createdBy: str
    createdAt: datetime
