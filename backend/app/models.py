from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Patient profile fields
    full_name = Column(String(255), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_type = Column(String(10), nullable=True)

    # Emergency contact fields
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)

    medicines = relationship("Medicine", back_populates="owner")
    vitals = relationship("Vital", back_populates="owner")
    appointments = relationship("Appointment", back_populates="owner")
    visits = relationship("DoctorVisit", back_populates="owner")

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(String(100))
    frequency = Column(String(100))
    times_per_day = Column(Integer, default=1)
    start_date = Column(DateTime)
    end_date = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="medicines")
    logs = relationship("MedicineLog", back_populates="medicine")

class MedicineLog(Base):
    __tablename__ = "medicine_logs"
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    taken_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending")

    medicine = relationship("Medicine", back_populates="logs")

class Vital(Base):
    __tablename__ = "vitals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="vitals")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_name = Column(String(255))
    date_time = Column(DateTime, nullable=False)
    notes = Column(String(500), nullable=True)
    reminder_sent = Column(Boolean, default=False)

    owner = relationship("User", back_populates="appointments")

class DoctorVisit(Base):
    __tablename__ = "doctor_visits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_name = Column(String(255), nullable=False)
    visit_date = Column(DateTime, nullable=False)
    diagnosis = Column(String(500), nullable=True)
    prescription = Column(String(500), nullable=True)
    notes = Column(String(500), nullable=True)

    owner = relationship("User", back_populates="visits")