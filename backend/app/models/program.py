from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProgramCreate(BaseModel):
    name: str
    years: List[str]
    specializations: List[str]


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    years: Optional[List[str]] = None
    specializations: Optional[List[str]] = None


class ProgramResponse(BaseModel):
    id: str
    name: str
    years: List[str]
    specializations: List[str]
    createdBy: str
    createdAt: datetime
