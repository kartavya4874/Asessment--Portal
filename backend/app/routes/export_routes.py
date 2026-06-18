from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.database import (
    programs_collection,
    assessments_collection,
    submissions_collection,
    students_collection,
    domains_collection,
)
from app.auth import require_admin, get_scoped_program_ids
from app.utils.excel_export import generate_assessment_excel, generate_combined_excel

router = APIRouter(prefix="/export", tags=["Excel Export"])


async def _get_students_with_submissions(assessment_id: str, student_query: dict) -> list:
    """Fetch students matching query with their submissions for the given assessment."""
    # Batch-fetch all submissions for this assessment first
    submissions_map = {}
    async for sub in submissions_collection.find({"assessmentId": assessment_id}):
        submissions_map[sub["studentId"]] = sub

    students_data = []
    async for student in students_collection.find(student_query):
        student_id_str = str(student["_id"])
        submission = submissions_map.get(student_id_str, {})
        
        students_data.append(
            {
                "rollNumber": student.get("rollNumber", ""),
                "name": student.get("name", ""),
                "email": student.get("email", ""),
                "specialization": student.get("specialization", ""),
                "year": student.get("year", ""),
                "submission": submission,
            }
        )
    return students_data


@router.get("/assessment/{assessment_id}")
async def export_assessment_by_domain(
    assessment_id: str,
    admin: dict = Depends(require_admin),
):
    """Export assessment data — uses domainId for student scoping if available, falls back to programId."""
    assessment = await assessments_collection.find_one(
        {"_id": ObjectId(assessment_id)}
    )

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    domain_id = assessment.get("domainId")
    program_id = assessment.get("programId", "")

    # Determine the label and student query
    if domain_id:
        domain = await domains_collection.find_one({"_id": ObjectId(domain_id)})
        scope_name = domain["name"] if domain else "Unknown Course"
        student_query = {"enrolledSubjects": domain_id}
    elif program_id:
        program = await programs_collection.find_one({"_id": ObjectId(program_id)})
        scope_name = program["name"] if program else "Unknown Program"
        student_query = {"programId": program_id}
    else:
        scope_name = "All"
        student_query = {}

    students_data = await _get_students_with_submissions(assessment_id, student_query)

    excel_buffer = generate_assessment_excel(
        assessment_title=assessment["title"],
        program_name=scope_name,
        students_data=students_data,
    )

    filename = f"{scope_name}_{assessment['title']}_report.xlsx".replace(" ", "_")
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Keep old route for backward compatibility
@router.get("/program/{program_id}/assessment/{assessment_id}")
async def export_assessment(
    program_id: str,
    assessment_id: str,
    admin: dict = Depends(require_admin),
):
    program = await programs_collection.find_one({"_id": ObjectId(program_id)})
    assessment = await assessments_collection.find_one(
        {"_id": ObjectId(assessment_id)}
    )

    if not program or not assessment:
        raise HTTPException(status_code=404, detail="Program or assessment not found")

    # Ownership check
    scoped_ids = await get_scoped_program_ids(admin)
    if scoped_ids is not None and program_id not in scoped_ids:
        raise HTTPException(status_code=403, detail="You do not have access to this program")

    students_data = await _get_students_with_submissions(assessment_id, {"programId": program_id})

    excel_buffer = generate_assessment_excel(
        assessment_title=assessment["title"],
        program_name=program["name"],
        students_data=students_data,
    )

    filename = f"{program['name']}_{assessment['title']}_report.xlsx".replace(" ", "_")
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/all")
async def export_all(admin: dict = Depends(require_admin)):
    scoped_ids = await get_scoped_program_ids(admin)
    program_query = {}
    if scoped_ids is not None:
        program_query["_id"] = {"$in": [ObjectId(pid) for pid in scoped_ids]}

    programs_data = []

    async for program in programs_collection.find(program_query):
        program_id = str(program["_id"])
        assessments = []

        async for assessment in assessments_collection.find(
            {"programId": program_id}
        ):
            assessment_id = str(assessment["_id"])
            students_data = await _get_students_with_submissions(
                assessment_id, {"programId": program_id}
            )
            assessments.append(
                {
                    "assessmentTitle": assessment["title"],
                    "students": students_data,
                }
            )

        programs_data.append(
            {
                "programName": program["name"],
                "assessments": assessments,
            }
        )

    excel_buffer = generate_combined_excel(programs_data)

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="all_assessments_report.xlsx"'
        },
    )
