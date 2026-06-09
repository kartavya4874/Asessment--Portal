from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkspaceResourceCreate(BaseModel):
    title: str
    resourceType: str  # "url", "text" (files are handled via multipart form)
    content: Optional[str] = None


class WorkspaceResourceResponse(BaseModel):
    id: str
    domainId: str
    title: str
    resourceType: str
    content: Optional[str] = None
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None
    uploadedBy: str
    uploadedByName: str
    uploaderRole: str
    createdAt: datetime
