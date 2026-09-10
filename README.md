# HealthMate

A full-stack personal health management application — track medications with per-dose reminders, log vitals with trend charts, manage appointments, and keep a history of doctor visits. Built with a complete authentication system including email verification and password recovery.

**Live Demo:** https://healthmate-production-d9b7.up.railway.app
**Backend API Docs:** https://healthmate-production-6fe3.up.railway.app/docs

---

## Features

- **Authentication** — signup with mandatory email verification, JWT-based login, forgot/reset password flow
- **Patient Profile** — personal info (name, age, gender, blood type) and emergency contact details
- **Medicine Tracking** — log medicines with dosage, frequency, and specific dose times (e.g. `09:00,21:00`)
- **Automated Dose Reminders** — background scheduler checks upcoming doses and sends email alerts at the scheduled time
- **Vitals Tracking** — log weight, blood pressure, and blood sugar with interactive trend line charts
- **Appointment Management** — schedule upcoming appointments with automated 24-hour-advance email reminders
- **Doctor Visit History** — record past visits with diagnosis, prescription, and notes
- **Full CRUD everywhere** — add and delete medicines, vitals, appointments, and visit records

---

## Screenshots

### Login
![Login](screenshots/login.png)

### Email Verification
![Email Verification](screenshots/email-verification.png)

### Dashboard — Medicines
![Medicines](screenshots/dashboard-medicines.png)

### Dashboard — Vitals
![Vitals](screenshots/dashboard-vitals.png)

### Vitals Trend Charts
![Vitals Charts](screenshots/dashboard-vital-plots.png)

### Dashboard — Appointments
![Appointments](screenshots/dashboard-appointments.png)

### Dashboard — Doctor Visit History
![Doctor Visit History](screenshots/dashboard-doctor-visit.png)

### Automated Reminder Email
![Reminder Email](screenshots/reminder-email.png)

---

## Tech Stack

**Frontend:** React (Vite), React Router, Axios, Recharts
**Backend:** FastAPI, SQLAlchemy, APScheduler
**Database:** MySQL
**Authentication:** JWT (python-jose), bcrypt password hashing
**Email:** Resend (transactional email API)
**Containerization:** Docker, Docker Compose
**Deployment:** Railway (backend, frontend, and MySQL deployed as separate services)

---

## Architecture