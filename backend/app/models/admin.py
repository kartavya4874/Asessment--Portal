from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AdminRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminResponse(BaseModel):
    id: str
    name: str
    email: str
    createdAt: datetime


class AdminInDB(BaseModel):
    name: str
    email: str
    passwordHash: str
    createdAt: datetime
