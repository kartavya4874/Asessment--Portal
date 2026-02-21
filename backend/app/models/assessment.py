from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AttachedFile(BaseModel):
    name: str
    url: str


class AssessmentCreate(BaseModel):
    programId: str
    title: str
    description: str
    startAt: datetime
    deadline: datetime


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    startAt: Optional[datetime] = None
    deadline: Optional[datetime] = None


class AssessmentResponse(BaseModel):
    id: str
    programId: str
    title: str
    description: str
    attachedFiles: List[AttachedFile]
    startAt: datetime
    deadline: datetime
    status: str  # Computed: Upcoming / Active / Closed
    createdBy: str
    createdAt: datetime
