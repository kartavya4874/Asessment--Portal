from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database import programs_collection
from app.auth import require_admin, get_current_user
from app.models.program import ProgramCreate, ProgramUpdate, ProgramResponse

router = APIRouter(prefix="/programs", tags=["Programs"])


def program_doc_to_response(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "years": doc.get("years", []),
        "specializations": doc.get("specializations", []),
        "createdBy": doc.get("createdBy", ""),
        "createdAt": doc.get("createdAt", datetime.now(timezone.utc)),
    }


@router.get("", response_model=list)
async def list_programs():
    programs = []
    async for doc in programs_collection.find():
        programs.append(program_doc_to_response(doc))
    return programs


@router.get("/{program_id}", response_model=dict)
async def get_program(program_id: str):
    doc = await programs_collection.find_one({"_id": ObjectId(program_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Program not found")
    return program_doc_to_response(doc)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_program(data: ProgramCreate, admin: dict = Depends(require_admin)):
    existing = await programs_collection.find_one({"name": data.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Program with this name already exists",
        )

    program_doc = {
        "name": data.name,
        "years": data.years,
        "specializations": data.specializations,
        "createdBy": admin["id"],
        "createdAt": datetime.now(timezone.utc),
    }
    result = await programs_collection.insert_one(program_doc)
    program_doc["_id"] = result.inserted_id
    return program_doc_to_response(program_doc)


@router.put("/{program_id}", response_model=dict)
async def update_program(
    program_id: str, data: ProgramUpdate, admin: dict = Depends(require_admin)
):
    doc = await programs_collection.find_one({"_id": ObjectId(program_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Program not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    await programs_collection.update_one(
        {"_id": ObjectId(program_id)}, {"$set": update_data}
    )
    updated = await programs_collection.find_one({"_id": ObjectId(program_id)})
    return program_doc_to_response(updated)


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(program_id: str, admin: dict = Depends(require_admin)):
    result = await programs_collection.delete_one({"_id": ObjectId(program_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
