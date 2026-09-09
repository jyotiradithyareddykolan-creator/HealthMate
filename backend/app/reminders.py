from datetime import datetime, timedelta, time as dtime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, email_utils

IST = ZoneInfo("Asia/Kolkata")


def now_ist():
    """Current time in IST, as a naive datetime (no tzinfo attached), 
    so it compares cleanly against naive DB datetime columns."""
    return datetime.now(IST).replace(tzinfo=None)


def generate_todays_medicine_logs():
    """Runs periodically — creates a MedicineLog row for each dose time, for today (IST), if not already created."""
    db: Session = SessionLocal()
    try:
        current = now_ist()
        today = current.date()

        active_meds = db.query(models.Medicine).filter(
            models.Medicine.start_date <= current,
        ).filter(
            (models.Medicine.end_date == None) | (models.Medicine.end_date >= current)
        ).all()

        for med in active_meds:
            if not med.dose_times:
                continue
            times_list = [t.strip() for t in med.dose_times.split(",") if t.strip()]
            for t_str in times_list:
                try:
                    hour, minute = map(int, t_str.split(":"))
                except ValueError:
                    continue
                scheduled_dt = datetime.combine(today, dtime(hour, minute))

                existing = db.query(models.MedicineLog).filter(
                    models.MedicineLog.medicine_id == med.id,
                    models.MedicineLog.scheduled_time == scheduled_dt
                ).first()

                if not existing:
                    new_log = models.MedicineLog(
                        medicine_id=med.id,
                        scheduled_time=scheduled_dt,
                        status="pending",
                        reminder_sent=False
                    )
                    db.add(new_log)
        db.commit()
        print(f"Generated today's medicine logs (IST date: {today}).")
    finally:
        db.close()


def send_dose_reminders():
    """Runs every few minutes — checks logs whose scheduled_time (IST) is within the next 10 minutes and sends a reminder."""
    db: Session = SessionLocal()
    try:
        current = now_ist()
        window_end = current + timedelta(minutes=10)

        due_logs = db.query(models.MedicineLog).filter(
            models.MedicineLog.scheduled_time >= current,
            models.MedicineLog.scheduled_time <= window_end,
            models.MedicineLog.status == "pending",
            models.MedicineLog.reminder_sent == False
        ).all()

        for log in due_logs:
            medicine = db.query(models.Medicine).filter(models.Medicine.id == log.medicine_id).first()
            if not medicine:
                continue
            user = db.query(models.User).filter(models.User.id == medicine.user_id).first()
            if user:
                email_utils.send_dose_reminder(user.email, medicine.name, medicine.dosage, log.scheduled_time)
                log.reminder_sent = True
                db.commit()
                print(f"Sent dose reminder to {user.email} for {medicine.name} at {log.scheduled_time}")
    finally:
        db.close()


def check_appointment_reminders():
    db: Session = SessionLocal()
    try:
        current = now_ist()
        window_end = current + timedelta(hours=24)

        upcoming = db.query(models.Appointment).filter(
            models.Appointment.date_time >= current,
            models.Appointment.date_time <= window_end,
            models.Appointment.reminder_sent == False
        ).all()

        for appt in upcoming:
            user = db.query(models.User).filter(models.User.id == appt.user_id).first()
            if user:
                email_utils.send_appointment_reminder(user.email, appt.doctor_name, appt.date_time)
                appt.reminder_sent = True
                db.commit()
                print(f"Sent appointment reminder to {user.email} for Dr. {appt.doctor_name}")
    finally:
        db.close()