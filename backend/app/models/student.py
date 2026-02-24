from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


class StudentRegister(BaseModel):
    name: str
    rollNumber: str
    email: EmailStr
    programId: str
    specialization: str
    year: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v):
        # DEV_MODE check is done at the route level
        return v


class StudentLogin(BaseModel):
    email: EmailStr
    password: str


class StudentResponse(BaseModel):
    id: str
    name: str
    rollNumber: str
    email: str
    programId: str
    specialization: str
    year: str
    createdAt: datetime


class StudentInDB(BaseModel):
    name: str
    rollNumber: str
    email: str
    programId: str
    specialization: str
    year: str
    passwordHash: str
    createdAt: datetime


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str
