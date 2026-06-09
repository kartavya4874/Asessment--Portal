from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.database import domains_collection, students_collection, workspace_resources_collection, admins_collection
from app.auth import get_current_user
from app.models.workspace import WorkspaceResourceCreate, WorkspaceResourceResponse
from app.firebase_storage import upload_file_to_firebase, generate_unique_filename, generate_signed_url
import asyncio

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


async def verify_domain_access(domain_id: str, user: dict):
    """Verify that the user has access to the workspace for this domain."""
    domain = await domains_collection.find_one({"_id": ObjectId(domain_id)})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    if user["role"] == "admin":
        if user.get("adminRole") == "super_admin" or user.get("email") == "admin@geetauniversity.edu.in":
            return domain
        # Check if instructor is allocated
        if user["id"] not in domain.get("instructors", []):
            raise HTTPException(status_code=403, detail="You do not have access to this workspace")
    elif user["role"] == "student":
        student_doc = await students_collection.find_one({"_id": ObjectId(user["id"])})
        if not student_doc or domain_id not in student_doc.get("enrolledSubjects", []):
            raise HTTPException(status_code=403, detail="You are not enrolled in this domain")
    else:
        raise HTTPException(status_code=403, detail="Invalid role")
        
    return domain


async def get_user_name(user: dict) -> str:
    if user["role"] == "student":
        doc = await students_collection.find_one({"_id": ObjectId(user["id"])})
        return doc.get("name", "Student") if doc else "Student"
    else:
        doc = await admins_collection.find_one({"_id": ObjectId(user["id"])})
        return doc.get("name", "Instructor") if doc else "Instructor"


@router.get("/{domain_id}/resources", response_model=List[WorkspaceResourceResponse])
async def get_workspace_resources(domain_id: str, current_user: dict = Depends(get_current_user)):
    """List all workspace resources for a specific domain track."""
    await verify_domain_access(domain_id, current_user)
    
    docs = await workspace_resources_collection.find({"domainId": domain_id}).sort("createdAt", -1).to_list(length=None)
    
    # Resolve signed URLs for files
    resources = []
    async def _resolve(doc):
        file_url = doc.get("fileUrl")
        if doc.get("resourceType") == "file" and doc.get("filePath"):
            signed_url = await generate_signed_url(doc["filePath"])
            if signed_url:
                file_url = signed_url
                
        return {
            "id": str(doc["_id"]),
            "domainId": doc.get("domainId"),
            "title": doc.get("title", ""),
            "resourceType": doc.get("resourceType", "text"),
            "content": doc.get("content"),
            "fileUrl": file_url,
            "fileName": doc.get("fileName"),
            "uploadedBy": doc.get("uploadedBy"),
            "uploadedByName": doc.get("uploadedByName", "Unknown User"),
            "uploaderRole": doc.get("uploaderRole", "student"),
            "createdAt": doc.get("createdAt", datetime.now(timezone.utc)),
        }
        
    if docs:
        resources = list(await asyncio.gather(*[_resolve(d) for d in docs]))
        # Sort again because gather might not preserve order
        resources.sort(key=lambda x: x["createdAt"], reverse=True)
        
    return resources


@router.post("/{domain_id}/resources", response_model=WorkspaceResourceResponse)
async def create_text_url_resource(
    domain_id: str, 
    data: WorkspaceResourceCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Add a text note, link/url, or dependency info to the workspace."""
    await verify_domain_access(domain_id, current_user)
    
    user_name = await get_user_name(current_user)
    
    now = datetime.now(timezone.utc)
    doc = {
        "domainId": domain_id,
        "title": data.title.strip(),
        "resourceType": data.resourceType, # "url" or "text"
        "content": data.content,
        "uploadedBy": current_user["id"],
        "uploadedByName": user_name,
        "uploaderRole": current_user["role"],
        "createdAt": now,
    }
    
    res = await workspace_resources_collection.insert_one(doc)
    doc["_id"] = res.inserted_id
    
    return {
        "id": str(doc["_id"]),
        "domainId": doc["domainId"],
        "title": doc["title"],
        "resourceType": doc["resourceType"],
        "content": doc.get("content"),
        "uploadedBy": doc["uploadedBy"],
        "uploadedByName": doc["uploadedByName"],
        "uploaderRole": doc["uploaderRole"],
        "createdAt": doc["createdAt"],
    }


@router.post("/{domain_id}/files", response_model=WorkspaceResourceResponse)
async def upload_workspace_file(
    domain_id: str,
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file to the workspace."""
    await verify_domain_access(domain_id, current_user)
    
    user_name = await get_user_name(current_user)
    
    file_bytes = await file.read()
    unique_name = generate_unique_filename(file.filename)
    destination = f"workspaces/{domain_id}/{unique_name}"
    
    url, path = await upload_file_to_firebase(
        file_bytes, destination, file.content_type or "application/octet-stream"
    )
    
    now = datetime.now(timezone.utc)
    doc = {
        "domainId": domain_id,
        "title": title.strip(),
        "resourceType": "file",
        "fileUrl": url,
        "fileName": file.filename,
        "filePath": path,
        "uploadedBy": current_user["id"],
        "uploadedByName": user_name,
        "uploaderRole": current_user["role"],
        "createdAt": now,
    }
    
    res = await workspace_resources_collection.insert_one(doc)
    doc["_id"] = res.inserted_id
    
    return {
        "id": str(doc["_id"]),
        "domainId": doc["domainId"],
        "title": doc["title"],
        "resourceType": doc["resourceType"],
        "fileUrl": doc["fileUrl"],
        "fileName": doc["fileName"],
        "uploadedBy": doc["uploadedBy"],
        "uploadedByName": doc["uploadedByName"],
        "uploaderRole": doc["uploaderRole"],
        "createdAt": doc["createdAt"],
    }


@router.delete("/{domain_id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_resource(
    domain_id: str, 
    resource_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Delete a workspace resource. Admins can delete any, students can only delete their own."""
    await verify_domain_access(domain_id, current_user)
    
    resource = await workspace_resources_collection.find_one({"_id": ObjectId(resource_id), "domainId": domain_id})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Check permissions
    if current_user["role"] == "student" and resource.get("uploadedBy") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own resources")
        
    # We could optionally delete the file from Firebase Storage here if needed,
    # but currently upload_file_to_firebase logic is primarily additive.
    
    await workspace_resources_collection.delete_one({"_id": ObjectId(resource_id)})
