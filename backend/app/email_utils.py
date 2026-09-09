import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL")

def send_verification_email(to_email: str, token: str):
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"

    subject = "Verify your HealthMate account"
    body = f"""Hi,

Please verify your HealthMate account by clicking the link below:

{verification_link}

If you didn't sign up for HealthMate, ignore this email.
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"HealthMate <{EMAIL_ADDRESS}>"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)
        
def send_reset_email(to_email: str, token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    subject = "Reset your HealthMate password"
    body = f"""Hi,

You requested a password reset for your HealthMate account. Click the link below to set a new password:

{reset_link}

If you didn't request this, you can safely ignore this email.
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"HealthMate <{EMAIL_ADDRESS}>"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)
        
def send_appointment_reminder(to_email: str, doctor_name: str, date_time):
    subject = "Upcoming appointment reminder — HealthMate"
    body = f"""Hi,

This is a reminder that you have an appointment with Dr. {doctor_name} on {date_time.strftime('%B %d, %Y at %I:%M %p')}.

— HealthMate
"""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"HealthMate <{EMAIL_ADDRESS}>"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)


def send_medicine_reminder(to_email: str, medicines):
    med_list = "\n".join([f"- {m.name} ({m.dosage}) — {m.frequency}" for m in medicines])

    subject = "Your daily medicine reminder — HealthMate"
    body = f"""Hi,

Here are your active medicines for today:

{med_list}

— HealthMate
"""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"HealthMate <{EMAIL_ADDRESS}>"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)
        
def send_dose_reminder(to_email: str, medicine_name: str, dosage: str, scheduled_time):
    subject = f"Time to take {medicine_name} — HealthMate"
    body = f"""Hi,

It's time to take your medicine:

{medicine_name} ({dosage}) — scheduled for {scheduled_time.strftime('%I:%M %p')}

— HealthMate
"""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"HealthMate <{EMAIL_ADDRESS}>"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)