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

class MedicineCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    times_per_day: int
    dose_times: str | None = None
    start_date: datetime
    end_date: datetime | None = None

class MedicineResponse(MedicineCreate):
    id: int
    class Config:
        from_attributes = True

class MedicineLogResponse(BaseModel):
    id: int
    medicine_id: int
    scheduled_time: datetime
    taken_at: datetime | None = None
    status: str
    class Config:
        from_attributes = True

class VitalCreate(BaseModel):
    type: str
    value: float
    unit: str

class VitalResponse(VitalCreate):
    id: int
    recorded_at: datetime
    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    doctor_name: str
    date_time: datetime
    notes: str | None = None

class AppointmentResponse(AppointmentCreate):
    id: int
    reminder_sent: bool
    class Config:
        from_attributes = True