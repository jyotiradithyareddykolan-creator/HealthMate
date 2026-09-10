import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import "../Dashboard.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function Dashboard() {
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);

  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medTimesPerDay, setMedTimesPerDay] = useState(1);
  const [medDoseTimes, setMedDoseTimes] = useState("");

  const [vitalType, setVitalType] = useState("weight");
  const [vitalValue, setVitalValue] = useState("");
  const [vitalUnit, setVitalUnit] = useState("kg");

  const [apptDoctor, setApptDoctor] = useState("");
  const [apptDateTime, setApptDateTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");

  const [visitDoctor, setVisitDoctor] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitDiagnosis, setVisitDiagnosis] = useState("");
  const [visitPrescription, setVisitPrescription] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  const fetchAll = async () => {
    try {
      const [medRes, vitalRes, apptRes, visitRes] = await Promise.all([
        api.get("/medicines"),
        api.get("/vitals"),
        api.get("/appointments"),
        api.get("/visits"),
      ]);
      setMedicines(medRes.data);
      setVitals(vitalRes.data);
      setAppointments(apptRes.data);
      setVisits(visitRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    await api.post("/medicines", {
      name: medName, dosage: medDosage, frequency: medFrequency,
      times_per_day: Number(medTimesPerDay), dose_times: medDoseTimes,
      start_date: new Date().toISOString(), end_date: null,
    });
    setMedName(""); setMedDosage(""); setMedFrequency(""); setMedTimesPerDay(1); setMedDoseTimes("");
    fetchAll();
  };
  const handleDeleteMedicine = async (id) => { await api.delete(`/medicines/${id}`); fetchAll(); };

  const handleAddVital = async (e) => {
    e.preventDefault();
    await api.post("/vitals", { type: vitalType, value: Number(vitalValue), unit: vitalUnit });
    setVitalValue("");
    fetchAll();
  };
  const handleDeleteVital = async (id) => { await api.delete(`/vitals/${id}`); fetchAll(); };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    await api.post("/appointments", { doctor_name: apptDoctor, date_time: apptDateTime, notes: apptNotes });
    setApptDoctor(""); setApptDateTime(""); setApptNotes("");
    fetchAll();
  };
  const handleDeleteAppointment = async (id) => { await api.delete(`/appointments/${id}`); fetchAll(); };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    await api.post("/visits", {
      doctor_name: visitDoctor, visit_date: visitDate,
      diagnosis: visitDiagnosis, prescription: visitPrescription, notes: visitNotes,
    });
    setVisitDoctor(""); setVisitDate(""); setVisitDiagnosis(""); setVisitPrescription(""); setVisitNotes("");
    fetchAll();
  };
  const handleDeleteVisit = async (id) => { await api.delete(`/visits/${id}`); fetchAll(); };

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

  const getChartData = (type) => {
    return vitals
      .filter((v) => v.type === type)
      .map((v) => ({
        date: new Date(v.recorded_at).toLocaleDateString(),
        value: v.value,
      }));
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>HealthMate</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/profile" className="logout-btn">Profile</Link>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      {/* Medicines */}
      <div className="section-card">
        <h2>Medicines</h2>
        <form onSubmit={handleAddMedicine} className="form-row">
          <input placeholder="Name" value={medName} onChange={(e) => setMedName(e.target.value)} required />
          <input placeholder="Dosage" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} required />
          <input placeholder="Frequency" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} required />
          <input type="number" min="1" placeholder="Times/day" value={medTimesPerDay} onChange={(e) => setMedTimesPerDay(e.target.value)} style={{ maxWidth: 90 }} />
          <input placeholder="Dose times (e.g. 14:30,21:00)" value={medDoseTimes} onChange={(e) => setMedDoseTimes(e.target.value)} style={{ minWidth: 180 }} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {medicines.length === 0 ? <p className="empty-state">No medicines added yet.</p> : (
          <ul className="item-list">
            {medicines.map((m) => (
              <li key={m.id} className="item-row">
                <span>
                  <span className="item-name">{m.name}</span>{" "}
                  <span className="item-meta">
                    — {m.dosage}, {m.frequency} ({m.times_per_day}x/day)
                    {m.dose_times && ` | Doses: ${m.dose_times}`}
                  </span>
                </span>
                <button className="delete-btn" onClick={() => handleDeleteMedicine(m.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vitals */}
      <div className="section-card">
        <h2>Vitals</h2>
        <form onSubmit={handleAddVital} className="form-row">
          <select value={vitalType} onChange={(e) => setVitalType(e.target.value)}>
            <option value="weight">Weight</option>
            <option value="blood_pressure">Blood Pressure</option>
            <option value="sugar">Blood Sugar</option>
          </select>
          <input type="number" step="any" placeholder="Value" value={vitalValue} onChange={(e) => setVitalValue(e.target.value)} required />
          <input placeholder="Unit" value={vitalUnit} onChange={(e) => setVitalUnit(e.target.value)} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {vitals.length === 0 ? <p className="empty-state">No vitals logged yet.</p> : (
          <ul className="item-list">
            {vitals.map((v) => (
              <li key={v.id} className="item-row">
                <span className="item-meta">{v.type}: <span className="item-name">{v.value} {v.unit}</span> — {new Date(v.recorded_at).toLocaleString()}</span>
                <button className="delete-btn" onClick={() => handleDeleteVital(v.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Weight Trend */}
      <div className="section-card">
        <h2>Weight Trend</h2>
        {getChartData("weight").length === 0 ? (
          <p className="empty-state">Add weight entries to see trends here.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={getChartData("weight")}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Weight (kg)" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Blood Pressure Trend */}
      <div className="section-card">
        <h2>Blood Pressure Trend</h2>
        {getChartData("blood_pressure").length === 0 ? (
          <p className="empty-state">Add blood pressure entries to see trends here.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={getChartData("blood_pressure")}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Blood Pressure (mmHg)" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Blood Sugar Trend */}
      <div className="section-card">
        <h2>Blood Sugar Trend</h2>
        {getChartData("sugar").length === 0 ? (
          <p className="empty-state">Add blood sugar entries to see trends here.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={getChartData("sugar")}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Blood Sugar" stroke="#059669" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Appointments */}
      <div className="section-card">
        <h2>Upcoming Appointments</h2>
        <form onSubmit={handleAddAppointment} className="form-row">
          <input placeholder="Doctor name" value={apptDoctor} onChange={(e) => setApptDoctor(e.target.value)} required />
          <input type="datetime-local" value={apptDateTime} onChange={(e) => setApptDateTime(e.target.value)} required />
          <input placeholder="Notes (optional)" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {appointments.length === 0 ? <p className="empty-state">No appointments scheduled.</p> : (
          <ul className="item-list">
            {appointments.map((a) => (
              <li key={a.id} className="item-row">
                <span className="item-meta"><span className="item-name">Dr. {a.doctor_name}</span> — {new Date(a.date_time).toLocaleString()} {a.notes && `— ${a.notes}`}</span>
                <button className="delete-btn" onClick={() => handleDeleteAppointment(a.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Doctor Visit History */}
      <div className="section-card">
        <h2>Doctor Visit History</h2>
        <form onSubmit={handleAddVisit} className="form-row">
          <input placeholder="Doctor name" value={visitDoctor} onChange={(e) => setVisitDoctor(e.target.value)} required />
          <input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
          <input placeholder="Diagnosis" value={visitDiagnosis} onChange={(e) => setVisitDiagnosis(e.target.value)} />
          <input placeholder="Prescription" value={visitPrescription} onChange={(e) => setVisitPrescription(e.target.value)} />
          <input placeholder="Notes" value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {visits.length === 0 ? <p className="empty-state">No visit records yet.</p> : (
          <ul className="item-list">
            {visits.map((v) => (
              <li key={v.id} className="item-row">
                <span className="item-meta">
                  <span className="item-name">Dr. {v.doctor_name}</span> — {new Date(v.visit_date).toLocaleString()}
                  {v.diagnosis && ` | Diagnosis: ${v.diagnosis}`}
                  {v.prescription && ` | Rx: ${v.prescription}`}
                </span>
                <button className="delete-btn" onClick={() => handleDeleteVisit(v.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;