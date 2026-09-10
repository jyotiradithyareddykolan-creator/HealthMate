import resend
import os
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL")


def send_verification_email(to_email: str, token: str):
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    resend.Emails.send({
        "from": "HealthMate <onboarding@resend.dev>",
        "to": to_email,
        "subject": "Verify your HealthMate account",
        "text": f"Hi,\n\nPlease verify your HealthMate account by clicking the link below:\n\n{verification_link}\n\nIf you didn't sign up for HealthMate, ignore this email."
    })


def send_reset_email(to_email: str, token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    resend.Emails.send({
        "from": "HealthMate <onboarding@resend.dev>",
        "to": to_email,
        "subject": "Reset your HealthMate password",
        "text": f"Hi,\n\nYou requested a password reset for your HealthMate account. Click the link below to set a new password:\n\n{reset_link}\n\nIf you didn't request this, you can safely ignore this email."
    })


def send_appointment_reminder(to_email: str, doctor_name: str, date_time):
    resend.Emails.send({
        "from": "HealthMate <onboarding@resend.dev>",
        "to": to_email,
        "subject": "Upcoming appointment reminder — HealthMate",
        "text": f"Hi,\n\nThis is a reminder that you have an appointment with Dr. {doctor_name} on {date_time.strftime('%B %d, %Y at %I:%M %p')}.\n\n— HealthMate"
    })


def send_medicine_reminder(to_email: str, medicines):
    med_list = "\n".join([f"- {m.name} ({m.dosage}) — {m.frequency}" for m in medicines])
    resend.Emails.send({
        "from": "HealthMate <onboarding@resend.dev>",
        "to": to_email,
        "subject": "Your daily medicine reminder — HealthMate",
        "text": f"Hi,\n\nHere are your active medicines for today:\n\n{med_list}\n\n— HealthMate"
    })


def send_dose_reminder(to_email: str, medicine_name: str, dosage: str, scheduled_time):
    resend.Emails.send({
        "from": "HealthMate <onboarding@resend.dev>",
        "to": to_email,
        "subject": f"Time to take {medicine_name} — HealthMate",
        "text": f"Hi,\n\nIt's time to take your medicine:\n\n{medicine_name} ({dosage}) — scheduled for {scheduled_time.strftime('%I:%M %p')}\n\n— HealthMate"
    })