import secrets
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models, schemas, auth, email_utils

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HealthMate API")

@app.post("/signup")
def signup(user: schemas.UserSignup, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = auth.hash_password(user.password)
    token = secrets.token_urlsafe(32)

    new_user = models.User(
        email=user.email,
        password_hash=hashed_pw,
        is_verified=False,
        verification_token=token
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    email_utils.send_verification_email(user.email, token)

    return {"message": "Signup successful. Please check your email to verify your account."}

@app.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.is_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Email verified successfully. You can now log in."}

@app.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not auth.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not db_user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

from datetime import datetime
from typing import List
from pydantic import BaseModel

# ---- Additional schemas ----
class MedicineCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    times_per_day: int
    start_date: datetime
    end_date: datetime | None = None

class MedicineResponse(MedicineCreate):
    id: int
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

# ---- Medicine endpoints ----
@app.post("/medicines", response_model=MedicineResponse)
def create_medicine(medicine: MedicineCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_medicine = models.Medicine(**medicine.dict(), user_id=current_user.id)
    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)
    return new_medicine

@app.get("/medicines", response_model=List[MedicineResponse])
def get_medicines(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Medicine).filter(models.Medicine.user_id == current_user.id).all()

@app.delete("/medicines/{medicine_id}")
def delete_medicine(medicine_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    medicine = db.query(models.Medicine).filter(models.Medicine.id == medicine_id, models.Medicine.user_id == current_user.id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    db.delete(medicine)
    db.commit()
    return {"message": "Medicine deleted"}

# ---- Vitals endpoints ----
@app.post("/vitals", response_model=VitalResponse)
def create_vital(vital: VitalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_vital = models.Vital(**vital.dict(), user_id=current_user.id)
    db.add(new_vital)
    db.commit()
    db.refresh(new_vital)
    return new_vital

@app.get("/vitals", response_model=List[VitalResponse])
def get_vitals(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Vital).filter(models.Vital.user_id == current_user.id).order_by(models.Vital.recorded_at).all()

# ---- Appointment endpoints ----
@app.post("/appointments", response_model=AppointmentResponse)
def create_appointment(appt: AppointmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_appt = models.Appointment(**appt.dict(), user_id=current_user.id)
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@app.get("/appointments", response_model=List[AppointmentResponse])
def get_appointments(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Appointment).filter(models.Appointment.user_id == current_user.id).all()