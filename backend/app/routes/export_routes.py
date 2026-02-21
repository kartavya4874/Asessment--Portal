from bson import ObjectId
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.database import (
    programs_collection,
    assessments_collection,
    submissions_collection,
    students_collection,
)
from app.auth import require_admin
from app.utils.excel_export import generate_assessment_excel, generate_combined_excel

router = APIRouter(prefix="/export", tags=["Excel Export"])


async def _get_students_with_submissions(program_id: str, assessment_id: str) -> list:
    students_data = []
    async for student in students_collection.find({"programId": program_id}):
        submission = await submissions_collection.find_one(
            {"assessmentId": assessment_id, "studentId": str(student["_id"])}
        )
        students_data.append(
            {
                "rollNumber": student.get("rollNumber", ""),
                "name": student.get("name", ""),
                "email": student.get("email", ""),
                "specialization": student.get("specialization", ""),
                "year": student.get("year", ""),
                "submission": submission if submission else {},
            }
        )
    return students_data


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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Program or assessment not found")

    students_data = await _get_students_with_submissions(program_id, assessment_id)

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
    programs_data = []

    async for program in programs_collection.find():
        program_id = str(program["_id"])
        assessments = []

        async for assessment in assessments_collection.find(
            {"programId": program_id}
        ):
            assessment_id = str(assessment["_id"])
            students_data = await _get_students_with_submissions(
                program_id, assessment_id
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
