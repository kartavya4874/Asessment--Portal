import httpx
import os
import json
from datetime import datetime, timedelta, timezone

base_url = "http://localhost:8000"

print("Logging in as Admin...")
resp = httpx.post(f"{base_url}/auth/admin/login", data={"username": "kartavya.baluja@geetauniversity.edu.in", "password": "Kartavya.Baluja@123"})
admin_token = resp.json()

print("Fetching programs...")
resp = httpx.get(f"{base_url}/programs", headers={"Authorization": f"Bearer {admin_token['access_token']}"})
programs = resp.json()
if not programs:
    resp = httpx.post(f"{base_url}/programs", json={"name": "Test Program", "description": "test"}, headers={"Authorization": f"Bearer {admin_token['access_token']}"})
    program = resp.json()
else:
    program = programs[0]
program_id = program['id']

print(f"Using program {program_id}")

print("Registering Student...")
student_data = {"name": "Test Stu", "email": "stu@test.com", "password": "password123", "rollNumber": "12345", "programId": program_id, "specialization": "CS", "year": "1st Year"}
resp = httpx.post(f"{base_url}/auth/student/register", json=student_data)
# handle already registered
print("Logging in as Student...")
resp = httpx.post(f"{base_url}/auth/student/login", data={"username": "stu@test.com", "password": "password123"})
if resp.status_code != 200:
    print("Student login failed", resp.text)
    exit(1)
stu_token = resp.json()

print("Creating Assessment...")
now = datetime.now(timezone.utc)
future = now + timedelta(days=7)
assessment_data = {
    "title": "Test Ass",
    "programId": program_id,
    "description": "test desc",
    "startAt": now.isoformat(),
    "deadline": future.isoformat(),
    "maxMarks": 100,
    "isActive": True
}
# Create assessment with form data
form_data = {"data": json.dumps(assessment_data)}
resp = httpx.post(f"{base_url}/assessments", data=form_data, headers={"Authorization": f"Bearer {admin_token['access_token']}"})
if resp.status_code != 201:
    print("Assessment creation failed", resp.text)
    exit(1)
assessment_id = resp.json()['id']
print(f"Assessment created: {assessment_id}")

print("Submitting Assessment...")
submit_data = {
    "assessmentId": assessment_id,
    "urls": "https://example.com",
    "textAnswer": "Here is my answer"
}
resp = httpx.post(f"{base_url}/submissions", data=submit_data, headers={"Authorization": f"Bearer {stu_token['access_token']}"})
print(f"Submit Status: {resp.status_code}")
print(f"Submit payload: {resp.json()}")

print("Fetching submission...")
resp = httpx.get(f"{base_url}/submissions/my", params={"assessmentId": assessment_id}, headers={"Authorization": f"Bearer {stu_token['access_token']}"})
print(f"Get Submission Status: {resp.status_code}")
print(f"Get payload: {resp.json()}")
