import secrets
from datetime import datetime
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models, schemas, auth, email_utils, reminders

from apscheduler.schedulers.background import BackgroundScheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HealthMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()
scheduler.add_job(reminders.generate_todays_medicine_logs, "interval", minutes=5)
scheduler.add_job(reminders.send_dose_reminders, "interval", minutes=2)
scheduler.add_job(reminders.check_appointment_reminders, "interval", minutes=5)
scheduler.start()

# Run once immediately on startup so we don't wait for the first interval
reminders.generate_todays_medicine_logs()


# ---- Auth endpoints ----

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


@app.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        db.commit()
        email_utils.send_reset_email(user.email, token)

    return {"message": "If that email is registered, a password reset link has been sent."}


@app.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == request.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = auth.hash_password(request.new_password)
    user.reset_token = None
    db.commit()

    return {"message": "Password reset successful. You can now log in with your new password."}


# ---- Profile endpoints ----

@app.get("/profile", response_model=schemas.ProfileResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/profile", response_model=schemas.ProfileResponse)
def update_profile(profile: schemas.ProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    for field, value in profile.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ---- Medicine endpoints ----

@app.post("/medicines", response_model=schemas.MedicineResponse)
def create_medicine(medicine: schemas.MedicineCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_medicine = models.Medicine(**medicine.dict(), user_id=current_user.id)
    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)
    reminders.generate_todays_medicine_logs()
    return new_medicine

@app.get("/medicines", response_model=List[schemas.MedicineResponse])
def get_medicines(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Medicine).filter(models.Medicine.user_id == current_user.id).all()

@app.delete("/medicines/{medicine_id}")
def delete_medicine(medicine_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    medicine = db.query(models.Medicine).filter(models.Medicine.id == medicine_id, models.Medicine.user_id == current_user.id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    db.query(models.MedicineLog).filter(models.MedicineLog.medicine_id == medicine_id).delete()

    db.delete(medicine)
    db.commit()
    return {"message": "Medicine deleted"}


# ---- Medicine Log endpoints (per-dose tracking) ----

@app.get("/medicine-logs/today", response_model=List[schemas.MedicineLogResponse])
def get_todays_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    today_end = datetime.combine(datetime.utcnow().date(), datetime.max.time())

    logs = db.query(models.MedicineLog).join(models.Medicine).filter(
        models.Medicine.user_id == current_user.id,
        models.MedicineLog.scheduled_time >= today_start,
        models.MedicineLog.scheduled_time <= today_end,
    ).order_by(models.MedicineLog.scheduled_time).all()
    return logs


@app.post("/medicine-logs/{log_id}/mark-taken")
def mark_taken(log_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    log = db.query(models.MedicineLog).join(models.Medicine).filter(
        models.MedicineLog.id == log_id,
        models.Medicine.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    log.status = "taken"
    log.taken_at = datetime.utcnow()
    db.commit()
    return {"message": "Marked as taken"}


# ---- Vitals endpoints ----

@app.post("/vitals", response_model=schemas.VitalResponse)
def create_vital(vital: schemas.VitalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_vital = models.Vital(**vital.dict(), user_id=current_user.id)
    db.add(new_vital)
    db.commit()
    db.refresh(new_vital)
    return new_vital

@app.get("/vitals", response_model=List[schemas.VitalResponse])
def get_vitals(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Vital).filter(models.Vital.user_id == current_user.id).order_by(models.Vital.recorded_at).all()

@app.delete("/vitals/{vital_id}")
def delete_vital(vital_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    vital = db.query(models.Vital).filter(models.Vital.id == vital_id, models.Vital.user_id == current_user.id).first()
    if not vital:
        raise HTTPException(status_code=404, detail="Vital not found")
    db.delete(vital)
    db.commit()
    return {"message": "Vital deleted"}


# ---- Appointment endpoints ----

@app.post("/appointments", response_model=schemas.AppointmentResponse)
def create_appointment(appt: schemas.AppointmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_appt = models.Appointment(**appt.dict(), user_id=current_user.id)
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@app.get("/appointments", response_model=List[schemas.AppointmentResponse])
def get_appointments(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Appointment).filter(models.Appointment.user_id == current_user.id).all()

@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id, models.Appointment.user_id == current_user.id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"message": "Appointment deleted"}


# ---- Doctor Visit endpoints ----

@app.post("/visits", response_model=schemas.DoctorVisitResponse)
def create_visit(visit: schemas.DoctorVisitCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_visit = models.DoctorVisit(**visit.dict(), user_id=current_user.id)
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)
    return new_visit

@app.get("/visits", response_model=List[schemas.DoctorVisitResponse])
def get_visits(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.DoctorVisit).filter(models.DoctorVisit.user_id == current_user.id).order_by(models.DoctorVisit.visit_date.desc()).all()

@app.delete("/visits/{visit_id}")
def delete_visit(visit_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id, models.DoctorVisit.user_id == current_user.id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    db.delete(visit)
    db.commit()
    return {"message": "Visit deleted"}