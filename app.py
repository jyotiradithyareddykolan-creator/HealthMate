from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, time
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///healthmate.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'healthmate-secret-key-2024'

db = SQLAlchemy(app)

# ─── Models ───────────────────────────────────────────────
class Medication(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    dosage     = db.Column(db.String(50))
    frequency  = db.Column(db.String(50))
    times      = db.Column(db.String(200))   # JSON list of HH:MM strings
    start_date = db.Column(db.Date, default=date.today)
    end_date   = db.Column(db.Date, nullable=True)
    notes      = db.Column(db.Text)
    color      = db.Column(db.String(20), default='#4A90D9')
    active     = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'dosage': self.dosage,
            'frequency': self.frequency, 'times': json.loads(self.times or '[]'),
            'start_date': str(self.start_date), 'end_date': str(self.end_date) if self.end_date else None,
            'notes': self.notes, 'color': self.color, 'active': self.active
        }

class MedicationLog(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    taken_at      = db.Column(db.DateTime, default=datetime.utcnow)
    scheduled_time= db.Column(db.String(10))
    status        = db.Column(db.String(20), default='taken')  # taken | skipped | missed
    notes         = db.Column(db.Text)

    medication = db.relationship('Medication', backref='logs')

    def to_dict(self):
        return {
            'id': self.id, 'medication_id': self.medication_id,
            'medication_name': self.medication.name,
            'taken_at': self.taken_at.strftime('%Y-%m-%d %H:%M'),
            'scheduled_time': self.scheduled_time,
            'status': self.status, 'notes': self.notes
        }

class Appointment(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(150), nullable=False)
    doctor      = db.Column(db.String(100))
    location    = db.Column(db.String(200))
    date        = db.Column(db.Date, nullable=False)
    time        = db.Column(db.String(10))
    notes       = db.Column(db.Text)
    reminder    = db.Column(db.Boolean, default=True)
    completed   = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'doctor': self.doctor,
            'location': self.location, 'date': str(self.date),
            'time': self.time, 'notes': self.notes,
            'reminder': self.reminder, 'completed': self.completed
        }

class HealthRecord(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    record_date   = db.Column(db.Date, default=date.today)
    weight        = db.Column(db.Float, nullable=True)
    systolic      = db.Column(db.Integer, nullable=True)
    diastolic     = db.Column(db.Integer, nullable=True)
    heart_rate    = db.Column(db.Integer, nullable=True)
    blood_sugar   = db.Column(db.Float, nullable=True)
    temperature   = db.Column(db.Float, nullable=True)
    steps         = db.Column(db.Integer, nullable=True)
    sleep_hours   = db.Column(db.Float, nullable=True)
    water_glasses = db.Column(db.Integer, nullable=True)
    mood          = db.Column(db.String(20), nullable=True)
    notes         = db.Column(db.Text)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'record_date': str(self.record_date),
            'weight': self.weight, 'systolic': self.systolic,
            'diastolic': self.diastolic, 'heart_rate': self.heart_rate,
            'blood_sugar': self.blood_sugar, 'temperature': self.temperature,
            'steps': self.steps, 'sleep_hours': self.sleep_hours,
            'water_glasses': self.water_glasses, 'mood': self.mood, 'notes': self.notes
        }

class UserProfile(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(100), default='User')
    age          = db.Column(db.Integer)
    gender       = db.Column(db.String(20))
    blood_type   = db.Column(db.String(5))
    height       = db.Column(db.Float)
    allergies    = db.Column(db.Text)
    conditions   = db.Column(db.Text)
    emergency_contact = db.Column(db.String(100))
    emergency_phone   = db.Column(db.String(20))

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'age': self.age,
            'gender': self.gender, 'blood_type': self.blood_type,
            'height': self.height, 'allergies': self.allergies,
            'conditions': self.conditions,
            'emergency_contact': self.emergency_contact,
            'emergency_phone': self.emergency_phone
        }

# ─── Routes ───────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

# Dashboard stats
@app.route('/api/dashboard')
def dashboard_stats():
    today = date.today()
    meds = Medication.query.filter_by(active=True).all()
    upcoming_appts = Appointment.query.filter(
        Appointment.date >= today, Appointment.completed == False
    ).order_by(Appointment.date).limit(3).all()
    latest_health = HealthRecord.query.order_by(HealthRecord.record_date.desc()).first()
    total_logs = MedicationLog.query.filter_by(status='taken').count()
    missed = MedicationLog.query.filter_by(status='missed').count()
    adherence = round((total_logs / (total_logs + missed) * 100) if (total_logs + missed) > 0 else 100)

    return jsonify({
        'active_medications': len(meds),
        'upcoming_appointments': len(upcoming_appts),
        'appointments': [a.to_dict() for a in upcoming_appts],
        'adherence': adherence,
        'latest_health': latest_health.to_dict() if latest_health else None,
        'today': str(today)
    })

# Medications
@app.route('/api/medications', methods=['GET'])
def get_medications():
    meds = Medication.query.order_by(Medication.created_at.desc()).all()
    return jsonify([m.to_dict() for m in meds])

@app.route('/api/medications', methods=['POST'])
def add_medication():
    data = request.json
    med = Medication(
        name=data['name'], dosage=data.get('dosage',''),
        frequency=data.get('frequency','Daily'),
        times=json.dumps(data.get('times', ['08:00'])),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else date.today(),
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
        notes=data.get('notes',''), color=data.get('color','#4A90D9')
    )
    db.session.add(med)
    db.session.commit()
    return jsonify(med.to_dict()), 201

@app.route('/api/medications/<int:mid>', methods=['PUT'])
def update_medication(mid):
    med = Medication.query.get_or_404(mid)
    data = request.json
    for field in ['name','dosage','frequency','notes','color']:
        if field in data: setattr(med, field, data[field])
    if 'times' in data: med.times = json.dumps(data['times'])
    if 'active' in data: med.active = data['active']
    if 'end_date' in data and data['end_date']:
        med.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    db.session.commit()
    return jsonify(med.to_dict())

@app.route('/api/medications/<int:mid>', methods=['DELETE'])
def delete_medication(mid):
    med = Medication.query.get_or_404(mid)
    db.session.delete(med)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@app.route('/api/medications/log', methods=['POST'])
def log_medication():
    data = request.json
    log = MedicationLog(
        medication_id=data['medication_id'],
        scheduled_time=data.get('scheduled_time',''),
        status=data.get('status','taken'),
        notes=data.get('notes','')
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(log.to_dict()), 201

@app.route('/api/medications/logs')
def get_logs():
    logs = MedicationLog.query.order_by(MedicationLog.taken_at.desc()).limit(50).all()
    return jsonify([l.to_dict() for l in logs])

# Appointments
@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    appts = Appointment.query.order_by(Appointment.date).all()
    return jsonify([a.to_dict() for a in appts])

@app.route('/api/appointments', methods=['POST'])
def add_appointment():
    data = request.json
    appt = Appointment(
        title=data['title'], doctor=data.get('doctor',''),
        location=data.get('location',''),
        date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
        time=data.get('time',''), notes=data.get('notes',''),
        reminder=data.get('reminder', True)
    )
    db.session.add(appt)
    db.session.commit()
    return jsonify(appt.to_dict()), 201

@app.route('/api/appointments/<int:aid>', methods=['PUT'])
def update_appointment(aid):
    appt = Appointment.query.get_or_404(aid)
    data = request.json
    for field in ['title','doctor','location','time','notes','reminder','completed']:
        if field in data: setattr(appt, field, data[field])
    if 'date' in data: appt.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    db.session.commit()
    return jsonify(appt.to_dict())

@app.route('/api/appointments/<int:aid>', methods=['DELETE'])
def delete_appointment(aid):
    appt = Appointment.query.get_or_404(aid)
    db.session.delete(appt)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

# Health Records
@app.route('/api/health', methods=['GET'])
def get_health():
    records = HealthRecord.query.order_by(HealthRecord.record_date.desc()).limit(30).all()
    return jsonify([r.to_dict() for r in records])

@app.route('/api/health', methods=['POST'])
def add_health():
    data = request.json
    rec = HealthRecord(
        record_date=datetime.strptime(data['record_date'], '%Y-%m-%d').date() if data.get('record_date') else date.today(),
        weight=data.get('weight'), systolic=data.get('systolic'),
        diastolic=data.get('diastolic'), heart_rate=data.get('heart_rate'),
        blood_sugar=data.get('blood_sugar'), temperature=data.get('temperature'),
        steps=data.get('steps'), sleep_hours=data.get('sleep_hours'),
        water_glasses=data.get('water_glasses'), mood=data.get('mood'),
        notes=data.get('notes','')
    )
    db.session.add(rec)
    db.session.commit()
    return jsonify(rec.to_dict()), 201

@app.route('/api/health/<int:rid>', methods=['DELETE'])
def delete_health(rid):
    rec = HealthRecord.query.get_or_404(rid)
    db.session.delete(rec)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

# Profile
@app.route('/api/profile', methods=['GET'])
def get_profile():
    profile = UserProfile.query.first()
    if not profile:
        profile = UserProfile(name='User')
        db.session.add(profile)
        db.session.commit()
    return jsonify(profile.to_dict())

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    profile = UserProfile.query.first()
    if not profile:
        profile = UserProfile()
        db.session.add(profile)
    data = request.json
    for field in ['name','age','gender','blood_type','height','allergies','conditions','emergency_contact','emergency_phone']:
        if field in data: setattr(profile, field, data[field])
    db.session.commit()
    return jsonify(profile.to_dict())

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Seed demo data if empty
        if not Medication.query.first():
            demo_meds = [
                Medication(name='Vitamin D3', dosage='1000 IU', frequency='Daily',
                           times=json.dumps(['08:00']), color='#F59E0B', notes='Take with breakfast'),
                Medication(name='Metformin', dosage='500mg', frequency='Twice Daily',
                           times=json.dumps(['08:00','20:00']), color='#EF4444', notes='Take with meals'),
                Medication(name='Omega-3', dosage='1000mg', frequency='Daily',
                           times=json.dumps(['12:00']), color='#10B981', notes='Fish oil supplement'),
            ]
            db.session.add_all(demo_meds)
        if not Appointment.query.first():
            from datetime import timedelta
            db.session.add_all([
                Appointment(title='Annual Checkup', doctor='Dr. Sharma', location='Apollo Hospital',
                            date=date.today() + timedelta(days=7), time='10:30'),
                Appointment(title='Dental Cleaning', doctor='Dr. Patel', location='Smile Dental Clinic',
                            date=date.today() + timedelta(days=14), time='14:00'),
            ])
        if not HealthRecord.query.first():
            from datetime import timedelta
            import random
            for i in range(10):
                db.session.add(HealthRecord(
                    record_date=date.today() - timedelta(days=i),
                    weight=72.5 + random.uniform(-1, 1),
                    systolic=118 + random.randint(-5, 8),
                    diastolic=78 + random.randint(-3, 5),
                    heart_rate=72 + random.randint(-5, 10),
                    steps=7000 + random.randint(-2000, 3000),
                    sleep_hours=7 + random.uniform(-1, 1),
                    water_glasses=random.randint(6, 10),
                    mood=['great','good','okay','good','great'][i % 5]
                ))
        db.session.commit()
    import os
app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
