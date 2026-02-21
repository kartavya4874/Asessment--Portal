from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side


HEADER_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
HEADER_FILL = PatternFill(start_color="4A00E0", end_color="4A00E0", fill_type="solid")
HEADER_ALIGNMENT = Alignment(horizontal="center", vertical="center", wrap_text=True)
CELL_ALIGNMENT = Alignment(vertical="top", wrap_text=True)
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)

COLUMNS = [
    ("Roll No", 15),
    ("Name", 25),
    ("Email", 35),
    ("Specialization", 20),
    ("Year/Sem", 12),
    ("Submission Files", 40),
    ("Text Answer", 40),
    ("URLs Submitted", 40),
    ("Marks", 10),
    ("Feedback", 30),
]


def _style_header(ws):
    for col_idx, (col_name, width) in enumerate(COLUMNS, 1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = HEADER_ALIGNMENT
        cell.border = THIN_BORDER
        ws.column_dimensions[cell.column_letter].width = width


def _add_student_row(ws, row_idx: int, student_data: dict):
    submission = student_data.get("submission") or {}
    files = submission.get("files", [])
    file_urls = "\n".join([f"{f['name']}: {f['url']}" for f in files]) if files else "—"
    urls = "\n".join(submission.get("urls", [])) or "—"

    values = [
        student_data.get("rollNumber", ""),
        student_data.get("name", ""),
        student_data.get("email", ""),
        student_data.get("specialization", ""),
        student_data.get("year", ""),
        file_urls,
        submission.get("textAnswer", "") or "—",
        urls,
        submission.get("marks", "—") if submission.get("marks") is not None else "—",
        submission.get("feedback", "") or "—",
    ]

    for col_idx, value in enumerate(values, 1):
        cell = ws.cell(row=row_idx, column=col_idx, value=value)
        cell.alignment = CELL_ALIGNMENT
        cell.border = THIN_BORDER


def generate_assessment_excel(
    assessment_title: str,
    program_name: str,
    students_data: list,
) -> BytesIO:
    """Generate an Excel file for a single assessment."""
    wb = Workbook()
    ws = wb.active
    ws.title = f"{program_name[:25]} - Assessment"

    # Title row
    ws.merge_cells("A1:J1")
    title_cell = ws.cell(row=1, column=1)
    title_cell.value = f"{assessment_title} — {program_name}"
    title_cell.font = Font(name="Calibri", bold=True, size=14, color="4A00E0")
    title_cell.alignment = Alignment(horizontal="center")

    # Blank row
    ws.append([])

    # Header on row 3
    _style_header_at_row(ws, 3)

    # Data rows
    for idx, student in enumerate(students_data):
        _add_student_row(ws, idx + 4, student)

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def _style_header_at_row(ws, row: int):
    for col_idx, (col_name, width) in enumerate(COLUMNS, 1):
        cell = ws.cell(row=row, column=col_idx, value=col_name)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = HEADER_ALIGNMENT
        cell.border = THIN_BORDER
        ws.column_dimensions[cell.column_letter].width = width


def generate_combined_excel(
    programs_data: list,
) -> BytesIO:
    """Generate a combined Excel workbook with separate sheets per program."""
    wb = Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    for program_info in programs_data:
        program_name = program_info["programName"][:31]  # Excel sheet name limit
        ws = wb.create_sheet(title=program_name)

        _style_header(ws)

        row_idx = 2
        for assessment_group in program_info.get("assessments", []):
            # Assessment title separator
            ws.merge_cells(
                start_row=row_idx,
                start_column=1,
                end_row=row_idx,
                end_column=10,
            )
            title_cell = ws.cell(row=row_idx, column=1)
            title_cell.value = f"📝 {assessment_group['assessmentTitle']}"
            title_cell.font = Font(name="Calibri", bold=True, size=12, color="6C5CE7")
            row_idx += 1

            for student in assessment_group.get("students", []):
                _add_student_row(ws, row_idx, student)
                row_idx += 1

            row_idx += 1  # Blank row between assessments

    if not wb.sheetnames:
        wb.create_sheet(title="No Data")

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output
