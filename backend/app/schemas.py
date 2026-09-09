from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserSignup(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = None
    gender: str | None = None
    blood_type: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None

class ProfileResponse(BaseModel):
    email: str
    full_name: str | None = None
    age: int | None = None
    gender: str | None = None
    blood_type: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    class Config:
        from_attributes = True

class DoctorVisitCreate(BaseModel):
    doctor_name: str
    visit_date: datetime
    diagnosis: str | None = None
    prescription: str | None = None
    notes: str | None = None

class DoctorVisitResponse(DoctorVisitCreate):
    id: int
    class Config:
        from_attributes = True