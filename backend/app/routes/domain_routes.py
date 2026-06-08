from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.database import domains_collection, students_collection
from app.auth import require_admin, require_student, require_super_admin, get_current_user

router = APIRouter(prefix="/domains", tags=["Subject/Domain Management"])


class DomainCreate(BaseModel):
    name: str
    description: str
    code: str


class StudentDomainRegister(BaseModel):
    interestLevel: str  # e.g., Beginner, Intermediate, Advanced
    primaryGoal: str    # e.g., Job Placement, Skill Upgradation, Project Work
    additionalNotes: Optional[str] = ""


class AdminStudentEnrollPayload(BaseModel):
    studentId: str
    domainId: str


class AssignInstructorsPayload(BaseModel):
    instructorIds: List[str]


def domain_doc_to_response(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        "code": doc.get("code", ""),
        "instructors": doc.get("instructors", []),  # list of admin user IDs
        "createdAt": doc.get("createdAt", datetime.now(timezone.utc)),
    }


@router.get("", response_model=List[dict])
async def list_domains(user: dict = Depends(get_current_user)):
    """List all domains/subjects available."""
    query = {}
    if user["role"] == "admin":
        from app.database import admins_collection
        admin_doc = await admins_collection.find_one({"_id": ObjectId(user["id"])})
        if admin_doc:
            role_in_db = admin_doc.get("adminRole", "instructor")
            if role_in_db != "super_admin" and admin_doc.get("email") != "admin@geetauniversity.edu.in":
                query["instructors"] = user["id"]

    domains = []
    async for doc in domains_collection.find(query).sort("name", 1):
        domains.append(domain_doc_to_response(doc))
    return domains


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_domain(data: DomainCreate, admin: dict = Depends(require_super_admin)):
    """Super Admin creates a new domain/subject."""
    existing = await domains_collection.find_one({"code": data.code.upper().strip()})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Domain/Subject code already exists"
        )

    doc = {
        "name": data.name.strip(),
        "description": data.description.strip(),
        "code": data.code.upper().strip(),
        "instructors": [],
        "createdBy": admin["id"],
        "createdAt": datetime.now(timezone.utc),
    }
    result = await domains_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return domain_doc_to_response(doc)


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_domain(domain_id: str, admin: dict = Depends(require_super_admin)):
    """Super Admin deletes a domain/subject."""
    result = await domains_collection.delete_one({"_id": ObjectId(domain_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domain/Subject not found")

    # Pull this domain ID from all enrolled students
    await students_collection.update_many(
        {"enrolledSubjects": domain_id},
        {"$pull": {"enrolledSubjects": domain_id}}
    )


@router.post("/register-profile", response_model=dict)
async def register_student_domain_profile(
    data: StudentDomainRegister, student: dict = Depends(require_student)
):
    """Student registers/fills out domain preferences first."""
    update_data = {
        "domainRegistered": True,
        "domainPreferences": {
            "interestLevel": data.interestLevel,
            "primaryGoal": data.primaryGoal,
            "additionalNotes": data.additionalNotes,
            "registeredAt": datetime.now(timezone.utc),
        }
    }
    await students_collection.update_one(
        {"_id": ObjectId(student["id"])},
        {"$set": update_data}
    )
    return {"status": "success", "message": "Domain profile registered successfully"}


@router.post("/{domain_id}/enroll", response_model=dict)
async def enroll_domain(domain_id: str, student: dict = Depends(require_student)):
    """Enroll logged in student to a domain/subject."""
    # Verify student exists and is registered
    student_doc = await students_collection.find_one({"_id": ObjectId(student["id"])})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student_doc.get("domainRegistered", False):
        raise HTTPException(
            status_code=400,
            detail="Please register your domain profile preferences before enrolling"
        )

    # Verify domain exists
    domain = await domains_collection.find_one({"_id": ObjectId(domain_id)})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain/Subject not found")

    # Add to enrolledSubjects if not already present
    await students_collection.update_one(
        {"_id": ObjectId(student["id"])},
        {"$addToSet": {"enrolledSubjects": domain_id}}
    )
    return {"status": "success", "message": f"Enrolled in {domain['name']}"}


@router.post("/{domain_id}/disenroll", response_model=dict)
async def disenroll_domain(domain_id: str, student: dict = Depends(require_student)):
    """Disenroll logged in student from a domain/subject."""
    await students_collection.update_one(
        {"_id": ObjectId(student["id"])},
        {"$pull": {"enrolledSubjects": domain_id}}
    )
    return {"status": "success", "message": "Disenrolled successfully"}


@router.post("/admin/enroll", response_model=dict)
async def admin_enroll_student(
    data: AdminStudentEnrollPayload, admin: dict = Depends(require_super_admin)
):
    """Admin manually enrolls a student in a domain/subject."""
    # Verify student exists
    student_doc = await students_collection.find_one({"_id": ObjectId(data.studentId)})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify domain exists
    domain = await domains_collection.find_one({"_id": ObjectId(data.domainId)})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain/Subject not found")

    # If domain profile isn't registered, initialize it so it doesn't block enrollment
    if not student_doc.get("domainRegistered", False):
        await students_collection.update_one(
            {"_id": ObjectId(data.studentId)},
            {
                "$set": {
                    "domainRegistered": True,
                    "domainPreferences": {
                        "interestLevel": "Beginner",
                        "primaryGoal": "Skill Upgradation",
                        "additionalNotes": "Manually enrolled by Admin",
                        "registeredAt": datetime.now(timezone.utc),
                    }
                }
            }
        )

    await students_collection.update_one(
        {"_id": ObjectId(data.studentId)},
        {"$addToSet": {"enrolledSubjects": data.domainId}}
    )
    return {"status": "success", "message": f"Successfully enrolled student in {domain['name']}"}


@router.post("/admin/disenroll", response_model=dict)
async def admin_disenroll_student(
    data: AdminStudentEnrollPayload, admin: dict = Depends(require_super_admin)
):
    """Admin manually removes a student from a domain/subject."""
    await students_collection.update_one(
        {"_id": ObjectId(data.studentId)},
        {"$pull": {"enrolledSubjects": data.domainId}}
    )
    return {"status": "success", "message": "Student dis-enrolled successfully"}


@router.post("/{domain_id}/assign-instructors", response_model=dict)
async def assign_instructors(
    domain_id: str, data: AssignInstructorsPayload, admin: dict = Depends(require_super_admin)
):
    """Super Admin allocates instructors to a Subject/Domain (can assign multiple instructors)."""
    # Verify domain exists
    domain = await domains_collection.find_one({"_id": ObjectId(domain_id)})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain/Subject not found")

    await domains_collection.update_one(
        {"_id": ObjectId(domain_id)},
        {"$set": {"instructors": data.instructorIds}}
    )
    return {"status": "success", "message": "Instructors allocated successfully"}


@router.get("/my-enrollments", response_model=List[dict])
async def my_enrollments(student: dict = Depends(require_student)):
    """Get all domains student is currently enrolled in."""
    student_doc = await students_collection.find_one({"_id": ObjectId(student["id"])})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    enrolled_ids = student_doc.get("enrolledSubjects", [])
    if not enrolled_ids:
        return []

    # Map string IDs to ObjectIds
    obj_ids = [ObjectId(eid) for eid in enrolled_ids if ObjectId.is_valid(eid)]
    domains = []
    async for doc in domains_collection.find({"_id": {"$in": obj_ids}}):
        domains.append(domain_doc_to_response(doc))
    return domains


@router.get("/admin/students", response_model=List[dict])
async def admin_list_student_enrollments(admin: dict = Depends(require_admin)):
    """Admin endpoint to see students and their subject enrollments."""
    from app.database import admins_collection
    admin_doc = await admins_collection.find_one({"_id": ObjectId(admin["id"])})
    
    is_super = False
    if admin_doc:
        role_in_db = admin_doc.get("adminRole", "instructor")
        if role_in_db == "super_admin" or admin_doc.get("email") == "admin@geetauniversity.edu.in":
            is_super = True

    query = {}
    if not is_super:
        # Find all domains allocated to this instructor
        allocated_domains = []
        async for d in domains_collection.find({"instructors": admin["id"]}):
            allocated_domains.append(str(d["_id"]))
        # Only fetch students enrolled in at least one of these domains
        query = {"enrolledSubjects": {"$in": allocated_domains}}

    students = []
    async for s in students_collection.find(
        query,
        {
            "name": 1,
            "email": 1,
            "rollNumber": 1,
            "programId": 1,
            "specialization": 1,
            "year": 1,
            "domainRegistered": 1,
            "domainPreferences": 1,
            "enrolledSubjects": 1
        }
    ).sort("rollNumber", 1):
        students.append({
            "id": str(s["_id"]),
            "name": s.get("name", ""),
            "email": s.get("email", ""),
            "rollNumber": s.get("rollNumber", ""),
            "programId": s.get("programId", ""),
            "specialization": s.get("specialization", ""),
            "year": s.get("year", ""),
            "domainRegistered": s.get("domainRegistered", False),
            "domainPreferences": s.get("domainPreferences", {}),
            "enrolledSubjects": s.get("enrolledSubjects", [])
        })
    return students
