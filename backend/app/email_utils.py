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