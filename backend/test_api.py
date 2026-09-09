import requests

BASE_URL = "http://127.0.0.1:8000"

# Step 1: Login and get token
login_response = requests.post(f"{BASE_URL}/login", json={
    "email": "jyotiradithyareddykolan@gmail.com",
    "password": "testpassword123"
})

print("Login status:", login_response.status_code)
print("Login response:", login_response.json())

token = login_response.json().get("access_token")

if not token:
    print("Login failed — stopping here.")
    exit()

headers = {"Authorization": f"Bearer {token}"}

# Step 2: Create a medicine
medicine_response = requests.post(f"{BASE_URL}/medicines", json={
    "name": "Paracetamol",
    "dosage": "500mg",
    "frequency": "twice a day",
    "times_per_day": 2,
    "start_date": "2026-09-09T00:00:00",
    "end_date": None
}, headers=headers)

print("\nCreate medicine status:", medicine_response.status_code)
print("Create medicine response:", medicine_response.json())

# Step 3: Get all medicines
get_medicines_response = requests.get(f"{BASE_URL}/medicines", headers=headers)

print("\nGet medicines status:", get_medicines_response.status_code)
print("Get medicines response:", get_medicines_response.json())

# Step 4: Create a vital
vital_response = requests.post(f"{BASE_URL}/vitals", json={
    "type": "weight",
    "value": 70.5,
    "unit": "kg"
}, headers=headers)

print("\nCreate vital status:", vital_response.status_code)
print("Create vital response:", vital_response.json())

# Step 5: Create an appointment
appt_response = requests.post(f"{BASE_URL}/appointments", json={
    "doctor_name": "Dr. Smith",
    "date_time": "2026-09-20T10:00:00",
    "notes": "Routine checkup"
}, headers=headers)

print("\nCreate appointment status:", appt_response.status_code)
print("Create appointment response:", appt_response.json())